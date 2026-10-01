import { test, expect } from './support/fixtures.js';

/* Chromium's fake capture device stands in for a microphone, as set up in playwright.config.js */
test.describe('Recording', () => {
  test('records from the microphone and transcribes what it heard', async ({ nabu, models, page }) => {
    models.transcription = 'echo';

    await nabu.recordButton.click();
    /* Any time past 00:00 proves the recorder is running, whereas an exact second is on screen too briefly to catch reliably */
    await expect(page.getByText(/^\d{2}:\d{2}$/)).not.toHaveText('00:00', { timeout: 10000 });
    await nabu.stopButton.click();

    await expect(nabu.fileHeading).toBeVisible();
    await nabu.transcribeButton.click();
    await expect(page.getByText(/^Received [1-9]\d* samples$/)).toBeVisible();
  });
});