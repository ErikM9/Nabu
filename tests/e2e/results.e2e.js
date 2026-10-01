import { readFile } from 'node:fs/promises';
import { test, expect } from './support/fixtures.js';
import { TRANSCRIPT_TEXT } from './support/fake-workers.js';

test.describe('Results', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test.beforeEach(async ({ nabu }) => {
    await nabu.transcribe();
    await expect(nabu.resultHeading).toBeVisible();
  });

  test('copies the transcript and confirms it', async ({ nabu, page }) => {
    await nabu.copyButton.click();

    await expect(nabu.status).toHaveText('Copied to clipboard.');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(TRANSCRIPT_TEXT);
  });

  test('downloads the transcript as an English text file', async ({ nabu, page }) => {
    const [download] = await Promise.all([page.waitForEvent('download'), nabu.downloadButton.click()]);

    expect(download.suggestedFilename()).toMatch(/^Nabu_transcription_en_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.txt$/);
    expect(await readFile(await download.path(), 'utf8')).toBe(TRANSCRIPT_TEXT);
  });

  test('translates into a language chosen with the keyboard alone', async ({ nabu, page }) => {
    await nabu.chooseLanguageByKeyboard('fre');
    await expect(nabu.languagePicker).toHaveText('French');

    await nabu.translateButton.click();

    await expect(page.getByText(`[fra_Latn] ${TRANSCRIPT_TEXT}`)).toBeVisible();
  });

  test('downloads a translation under its language code', async ({ nabu, page }) => {
    await nabu.chooseLanguageByKeyboard('fre');
    await nabu.translateButton.click();
    await expect(page.getByText(`[fra_Latn] ${TRANSCRIPT_TEXT}`)).toBeVisible();

    const [download] = await Promise.all([page.waitForEvent('download'), nabu.downloadButton.click()]);

    expect(download.suggestedFilename()).toMatch(/^Nabu_translation_fra_/);
  });

  test('keeps an English file name for the transcript after a language is picked', async ({ nabu, page }) => {
    await nabu.chooseLanguageByKeyboard('fre');
    await nabu.transcriptionView.click();

    const [download] = await Promise.all([page.waitForEvent('download'), nabu.downloadButton.click()]);

    expect(download.suggestedFilename()).toMatch(/^Nabu_transcription_en_/);
  });

  test('cancels a translation part-way', async ({ nabu, models, page }) => {
    models.translation = 'slow';
    await page.reload();
    await nabu.transcribe();
    await nabu.chooseLanguageByKeyboard('fre');
    await nabu.translateButton.click();
    await expect(page.getByText('Downloading model.onnx… 25%')).toBeVisible();

    await nabu.cancelTranslation.click();

    await expect(nabu.translateButton).toBeVisible();
    await expect(page.getByText(/Downloading model\.onnx/)).toBeHidden();
  });

  test('explains a failed translation', async ({ nabu, models, page }) => {
    models.translation = 'error';
    await page.reload();
    await nabu.transcribe();
    await nabu.chooseLanguageByKeyboard('fre');

    await nabu.translateButton.click();

    await expect(nabu.alert).toHaveText('Translation failed. Please try again.');
  });

  test('marks which view is showing', async ({ nabu }) => {
    await expect(nabu.transcriptionView).toHaveAttribute('aria-pressed', 'true');

    await nabu.translationView.click();

    await expect(nabu.translationView).toHaveAttribute('aria-pressed', 'true');
    await expect(nabu.transcriptionView).toHaveAttribute('aria-pressed', 'false');
  });

  test('starts over from Restart', async ({ nabu }) => {
    await nabu.restartButton.click();

    await expect(nabu.recordButton).toBeVisible();
  });
});