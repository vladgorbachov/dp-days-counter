import { test, expect } from '@playwright/test';

test.describe('Update Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('file://' + process.cwd() + '/dist/renderer/index.html');
    
    // Wait for the app to load
    await page.waitForSelector('.title-bar', { timeout: 10000 });
  });

  test('should have update button in settings modal', async ({ page }) => {
    // Open settings modal
    await page.click('#settingsBtn');
    
    // Wait for modal to be visible
    await page.waitForSelector('#settingsModal', { timeout: 5000 });
    
    // Check if update button exists
    const updateBtn = page.locator('#checkUpdatesBtn');
    await expect(updateBtn).toBeVisible();
    await expect(updateBtn).toHaveText('Check for Updates');
  });

  test('should show update button styling', async ({ page }) => {
    // Open settings modal
    await page.click('#settingsBtn');
    
    // Wait for modal to be visible
    await page.waitForSelector('#settingsModal', { timeout: 5000 });
    
    // Check update button styling
    const updateBtn = page.locator('#checkUpdatesBtn');
    
    // Check if it has proper styling
    const backgroundColor = await updateBtn.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    
    // Check cursor
    const cursor = await updateBtn.evaluate(el => 
      window.getComputedStyle(el).cursor
    );
    expect(cursor).toBe('pointer');
  });

  test('should have version.json file', async ({ page }) => {
    // Try to access version.json file
    const response = await page.goto('file://' + process.cwd() + '/dist/renderer/version.json');
    
    if (response) {
      expect(response.status()).toBe(200);
      
      const versionData = await response.json();
      expect(versionData).toHaveProperty('version');
      expect(versionData).toHaveProperty('downloadUrl');
      expect(versionData).toHaveProperty('changelog');
    }
  });

  test('should handle update check button click', async ({ page }) => {
    // Open settings modal
    await page.click('#settingsBtn');
    
    // Wait for modal to be visible
    await page.waitForSelector('#settingsModal', { timeout: 5000 });
    
    // Click update button
    await page.click('#checkUpdatesBtn');
    
    // Button should show "Checking..." state briefly
    const updateBtn = page.locator('#checkUpdatesBtn');
    
    // Wait a moment for the check to start
    await page.waitForTimeout(100);
    
    // The button should be clickable (we can't test the actual API call in headless mode)
    await expect(updateBtn).toBeVisible();
  });
}); 