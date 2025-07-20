import { test, expect } from '@playwright/test';

test.describe('DP Days Counter Application', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('file://' + process.cwd() + '/dist/renderer/index.html');
    
    // Wait for the app to load
    await page.waitForSelector('.title-bar', { timeout: 10000 });
  });

  test('should display the main application interface', async ({ page }) => {
    // Check if the title bar is visible
    await expect(page.locator('.title-bar')).toBeVisible();
    
    // Check if the app title is correct
    await expect(page.locator('.app-title')).toHaveText('DP DAYS COUNTER');
    
    // Check if the calendar container is visible
    await expect(page.locator('.calendar-container')).toBeVisible();
    
    // Check if the sidebar is visible
    await expect(page.locator('.sidebar')).toBeVisible();
  });

  test('should display a month in calendar', async ({ page }) => {
    // Check if any month is displayed (don't check specific month due to app state)
    await expect(page.locator('.current-month')).toBeVisible();
    
    // Check if the month text is not empty
    const monthText = await page.locator('.current-month').textContent();
    expect(monthText).toBeTruthy();
    expect(monthText!.length).toBeGreaterThan(0);
  });

  test('should have settings button', async ({ page }) => {
    // Check if settings button exists
    await expect(page.locator('#settingsBtn')).toBeVisible();
  });

  test('should have date input fields', async ({ page }) => {
    // Check if date input fields exist
    await expect(page.locator('#startDateInput')).toBeVisible();
    await expect(page.locator('#endDateInput')).toBeVisible();
  });

  test('should have sidebar title', async ({ page }) => {
    // Check if sidebar title is correct
    await expect(page.locator('.sidebar-title')).toHaveText('Get Your DP Days & Hours');
  });

  test('should have navigation buttons', async ({ page }) => {
    // Check if navigation buttons exist
    await expect(page.locator('#prevMonthBtn')).toBeVisible();
    await expect(page.locator('#nextMonthBtn')).toBeVisible();
  });

  test('should have calendar grid', async ({ page }) => {
    // Check if calendar grid exists
    await expect(page.locator('.calendar-grid')).toBeVisible();
    
    // Check if calendar grid has the correct ID
    await expect(page.locator('#calendarGrid')).toBeVisible();
  });

  test('should have statistics footer', async ({ page }) => {
    // Check if statistics footer is visible
    await expect(page.locator('.statistics-footer')).toBeVisible();
    
    // Check if month hours and days are displayed
    await expect(page.locator('#monthHoursText')).toBeVisible();
    await expect(page.locator('#monthDaysText')).toBeVisible();
  });

  test('should display statistics footer', async ({ page }) => {
    // Check if statistics footer is visible
    await expect(page.locator('.statistics-footer')).toBeVisible();
    
    // Check if month hours and days are displayed
    await expect(page.locator('#monthHoursText')).toBeVisible();
    await expect(page.locator('#monthDaysText')).toBeVisible();
  });

  test('should have proper window controls', async ({ page }) => {
    // Check if window control buttons are visible
    await expect(page.locator('#minimizeBtn')).toBeVisible();
    await expect(page.locator('#maximizeBtn')).toBeVisible();
    await expect(page.locator('#closeBtn')).toBeVisible();
  });

  test('should have sidebar date range section', async ({ page }) => {
    // Check if date range section exists
    await expect(page.locator('.date-range-section')).toBeVisible();
    
    // Check if labels exist (they use class, not for attribute)
    await expect(page.locator('.date-label').first()).toBeVisible();
    await expect(page.locator('.date-label').nth(1)).toBeVisible();
  });

  test('should have results section', async ({ page }) => {
    // Check if results section exists
    await expect(page.locator('.results-section')).toBeVisible();
    
    // Check if result fields exist (correct IDs from HTML)
    await expect(page.locator('#totalDaysResult')).toBeVisible();
    await expect(page.locator('#totalHoursResult')).toBeVisible();
  });
}); 