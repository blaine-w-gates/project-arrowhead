import { test, expect } from '@playwright/test';

// Verify non-existent blog slug shows the not-found UI
// This leverages BlogPost.tsx behavior when post is missing
// Expected heading: "Article Not Found"
// and a Back to Blog link (Button uses asChild -> anchor)

test.describe.skip('Blog 404s', () => {
  test('Non-existent blog slug shows not-found UI', async ({ page }) => {
    await page.goto('/blog/this-post-does-not-exist');
    await expect(page.getByRole('heading', { level: 1, name: 'Article Not Found' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Back to Blog/i })).toBeVisible();
  });
});
