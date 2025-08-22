import { test, expect } from '@playwright/test';

// Verify admin page includes a noindex meta tag to prevent indexing

test('Admin page includes meta robots noindex', async ({ page }) => {
  await page.goto('/admin/index.html');
  const robots = page.locator('meta[name="robots"]');
  await expect(robots).toHaveAttribute('content', /noindex/i);
});
