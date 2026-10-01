import { test, expect } from './support/fixtures.js';

const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/* The smallest phone is where the interface first runs out of room as it scales up, so it is checked alongside the common sizes */
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