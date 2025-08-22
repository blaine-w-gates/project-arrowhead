import { test, expect } from '@playwright/test';

// Verify that navigating to /admin redirects to /admin/index.html (with possible Decap hash)
// This works via Express redirect in server/index.ts

test('Admin base path redirects to index.html', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/index\.html(\/#?\/)?/);
  await expect(page.locator('h1')).toHaveText(/Decap CMS Admin/i);
});
