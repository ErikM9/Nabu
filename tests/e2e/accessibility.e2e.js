import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './support/fixtures.js';

const scan = async (page) => {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return violations.map(violation => `${violation.id}: ${violation.help}`);
};

test.describe('Accessibility', () => {
  test('passes an automated WCAG 2.1 A and AA scan at home', async ({ nabu, page }) => {
    await expect(nabu.recordButton).toBeVisible();

    expect(await scan(page)).toEqual([]);
  });

  test('passes a WCAG 2.1 A and AA scan with a file chosen', async ({ nabu, page }) => {
    await nabu.upload();

    expect(await scan(page)).toEqual([]);
  });

  test('passes a WCAG 2.1 A and AA scan on the results with the language list open', async ({ nabu, page }) => {
    await nabu.transcribe();
    await nabu.translationView.click();
    await nabu.languagePicker.click();

    expect(await scan(page)).toEqual([]);
  });

  test('keeps a single top-level heading at home, with a file chosen and on the results', async ({ nabu, page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);

    await nabu.upload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);

    await nabu.transcribeButton.click();
    await expect(nabu.resultHeading).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('draws a visible focus ring on keyboard focus', async ({ nabu, page }) => {
    await page.keyboard.press('Tab');

    const outline = await nabu.recordButton.evaluate(button => getComputedStyle(button).outlineStyle);
    expect(outline).not.toBe('none');
  });
});