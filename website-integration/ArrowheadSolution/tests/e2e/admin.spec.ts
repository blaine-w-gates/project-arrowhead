import { test, expect } from '@playwright/test';

// Verifies that the Decap CMS admin page is reachable and has expected title
// Use explicit index.html path for reliability across dev servers
test('Admin UI loads at /admin/index.html', async ({ page }) => {
  await page.goto('/admin/index.html');
  await expect(page).toHaveTitle(/Decap CMS Admin/i);
  await expect(page.locator('h1')).toHaveText(/Decap CMS Admin/i);
});

// Verifies that the Decap CMS config YAML is served and contains expected keys
test('Admin config.yml is accessible and contains expected sections', async ({ page }) => {
  const resp = await page.request.get('/admin/config.yml');
  expect(resp.ok()).toBeTruthy();
  const body = await resp.text();
  expect(body).toContain('backend:');
  expect(body).toContain('collections:');
  expect(body).toContain('media_folder:');
});
