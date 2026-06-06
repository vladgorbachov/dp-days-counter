import { test, expect } from './fixtures';

test.describe('Update Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForSelector('.title-bar', { timeout: 10000 });
    await page.waitForFunction(() => document.body.classList.contains('ready'), undefined, {
      timeout: 10000
    });
  });

  test('should have update button in settings modal', async ({ page }) => {
    await page.click('#settingsBtn');
    await page.locator('#settingsModal').waitFor({ state: 'visible', timeout: 5000 });

    const updateBtn = page.locator('#checkUpdatesBtn');
    await expect(updateBtn).toBeVisible();
    await expect(updateBtn).toHaveText('Check for Updates');
  });

  test('should show update button styling', async ({ page }) => {
    await page.click('#settingsBtn');
    await page.locator('#settingsModal').waitFor({ state: 'visible', timeout: 5000 });

    const updateBtn = page.locator('#checkUpdatesBtn');
    const backgroundColor = await updateBtn.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');

    const cursor = await updateBtn.evaluate((el) =>
      window.getComputedStyle(el).cursor
    );
    expect(cursor).toBe('pointer');
  });

  test('should have version.json file', async ({ page }) => {
    const response = await page.goto('/version.json');

    if (response) {
      expect(response.status()).toBe(200);

      const versionData = await response.json();
      expect(versionData).toHaveProperty('version');
      expect(versionData).toHaveProperty('downloadUrl');
      expect(versionData).toHaveProperty('changelog');
    }
  });

  test('should handle update check button click', async ({ page }) => {
    await page.click('#settingsBtn');
    await page.locator('#settingsModal').waitFor({ state: 'visible', timeout: 5000 });
    await page.click('#checkUpdatesBtn');

    const updateBtn = page.locator('#checkUpdatesBtn');
    await page.waitForTimeout(100);
    await expect(updateBtn).toBeVisible();
  });
});
