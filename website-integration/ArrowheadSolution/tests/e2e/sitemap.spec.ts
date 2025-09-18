import { test, expect } from '@playwright/test';

// Verify sitemap.xml is generated and contains blog URLs

test('sitemap.xml exists and contains blog urls', async ({ page }) => {
  const resp = await page.request.get('/sitemap.xml');
  expect(resp.ok()).toBeTruthy();
  const body = await resp.text();
  expect(body).toContain('<urlset');
  expect(body).toContain('<loc>');
  expect(body).toMatch(/\/blog\//);
  // Ensure security fixture post is excluded from SEO endpoints
  expect(body).not.toContain('/blog/xss-test');
});
