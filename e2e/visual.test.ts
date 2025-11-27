import { test, expect } from '@playwright/test';

test('landing page visual regression', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('landing-page.png');
});

test('editor visual regression', async ({ page }) => {
    // Navigate to a known state or mock data if possible
    await page.goto('/'); 
    // Wait for editor to load
    await page.waitForSelector('.editor-container');
    await expect(page).toHaveScreenshot('editor-initial.png');
});
