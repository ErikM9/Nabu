import { test, expect } from './support/fixtures.js';
import { TRANSCRIPT_TEXT, LONG_TRANSCRIPT_TEXT } from './support/fake-workers.js';
import { SIZES } from '../../src/utils/fitText.js';

const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const scrollsDown = page => page.evaluate(() => document.documentElement.scrollHeight > innerHeight);

/* How far apart the blocks stand down the screen, from the bottom of each to the top of the next */
const gapsBetween = async (...blocks) => {
  const boxes = await Promise.all(blocks.map(block => block.boundingBox()));
  return boxes.slice(1).map((box, i) => box.y - (boxes[i].y + boxes[i].height));
};

/* Even to within a pixel, as a block's edge can fall between two */
const expectEven = gaps => gaps.forEach(gap => expect(Math.abs(gap - gaps[0])).toBeLessThan(1));

/* The size a text is drawn at, in the rem the interface is sized in */
const remSize = text => text.evaluate(element =>
  parseFloat(getComputedStyle(element).fontSize) / parseFloat(getComputedStyle(document.documentElement).fontSize));

/* The smallest phone is where the interface first runs out of room, so it is checked alongside the common sizes */
for (const [name, width, height] of [['small phone', 320, 568], ['phone', 375, 667], ['tablet', 768, 1024]]) {
  test.describe(`Responsive layout on a ${name}`, () => {
    test.use({ viewport: { width, height } });

    test('fits the home screen without sideways scrolling', async ({ nabu, page }) => {
      await expect(nabu.recordButton).toBeVisible();

      expect(await overflow(page)).toBe(0);
    });

    test('fits the results without sideways scrolling', async ({ nabu, page }) => {
      await nabu.transcribe();
      await expect(nabu.resultHeading).toBeVisible();

      expect(await overflow(page)).toBe(0);
    });
  });
}

test.describe('Spacing', () => {
  test('stands every block on the home screen as far from the next, the microphone error included', async ({ nabu, page }) => {
    await page.evaluate(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Denied', 'NotAllowedError')); });

    await nabu.recordButton.click();
    await expect(nabu.alert).toBeVisible();

    expectEven(await gapsBetween(
      page.getByRole('heading', { name: 'Choose your audio:' }),
      page.getByText(/record any speech or upload an audio file/i),
      nabu.alert,
      nabu.recordButton.locator('..'),
      page.getByText(/max recording: 10 minutes/i),
    ));
  });

  test('stands the Cancel button as far below the transcription in progress as its lines stand apart', async ({ nabu, models, page }) => {
    models.transcription = 'slow';

    await nabu.transcribe();
    await expect(nabu.status).toHaveText(/downloading/i);

    expectEven(await gapsBetween(
      nabu.progressHeading,
      page.getByText(/this may take a moment/i),
      nabu.status,
      nabu.cancelTranscription,
    ));
  });

  test('stands the translated text as far from the language picker as from the buttons, like every block on the results', async ({ nabu, page }) => {
    await nabu.transcribe();
    await nabu.chooseLanguageByKeyboard('fre');

    await nabu.translateButton.click();
    const translated = page.getByText(`[fra_Latn] ${TRANSCRIPT_TEXT}`);
    await expect(translated).toBeVisible();

    expectEven(await gapsBetween(
      nabu.resultHeading,
      nabu.transcriptionView.locator('..'),
      nabu.translateButton.locator('..'),
      translated,
      nabu.copyButton.locator('..'),
    ));
  });
});

test.describe('Result text', () => {
  test('draws a short transcript at the largest size, and a longer one smaller, with neither making the page scroll', async ({ nabu, models, page }) => {
    await nabu.transcribe();
    const short = page.getByText(TRANSCRIPT_TEXT);
    await expect(short).toBeVisible();
    expect(await remSize(short)).toBeCloseTo(SIZES[0]);
    expect(await scrollsDown(page)).toBe(false);

    await nabu.restartButton.click();
    models.transcription = 'long';
    await nabu.transcribe();
    const long = page.getByText(LONG_TRANSCRIPT_TEXT);
    await expect(long).toBeVisible();

    expect(await remSize(long)).toBeLessThan(SIZES[0]);
    expect(await scrollsDown(page)).toBe(false);
  });

  test('lets only a transcript too long for the smallest size scroll the page, with its buttons still in reach', async ({ nabu, models, page }) => {
    models.transcription = 'huge';

    await nabu.transcribe();
    const huge = page.getByText(/^Welcome to the weekly team meeting/);
    await expect(huge).toBeVisible();

    expect(await remSize(huge)).toBeCloseTo(SIZES.at(-1));
    expect(await scrollsDown(page)).toBe(true);
    await nabu.restartButton.scrollIntoViewIfNeeded();
    await expect(nabu.restartButton).toBeInViewport();
  });
});