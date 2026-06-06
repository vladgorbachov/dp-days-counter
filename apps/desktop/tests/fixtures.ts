import { test as base, expect } from '@playwright/test';
import { ELECTRON_API_MOCK } from './electron-api-mock';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(ELECTRON_API_MOCK);
    await use(page);
  }
});

export { expect };
