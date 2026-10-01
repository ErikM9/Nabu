import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Info from '../../src/components/Info';
import { FakeWorker } from '../support/fake-worker';

const OUTPUT = [{ text: 'Hello there.' }, { text: 'General Kenobi.' }];
const TRANSCRIPT = 'Hello there. General Kenobi.';

const renderInfo = () => {
  const worker = new FakeWorker('translate.worker.js');
  const onReset = vi.fn();
  render(<Info output={OUTPUT} onReset={onReset} translateWorkerRef={{ current: worker }} />);
  return { worker, onReset, user: userEvent.setup() };
};

const picker = () => screen.getByRole('combobox', { name: 'Target language' });

/* Some updates land after a promise or a zero-delay timer, so tests wait for them inside act */
const settle = () => act(() => new Promise(resolve => setTimeout(resolve, 0)));

const clickAndSettle = async (user, element) => {
  await user.click(element);
  await settle();
};
const send = (worker, ...messages) => act(() => messages.forEach(message => worker.emit(message)));

const chooseFrench = async user => {
  await user.click(screen.getByRole('button', { name: 'Translation' }));
  await clickAndSettle(user, picker());
  await user.click(screen.getByRole('option', { name: 'French' }));
};

/* Runs a whole translation into French and leaves its result on screen */
const translateToFrench = async (user, worker, text = 'Bonjour. Général Kenobi.') => {
  await chooseFrench(user);
  await user.click(screen.getByRole('button', { name: 'Translate' }));
  send(worker, { status: 'complete', gen: 1, output: [{ translation_text: text }] });
};

const readBlob = blob => new Promise(resolve => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.readAsText(blob);
});

/* Captures the file name and contents of the next download the page starts */
const captureDownload = () => {
  const download = {};
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementationOnce(function () {
    download.name = this.download;
  });
  URL.createObjectURL.mockImplementationOnce(blob => {
    download.blob = blob;
    return 'blob:download';
  });
  return download;
};

describe('Info', () => {
  it('shows the whole transcription as one passage', () => {
    renderInfo();

    expect(screen.getByText(TRANSCRIPT)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Here is your result:' })).toBeInTheDocument();
  });

  it('tells assistive technology which view is showing', async () => {
    const { user } = renderInfo();
    const transcription = screen.getByRole('button', { name: 'Transcription' });
    const translation = screen.getByRole('button', { name: 'Translation' });
    expect(transcription).toHaveAttribute('aria-pressed', 'true');

    await clickAndSettle(user, translation);

    expect(translation).toHaveAttribute('aria-pressed', 'true');
    expect(transcription).toHaveAttribute('aria-pressed', 'false');
  });

  it('starts over from Restart', async () => {
    const { user, onReset } = renderInfo();

    await user.click(screen.getByRole('button', { name: 'Restart' }));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  /* user-event installs a clipboard of its own, so these tests read back from it */
  describe('copying', () => {
    it('copies the transcription and confirms it', async () => {
      const { user } = renderInfo();

      await clickAndSettle(user, screen.getByRole('button', { name: 'Copy' }));

      expect(await navigator.clipboard.readText()).toBe(TRANSCRIPT);
      expect(screen.getByRole('status')).toHaveTextContent('Copied to clipboard.');
      /* Success is announced but never drawn, so the page looks the same after a copy */
      expect(screen.getByRole('status')).toHaveClass('sr-only');
    });

    it('says so on the transcription view when the clipboard refuses', async () => {
      const { user } = renderInfo();
      vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('NotAllowedError'));

      await clickAndSettle(user, screen.getByRole('button', { name: 'Copy' }));

      expect(screen.getByRole('status')).toHaveTextContent('Failed to copy to clipboard.');
      expect(screen.getByRole('status')).not.toHaveClass('sr-only');
    });

    it('copies the translation from the translation view', async () => {
      const { user, worker } = renderInfo();
      await translateToFrench(user, worker);

      await clickAndSettle(user, screen.getByRole('button', { name: 'Copy' }));

      expect(await navigator.clipboard.readText()).toBe('Bonjour. Général Kenobi.');
    });
  });

  describe('downloading', () => {
    const TIMESTAMP = String.raw`\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}`;

    it('saves exactly the text on screen and then releases the URL', async () => {
      const { user } = renderInfo();
      const download = captureDownload();

      await user.click(screen.getByRole('button', { name: 'Download' }));

      expect(await readBlob(download.blob)).toBe(TRANSCRIPT);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:download');
    });

    it('labels a transcription as English, whatever language has been picked', async () => {
      const { user } = renderInfo();
      await chooseFrench(user);
      await user.click(screen.getByRole('button', { name: 'Transcription' }));
      const download = captureDownload();

      await user.click(screen.getByRole('button', { name: 'Download' }));

      expect(download.name).toMatch(new RegExp(`^Nabu_transcription_en_${TIMESTAMP}\\.txt$`));
    });

    it('labels a translation with its language', async () => {
      const { user, worker } = renderInfo();
      await translateToFrench(user, worker);
      const download = captureDownload();

      await user.click(screen.getByRole('button', { name: 'Download' }));

      expect(download.name).toMatch(new RegExp(`^Nabu_translation_fra_${TIMESTAMP}\\.txt$`));
    });

    it('has nothing to save before anything has been translated', async () => {
      const { user } = renderInfo();

      await user.click(screen.getByRole('button', { name: 'Translation' }));

      expect(screen.getByRole('button', { name: 'Download' })).toBeDisabled();
    });
  });

  describe('language picker', () => {
    const openWithKeyboard = async user => {
      await user.click(screen.getByRole('button', { name: 'Translation' }));
      picker().focus();
      await user.keyboard('{Enter}');
      await settle();
    };

    const activeOption = () => document.getElementById(picker().getAttribute('aria-activedescendant'));

    it('opens from the keyboard on the first language', async () => {
      const { user } = renderInfo();

      await openWithKeyboard(user);

      expect(picker()).toHaveAttribute('aria-expanded', 'true');
      expect(activeOption()).toHaveTextContent('Acehnese (Arabic script)');
    });

    it('moves with the arrow keys and chooses with Enter', async () => {
      const { user } = renderInfo();
      await openWithKeyboard(user);

      await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

      expect(picker()).toHaveTextContent('Afrikaans');
      expect(picker()).toHaveAttribute('aria-expanded', 'false');
    });

    it('jumps to a language as its name is typed', async () => {
      const { user } = renderInfo();
      await openWithKeyboard(user);

      await user.keyboard('fre');

      expect(activeOption()).toHaveTextContent('French');
    });

    it('jumps to either end with Home and End', async () => {
      const { user } = renderInfo();
      await openWithKeyboard(user);

      await user.keyboard('{End}');
      expect(activeOption()).toHaveTextContent('Zulu');

      await user.keyboard('{Home}');
      expect(activeOption()).toHaveTextContent('Acehnese (Arabic script)');
    });

    /* The highlight is only drawn while the keyboard is steering, so the list looks as it always has under the mouse */
    it('highlights the option under the keyboard, and none when opened by mouse', async () => {
      const { user } = renderInfo();
      await user.click(screen.getByRole('button', { name: 'Translation' }));

      await clickAndSettle(user, picker());
      expect(document.querySelectorAll('[role="option"].bg-teal-100')).toHaveLength(0);

      picker().focus();
      await user.keyboard('{ArrowDown}');
      await settle();
      expect(activeOption()).toHaveClass('bg-teal-100');
      expect(document.querySelectorAll('[role="option"].bg-teal-100')).toHaveLength(1);
    });

    it('closes on Escape without choosing anything', async () => {
      const { user } = renderInfo();
      await openWithKeyboard(user);

      await user.keyboard('{ArrowDown}{Escape}');

      expect(picker()).toHaveAttribute('aria-expanded', 'false');
      expect(picker()).toHaveTextContent('Select language');
    });

    it('reopens on the language already chosen', async () => {
      const { user } = renderInfo();
      await chooseFrench(user);

      picker().focus();
      await user.keyboard('{ArrowDown}');
      await settle();

      expect(activeOption()).toHaveTextContent('French');
      expect(activeOption()).toHaveAttribute('aria-selected', 'true');
    });

    it('keeps Translate disabled until a language is chosen', async () => {
      const { user } = renderInfo();
      await user.click(screen.getByRole('button', { name: 'Translation' }));
      expect(screen.getByRole('button', { name: 'Translate' })).toBeDisabled();

      await clickAndSettle(user, picker());
      await user.click(screen.getByRole('option', { name: 'French' }));

      expect(screen.getByRole('button', { name: 'Translate' })).toBeEnabled();
    });
  });

  describe('translating', () => {
    const startTranslation = async () => {
      const setup = renderInfo();
      await chooseFrench(setup.user);
      await setup.user.click(screen.getByRole('button', { name: 'Translate' }));
      return setup;
    };

    it('sends the whole transcription with the chosen languages', async () => {
      const { worker } = await startTranslation();

      expect(worker.posted).toEqual([{ gen: 1, text: TRANSCRIPT, src_lang: 'eng_Latn', tgt_lang: 'fra_Latn' }]);
    });

    it('reports how far the model download has got', async () => {
      const { worker } = await startTranslation();

      send(worker, { status: 'progress', gen: 1, file: 'model.onnx', loaded: 25, total: 100 });

      expect(screen.getByText('Downloading model.onnx… 25%')).toBeInTheDocument();
    });

    it('says it is translating once the model is ready', async () => {
      const { worker } = await startTranslation();

      send(worker, { status: 'ready', gen: 1 });

      expect(screen.getByText('Translating…')).toBeInTheDocument();
    });

    it('shows the finished output rather than the last streamed step', async () => {
      const { worker } = await startTranslation();

      send(worker,
        { status: 'update', gen: 1, output: 'Bonjour. Général' },
        { status: 'complete', gen: 1, output: [{ translation_text: 'Bonjour. Général Kenobi.' }] });

      expect(screen.getByText('Bonjour. Général Kenobi.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Translate' })).toBeInTheDocument();
    });

    it('keeps the streamed text when the finished message carries none', async () => {
      const { worker } = await startTranslation();

      send(worker, { status: 'update', gen: 1, output: 'Bonjour.' }, { status: 'complete', gen: 1 });

      expect(screen.getByText('Bonjour.')).toBeInTheDocument();
    });

    it('explains a failed translation', async () => {
      const { worker } = await startTranslation();

      send(worker, { status: 'error', gen: 1, error: 'Translation failed. Please try again.' });

      expect(screen.getByRole('alert')).toHaveTextContent('Translation failed. Please try again.');
    });

    it('cancels, tells the worker, and ignores what the old job sends afterwards', async () => {
      const { worker, user } = await startTranslation();

      await user.click(screen.getByRole('button', { name: 'Cancel translation' }));
      send(worker, { status: 'complete', gen: 1, output: [{ translation_text: 'Trop tard' }] });

      expect(worker.posted.at(-1)).toEqual({ type: 'cancel' });
      expect(screen.queryByText('Trop tard')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Translate' })).toBeInTheDocument();
    });

    it('only listens to the newest job', async () => {
      const { worker, user } = await startTranslation();
      await user.click(screen.getByRole('button', { name: 'Cancel translation' }));
      await user.click(screen.getByRole('button', { name: 'Translate' }));
      const { gen: newest } = worker.posted.at(-1);

      send(worker,
        { status: 'complete', gen: 1, output: [{ translation_text: 'Ancien' }] },
        { status: 'complete', gen: newest, output: [{ translation_text: 'Nouveau' }] });

      expect(newest).toBeGreaterThan(1);
      expect(screen.getByText('Nouveau')).toBeInTheDocument();
      expect(screen.queryByText('Ancien')).not.toBeInTheDocument();
    });
  });
});