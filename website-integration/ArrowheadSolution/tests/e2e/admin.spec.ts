import { test, expect } from '@playwright/test';

// Verifies that the AdminJS login page is reachable
// Note: Full admin functionality requires authentication (tested separately)
// Skip this test in CI where DATABASE_URL is not set (admin requires database)
test('Admin login page loads at /admin', async ({ page }) => {
  test.skip(!process.env.DATABASE_URL, 'Skipping admin test - requires DATABASE_URL');
  await page.goto('/admin');
  
  // AdminJS should redirect to /admin/login or show login form
  await page.waitForURL(/\/admin(\/login)?/, { timeout: 10000 });
  
  // Check that we get either the login page or admin interface
  // (depending on session state)
  expect(page.url()).toMatch(/\/admin/);
});
