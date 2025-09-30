import { test, expect } from '@playwright/test';

// Verify that navigating to /admin loads AdminJS (may redirect to login)
// AdminJS handles routing internally via Express

test('Admin base path loads AdminJS', async ({ page }) => {
  await page.goto('/admin');
  
  // AdminJS may redirect to /admin/login if not authenticated
  await page.waitForLoadState('networkidle');
  
  // Should be on an admin route (either /admin or /admin/login)
  await expect(page).toHaveURL(/\/admin/);
  
  // Page should not be a 404 or error
  const is404 = await page.locator('text=/404|not found/i').count();
  expect(is404).toBe(0);
});
