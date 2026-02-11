import { test, expect } from '@playwright/test';

test('robots.txt disallows /admin', async ({ page }) => {
  const resp = await page.request.get('/robots.txt');
  expect(resp.ok()).toBeTruthy();
  const body = await resp.text();
  expect(body).toMatch(/Disallow:\s*\/admin/i);
});
