import { test, expect } from '@playwright/test';

test.describe('External Link Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('file://' + process.cwd() + '/dist/renderer/index.html');
    
    // Wait for the app to load
    await page.waitForSelector('.title-bar', { timeout: 10000 });
  });

  test('should have website link in HTML structure', async ({ page }) => {
    // Check if website link exists in the DOM (even if modal is hidden)
    const websiteLink = page.locator('.website-link');
    await expect(websiteLink).toBeVisible();
    await expect(websiteLink).toHaveText('www.delionsoft.com');
  });

  test('should have clickable website link styling', async ({ page }) => {
    // Check if website link has proper styling
    const websiteLink = page.locator('.website-link');
    await expect(websiteLink).toBeVisible();
    
    // Verify it has pointer cursor (CSS)
    const cursor = await websiteLink.evaluate(el => 
      window.getComputedStyle(el).cursor
    );
    expect(cursor).toBe('pointer');
  });

  test('should have proper website link appearance', async ({ page }) => {
    // Check website link styling
    const websiteLink = page.locator('.website-link');
    
    // Check color (should be primary color)
    const color = await websiteLink.evaluate(el => 
      window.getComputedStyle(el).color
    );
    expect(color).not.toBe('rgba(0, 0, 0, 0)'); // Should have a color
    
    // Check font family
    const fontFamily = await websiteLink.evaluate(el => 
      window.getComputedStyle(el).fontFamily
    );
    expect(fontFamily).toContain('Orbitron');
    
    // Check text transform
    const textTransform = await websiteLink.evaluate(el => 
      window.getComputedStyle(el).textTransform
    );
    expect(textTransform).toBe('uppercase');
  });
}); 