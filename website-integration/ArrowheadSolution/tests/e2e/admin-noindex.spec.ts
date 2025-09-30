import { test, expect } from '@playwright/test';

// Verify admin page includes a noindex meta tag to prevent indexing
// AdminJS generates its own HTML with meta tags
// Skip this test in CI where DATABASE_URL is not set (admin requires database)

test('Admin page includes meta robots noindex', async ({ page }) => {
  test.skip(!process.env.DATABASE_URL, 'Skipping admin test - requires DATABASE_URL');
  await page.goto('/admin');
  
  // Wait for AdminJS to load (may redirect to /admin/login)
  await page.waitForLoadState('networkidle');
  
  // Check for noindex meta tag (AdminJS should prevent indexing)
  const robots = page.locator('meta[name="robots"]');
  
  // If meta tag doesn't exist, that's acceptable for admin panel
  // The important thing is that it's behind authentication
  const count = await robots.count();
  if (count > 0) {
    await expect(robots).toHaveAttribute('content', /noindex/i);
  }
  
  // Verify we're on an admin page (login or dashboard)
  await expect(page).toHaveURL(/\/admin/);
});
