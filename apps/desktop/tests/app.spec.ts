import { test, expect } from './fixtures';

test.describe('DP Days Counter Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForSelector('.title-bar', { timeout: 10000 });
    await page.waitForFunction(() => document.body.classList.contains('ready'), undefined, {
      timeout: 10000
    });
  });

  test('should display the main application interface', async ({ page }) => {
    await expect(page.locator('.title-bar')).toBeVisible();
    await expect(page.locator('.app-title')).toHaveText('DP DAYS COUNTER');
    await expect(page.locator('.calendar-container')).toBeVisible();
    await expect(page.locator('.sidebar')).toBeVisible();
  });

  test('should display a month in calendar', async ({ page }) => {
    await expect(page.locator('.current-month')).toBeVisible();
    const monthText = await page.locator('.current-month').textContent();
    expect(monthText).toBeTruthy();
    expect(monthText!.length).toBeGreaterThan(0);
  });

  test('should have settings button', async ({ page }) => {
    await expect(page.locator('#settingsBtn')).toBeVisible();
  });

  test('should have date input fields', async ({ page }) => {
    await expect(page.locator('#startDateInput')).toBeVisible();
    await expect(page.locator('#endDateInput')).toBeVisible();
  });

  test('should have sidebar title', async ({ page }) => {
    await expect(page.locator('.sidebar-title')).toHaveText('Get Your DP Days & Hours');
  });

  test('should have navigation buttons', async ({ page }) => {
    await expect(page.locator('#prevMonthBtn')).toBeVisible();
    await expect(page.locator('#nextMonthBtn')).toBeVisible();
  });

  test('should have calendar grid', async ({ page }) => {
    await expect(page.locator('.calendar-grid')).toBeVisible();
    await expect(page.locator('#calendarGrid')).toBeVisible();
  });

  test('should display statistics footer', async ({ page }) => {
    await expect(page.locator('.statistics-footer')).toBeVisible();
    await expect(page.locator('#monthHoursText')).toBeVisible();
    await expect(page.locator('#monthDaysText')).toBeVisible();
  });

  test('should have proper window controls', async ({ page }) => {
    await expect(page.locator('#minimizeBtn')).toBeVisible();
    await expect(page.locator('#maximizeBtn')).toBeVisible();
    await expect(page.locator('#closeBtn')).toBeVisible();
  });

  test('should have sidebar date range section', async ({ page }) => {
    await expect(page.locator('.date-range-section')).toBeVisible();
    await expect(page.locator('.date-label').first()).toBeVisible();
    await expect(page.locator('.date-label').nth(1)).toBeVisible();
  });

  test('should have results section', async ({ page }) => {
    await expect(page.locator('.results-section')).toBeVisible();
    await expect(page.locator('#totalDaysResult')).toBeVisible();
    await expect(page.locator('#totalHoursResult')).toBeVisible();
  });
});
