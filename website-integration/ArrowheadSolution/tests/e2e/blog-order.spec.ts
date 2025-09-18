import { test, expect } from '@playwright/test';

// Ensures blog list is ordered by publishedAt desc
// Expected order by dates in content/blog/*.md:
// 1) Beyond the Buzzwords: 2025-09-16
// 2) XSS Test: 2025-03-20

test('Blog list ordering by date desc', async ({ page }) => {
  await page.goto('/blog');
  // wait for at least 2 post cards to render (ensure client-side fetch completed)
  const cards = page.locator('a[href^="/blog/"] h3');
  await cards.nth(1).waitFor({ state: 'visible' });
  const titles = await cards.allTextContents();
  // We expect the first 2 titles to be in the expected order
  expect(titles.slice(0, 2)).toEqual([
    'Beyond the Buzzwords: The First Question Every Team Must Answer Before Brainstorming',
    'XSS Test: Script Sanitization',
  ]);
});
