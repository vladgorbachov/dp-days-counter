import { test, expect } from './fixtures';

test.describe('External Link Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForSelector('.title-bar', { timeout: 10000 });
    await page.waitForFunction(() => document.body.classList.contains('ready'), undefined, {
      timeout: 10000
    });
    await page.click('#settingsBtn');
    await page.locator('#settingsModal').waitFor({ state: 'visible', timeout: 5000 });
  });

  test('should have website link in settings modal', async ({ page }) => {
    const websiteLink = page.locator('.website-link');
    await expect(websiteLink).toBeVisible();
    await expect(websiteLink).toHaveText('www.delionsoft.com');
  });

  test('should have clickable website link styling', async ({ page }) => {
    const websiteLink = page.locator('.website-link');
    await expect(websiteLink).toBeVisible();
    const cursor = await websiteLink.evaluate((el) =>
      window.getComputedStyle(el).cursor
    );
    expect(cursor).toBe('pointer');
  });

  test('should have proper website link appearance', async ({ page }) => {
    const websiteLink = page.locator('.website-link');
    const color = await websiteLink.evaluate((el) =>
      window.getComputedStyle(el).color
    );
    expect(color).not.toBe('rgba(0, 0, 0, 0)');

    const fontFamily = await websiteLink.evaluate((el) =>
      window.getComputedStyle(el).fontFamily
    );
    expect(fontFamily).toContain('Orbitron');

    const textTransform = await websiteLink.evaluate((el) =>
      window.getComputedStyle(el).textTransform
    );
    expect(textTransform).toBe('uppercase');
  });
});
