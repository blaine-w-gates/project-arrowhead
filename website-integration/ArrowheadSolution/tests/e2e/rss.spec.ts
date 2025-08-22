import { test, expect } from '@playwright/test';

// Verify rss.xml is generated and contains at least one item

test('rss.xml exists and contains items', async ({ page }) => {
  const resp = await page.request.get('/rss.xml');
  expect(resp.ok()).toBeTruthy();
  const body = await resp.text();
  expect(body).toContain('<rss');
  expect(body).toContain('<channel>');
  expect(body).toMatch(/<item>[\s\S]*<title>[\s\S]*<\/title>[\s\S]*<link>[\s\S]*<\/link>/);
});
