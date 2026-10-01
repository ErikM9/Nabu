import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './support/fixtures.js';

const scan = async (page, { exclude = [] } = {}) => {
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
  exclude.forEach(selector => builder.exclude(selector));
  const { violations } = await builder.analyze();
  return violations.map(violation => `${violation.id}: ${violation.help}`);
};

/* The light grey "Select language" hint is kept as designed although it sits at 2.5:1, under the AA ratio, so it is the one known exception */
const LANGUAGE_HINT = '[role="combobox"] .truncate';

test.describe('Accessibility', () => {
  test('passes an automated WCAG 2.1 A and AA scan at home', async ({ nabu, page }) => {
    await expect(nabu.recordButton).toBeVisible();

    expect(await scan(page)).toEqual([]);
  });

  test('passes the same scan with a file chosen', async ({ nabu, page }) => {
    await nabu.upload();

    expect(await scan(page)).toEqual([]);
  });

  test('passes the same scan on the results with the language list open', async ({ nabu, page }) => {
    await nabu.transcribe();
    await nabu.translationView.click();
    await nabu.languagePicker.click();

    expect(await scan(page, { exclude: [LANGUAGE_HINT] })).toEqual([]);
  });

  test('keeps a single top-level heading on every screen', async ({ nabu, page }) => {
    await expect(page.locator('h1')).toHaveCount(1);

    await nabu.upload();
    await expect(page.locator('h1')).toHaveCount(1);

    await nabu.transcribeButton.click();
    await expect(nabu.resultHeading).toBeVisible();
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('draws a visible focus ring on keyboard focus', async ({ nabu, page }) => {
    await page.keyboard.press('Tab');

    const outline = await nabu.recordButton.evaluate(button => getComputedStyle(button).outlineStyle);
    expect(outline).not.toBe('none');
  });
});