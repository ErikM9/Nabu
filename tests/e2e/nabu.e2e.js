import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const testAudioPath = path.join(process.cwd(), 'tests', 'fixtures', 'test.wav');

/* Clicking the label opens a real file chooser, which triggers the change handler the way a user would */
async function uploadFile(page, filePath) {
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('label[for="file-upload"]').click(),
  ]);
  await fileChooser.setFiles(filePath);
}

test.beforeAll(() => {
  if (!fs.existsSync(path.dirname(testAudioPath))) {
    fs.mkdirSync(path.dirname(testAudioPath), { recursive: true });
  }
  if (!fs.existsSync(testAudioPath)) {
    /* Minimal valid WAV header with no audio data, enough to render the File view */
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(16000, 24);
    header.writeUInt32LE(32000, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(0, 40);
    fs.writeFileSync(testAudioPath, header);
  }
});

test.describe('Nabu App - Initial Load', () => {
  test('loads the application', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Nabu/i);
  });
  test('displays the header with app name', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByLabel('Nabu')).toBeVisible();
  });
  test('shows Na text in header', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Na', { exact: true })).toBeVisible();
  });
  test('shows bu text in header', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('bu', { exact: true })).toBeVisible();
  });
  test('displays instruction text', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/record any speech/i)).toBeVisible();
  });
  test('shows Record button', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /record/i })).toBeVisible();
  });
  test('shows Audio File button', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Audio File', { exact: true })).toBeVisible();
  });
  test('shows max recording info', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/max recording.*10 minutes/i)).toBeVisible();
  });
  test('shows offline info', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/works offline/i)).toBeVisible();
  });
  test('has file input element', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#file-upload')).toBeAttached();
  });
});

test.describe('Nabu App - Header', () => {
  test('header is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header')).toBeVisible();
  });
  test('minecraft host image exists', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByAltText('Minecraft host welcoming you')).toBeVisible();
  });
});

test.describe('Nabu App - File Upload Flow', () => {
  test('file input accepts audio files', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#file-upload')).toHaveAttribute('accept', '.mp3,.wav,.webm,.ogg,.m4a');
  });
  test('uploading file shows File view', async ({ page }) => {
    await page.goto('/');
    await uploadFile(page, testAudioPath);
    await expect(page.getByText('Here is your file:')).toBeVisible({ timeout: 5000 });
  });
  test('File view shows Transcribe button', async ({ page }) => {
    await page.goto('/');
    await uploadFile(page, testAudioPath);
    await expect(page.getByText('Here is your file:')).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel('Start transcription')).toBeVisible();
  });
  test('File view shows Restart button', async ({ page }) => {
    await page.goto('/');
    await uploadFile(page, testAudioPath);
    await expect(page.getByText('Here is your file:')).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel('Reset and try again')).toBeVisible();
  });
  test('File view shows audio player', async ({ page }) => {
    await page.goto('/');
    await uploadFile(page, testAudioPath);
    await expect(page.getByText('Here is your file:')).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel('Audio preview')).toBeVisible();
  });
  test('Restart returns to Home', async ({ page }) => {
    await page.goto('/');
    await uploadFile(page, testAudioPath);
    await expect(page.getByText('Here is your file:')).toBeVisible({ timeout: 5000 });
    await page.getByLabel('Reset and try again').click();
    await expect(page.getByText(/record any speech/i)).toBeVisible();
  });
  test('Transcribe button has correct text', async ({ page }) => {
    await page.goto('/');
    await uploadFile(page, testAudioPath);
    await expect(page.getByText('Here is your file:')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Transcribe', { exact: true })).toBeVisible();
  });
  test('Restart button has correct text', async ({ page }) => {
    await page.goto('/');
    await uploadFile(page, testAudioPath);
    await expect(page.getByText('Here is your file:')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Restart', { exact: true })).toBeVisible();
  });
});

test.describe('Nabu App - Recording UI', () => {
  test('Record button exists and is clickable', async ({ page }) => {
    await page.goto('/');
    const recordBtn = page.getByRole('button', { name: /record/i });
    await expect(recordBtn).toBeVisible();
    await expect(recordBtn).toBeEnabled();
  });
  test('Record button has microphone icon', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.fa-microphone')).toBeVisible();
  });
  test('Record button has correct text', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Record', { exact: true })).toBeVisible();
  });
});

test.describe('Nabu App - UI Elements', () => {
  test('has upload icon', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.fa-upload')).toBeVisible();
  });
});

test.describe('Nabu App - Accessibility', () => {
  test('file input has associated label', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('label[for="file-upload"]')).toBeVisible();
  });
  test('file input is hidden but accessible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#file-upload')).toHaveClass(/hidden/);
    await expect(page.locator('#file-upload')).toBeAttached();
  });
});

test.describe('Nabu App - Responsive Design', () => {
  test('works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.getByText(/record any speech/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /record/i })).toBeVisible();
  });
  test('works on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.getByText(/record any speech/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /record/i })).toBeVisible();
  });
  test('works on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await expect(page.getByText(/record any speech/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /record/i })).toBeVisible();
  });
  test('file upload works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await uploadFile(page, testAudioPath);
    await expect(page.getByText('Here is your file:')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Nabu App - File View Icons', () => {
  test('Transcribe button has microphone-lines icon', async ({ page }) => {
    await page.goto('/');
    await uploadFile(page, testAudioPath);
    await expect(page.getByText('Here is your file:')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.fa-microphone-lines')).toBeVisible();
  });
  test('Restart button has arrow-rotate-left icon', async ({ page }) => {
    await page.goto('/');
    await uploadFile(page, testAudioPath);
    await expect(page.getByText('Here is your file:')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.fa-arrow-rotate-left')).toBeVisible();
  });
});