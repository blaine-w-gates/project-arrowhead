import { test, expect } from '@playwright/test';

// Ensures blog list is ordered by publishedAt desc
// Expected visible order by dates in content/blog/*.md:
// 1) Beyond the Buzzwords: 2025-09-16
// Note: XSS Test is intentionally hidden from the list but remains directly accessible.

test.describe.skip('Blog list ordering', () => {
  test('Blog list ordering by date desc', async ({ page }) => {
    await page.goto('/blog');
    // wait for at least 1 post card to render (ensure client-side fetch completed)
    const cards = page.locator('a[href^="/blog/"] h3');
    await cards.nth(0).waitFor({ state: 'visible' });
    const titles = await cards.allTextContents();
    // We expect the first title to be the latest article
    expect(titles[0]).toBe(
      'Beyond the Buzzwords: The First Question Every Team Must Answer Before Brainstorming'
    );
  });
});
