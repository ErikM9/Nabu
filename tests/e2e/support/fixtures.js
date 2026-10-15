import { test as base, expect } from '@playwright/test';
import { NabuPage } from './nabu-page.js';
import { whisperWorker, translateWorker } from './fake-workers.js';

export const test = base.extend({
  /* Holds the script each fake worker runs, which a test can change before the worker starts */
  models: [async ({ page, baseURL }, use) => {
    const models = { transcription: 'success', translation: 'success' };
    const escaped = [];

    /* Anything leaving the preview server would be a live download, so it is blocked and reported */
    await page.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(baseURL) || url.startsWith('blob:') || url.startsWith('data:')) return route.continue();
      escaped.push(url);
      return route.abort();
    });

    await page.route(/whisper\.worker.*\.js/, route =>
      route.fulfill({ contentType: 'text/javascript', body: whisperWorker(models.transcription) }));
    await page.route(/translate\.worker.*\.js/, route =>
      route.fulfill({ contentType: 'text/javascript', body: translateWorker(models.translation) }));

    await use(models);

    /* Blocked requests for Font Awesome and Google Fonts are expected, while anything else is a leak */
    expect(escaped.filter(url => !/cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(url)),
      'requests that escaped to the network').toEqual([]);
  }, { auto: true }],

  nabu: async ({ page }, use) => {
    const nabu = new NabuPage(page);
    await nabu.open();
    await use(nabu);
  },
});

export { expect };