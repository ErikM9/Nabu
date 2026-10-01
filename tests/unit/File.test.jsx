import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import File from '../../src/components/File';

const audio = new Blob(['audio'], { type: 'audio/wav' });

const renderFile = (props = {}) => {
  const handlers = { onFormSubmit: vi.fn(), onAudioReset: vi.fn() };
  const view = render(<File file={audio} {...handlers} {...props} />);
  return { ...handlers, ...view };
};

describe('File', () => {
  it('sits under a second-level heading, below the app title', () => {
    renderFile();

    expect(screen.getByRole('heading', { level: 2, name: 'Here is your file:' })).toBeInTheDocument();
  });

  it('plays the chosen file in the preview', () => {
    renderFile();

    expect(URL.createObjectURL).toHaveBeenCalledWith(audio);
    expect(screen.getByLabelText('Audio preview')).toHaveAttribute('src', 'blob:mock-url');
  });

  it('plays a recording when there is no file', () => {
    const recording = new Blob(['recording'], { type: 'audio/webm' });

    renderFile({ file: null, audioStream: recording });

    expect(URL.createObjectURL).toHaveBeenCalledWith(recording);
  });

  it('releases the preview URL when it goes away', () => {
    const { unmount } = renderFile();

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  /* The names match the words on the buttons, so voice control users can say what they see */
  it('starts transcribing from the Transcribe button', async () => {
    const { onFormSubmit } = renderFile();

    await userEvent.click(screen.getByRole('button', { name: 'Transcribe' }));

    expect(onFormSubmit).toHaveBeenCalledTimes(1);
  });

  it('starts over from the Restart button', async () => {
    const { onAudioReset } = renderFile();

    await userEvent.click(screen.getByRole('button', { name: 'Restart' }));

    expect(onAudioReset).toHaveBeenCalledTimes(1);
  });

  it('shows an error as an alert', () => {
    renderFile({ error: 'Failed to load model. Please refresh and try again.' });

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load model. Please refresh and try again.');
  });

  it('shows no alert when nothing is wrong', () => {
    renderFile();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});