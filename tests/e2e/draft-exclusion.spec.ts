import { test, expect } from '@playwright/test';

// Ensures that unpublished drafts are excluded from blog list and SEO endpoints

test('Draft posts are excluded from blog list UI', async ({ page }) => {
  await page.goto('/blog');
  const titles = await page.locator('a[href^="/blog/"] h3').allTextContents();
  expect(titles).not.toContain('Draft Post — Not Yet Published');
});

test('Draft posts are excluded from sitemap.xml', async ({ page }) => {
  const resp = await page.request.get('/sitemap.xml');
  expect(resp.ok()).toBeTruthy();
  const body = await resp.text();
  expect(body).not.toContain('/blog/draft-post');
});

test('Draft posts are excluded from rss.xml', async ({ page }) => {
  const resp = await page.request.get('/rss.xml');
  expect(resp.ok()).toBeTruthy();
  const body = await resp.text();
  expect(body).not.toContain('/blog/draft-post');
});
