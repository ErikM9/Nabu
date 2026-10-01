import { test, expect } from './support/fixtures.js';

test.describe('Home', () => {
  test('introduces the app under its name', async ({ nabu, page }) => {
    await expect(nabu.recordButton).toBeVisible();
    await expect(page).toHaveTitle('Nabu');
    await expect(page.getByRole('heading', { level: 1, name: 'Nabu' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Choose your audio:' })).toBeVisible();
    await expect(page.getByText(/record any speech or upload an audio file/i)).toBeVisible();
    await expect(page.getByText(/max recording: 10 minutes/i)).toBeVisible();
  });

  test('offers recording and uploading', async ({ nabu }) => {
    await expect(nabu.recordButton).toBeEnabled();
    await expect(nabu.uploadInput).toHaveAttribute('accept', '.mp3,.wav,.webm,.ogg,.m4a');
  });

  /* Opening a focused file input is the browser's job, so the test checks what the app controls: the input is reachable and rendered */
  test('reaches the upload control from the keyboard', async ({ nabu, page }) => {
    await page.keyboard.press('Tab');
    await expect(nabu.recordButton).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(nabu.uploadInput).toBeFocused();
    expect(await nabu.uploadInput.evaluate(input => getComputedStyle(input).display)).not.toBe('none');
  });

  test('shows a chosen file ready to play and transcribe', async ({ nabu, page }) => {
    await nabu.upload();

    await expect(page.getByLabel('Audio preview')).toHaveAttribute('src', /^blob:/);
    await expect(nabu.transcribeButton).toBeVisible();
  });

  test('goes back home from Restart', async ({ nabu }) => {
    await nabu.upload();

    await nabu.restartButton.click();

    await expect(nabu.recordButton).toBeVisible();
  });
});