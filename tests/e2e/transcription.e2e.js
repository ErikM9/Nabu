import { test, expect } from './support/fixtures.js';
import { FIXTURES } from './support/nabu-page.js';
import { TRANSCRIPT_TEXT } from './support/fake-workers.js';

test.describe('Transcription', () => {
  test('shows the transcript once Whisper finishes', async ({ nabu, page }) => {
    await nabu.transcribe();

    await expect(nabu.resultHeading).toBeVisible();
    await expect(page.getByText(TRANSCRIPT_TEXT)).toBeVisible();
  });

  /* Half a second of audio at the 16 kHz Whisper expects is exactly 8,000 samples */
  test('decodes the audio to 16 kHz samples before handing it to Whisper', async ({ nabu, models, page }) => {
    models.transcription = 'echo';

    await nabu.transcribe();

    await expect(page.getByText('Received 8000 samples')).toBeVisible();
  });

  test('shows model download progress while it waits', async ({ nabu, models }) => {
    models.transcription = 'slow';

    await nabu.transcribe();

    await expect(nabu.progressHeading).toBeVisible();
    await expect(nabu.status).toHaveText('Downloading encoder_model.onnx... 50%');
  });

  test('cancels back to the file, ready to try again', async ({ nabu, models, page }) => {
    models.transcription = 'slow';
    await nabu.transcribe();
    await expect(nabu.progressHeading).toBeVisible();

    await nabu.cancelTranscription.click();
    await expect(nabu.fileHeading).toBeVisible();

    models.transcription = 'success';
    await nabu.transcribeButton.click();
    await expect(page.getByText(TRANSCRIPT_TEXT)).toBeVisible();
  });

  test.describe('when something goes wrong', () => {
    test('explains that the model failed to load', async ({ nabu, models }) => {
      models.transcription = 'modelError';

      await nabu.transcribe();

      await expect(nabu.alert).toHaveText('Failed to load model. Please refresh and try again.');
      await expect(nabu.fileHeading).toBeVisible();
    });

    test('explains that a file with no audio in it cannot be read', async ({ nabu }) => {
      await nabu.transcribe(FIXTURES.noAudio);

      await expect(nabu.alert).toHaveText('Failed to process audio. Please try a different file.');
    });

    test('says so when no speech was heard', async ({ nabu, models }) => {
      models.transcription = 'noSpeech';

      await nabu.transcribe();

      await expect(nabu.alert).toContainText('No speech was detected in this audio.');
    });

    test('recovers from a worker that fails to start', async ({ nabu, models, page }) => {
      models.transcription = 'crash';
      await nabu.transcribe();
      await expect(nabu.alert).toContainText('Failed to start transcription.');

      models.transcription = 'success';
      await nabu.transcribeButton.click();

      await expect(page.getByText(TRANSCRIPT_TEXT)).toBeVisible();
    });
  });
});