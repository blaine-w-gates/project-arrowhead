import { test, expect } from '@playwright/test';

// Ensures blog list is ordered by publishedAt desc
// Expected order by dates in content/blog/*.md:
// 1) XSS Test: 2025-03-20
// 2) 5 Common Strategic Planning Mistakes to Avoid: 2025-03-15
// 3) The HSE Framework: A Complete Guide: 2025-03-10
// 4) Building High-Performance Teams Through Clear Objectives: 2025-03-05

test('Blog list ordering by date desc', async ({ page }) => {
  await page.goto('/blog');
  // wait for at least 4 post cards to render (ensure client-side fetch completed)
  const cards = page.locator('a[href^="/blog/"] h3');
  await cards.nth(3).waitFor({ state: 'visible' });
  const titles = await cards.allTextContents();
  // We expect at least the first 4 titles to be in the expected order
  expect(titles.slice(0, 4)).toEqual([
    'XSS Test: Script Sanitization',
    '5 Common Strategic Planning Mistakes to Avoid',
    'The HSE Framework: A Complete Guide',
    'Building High-Performance Teams Through Clear Objectives',
  ]);
});
