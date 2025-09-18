import { test, expect } from '@playwright/test';

// Helper: short pause when waiting on client-side rendering transitions
async function _shortPause(ms = 200) {
  await new Promise((r) => setTimeout(r, ms));
}

// Known titles from the currently published markdown files
const sampleTitles = [
  'Beyond the Buzzwords: The First Question Every Team Must Answer Before Brainstorming',
];

// Slug for the detail test
const detailSlug = 'beyond-the-buzzwords';

// XSS post specifics
const xssTitle = 'XSS Test: Script Sanitization';
const xssSlug = 'xss-test';

// List View Test
// Asserts that the titles of the three published sample posts appear on the /blog page
test('Blog list view shows published sample posts', async ({ page }) => {
  await page.goto('/blog');
  await expect(page.getByRole('heading', { level: 1, name: /Strategic Insights Blog/i })).toBeVisible();

  // Ensure each known sample title appears (xss post may also appear but is not required here)
  for (const t of sampleTitles) {
    await expect(page.getByRole('heading', { level: 3, name: t })).toBeVisible();
  }
});

// Detail View Test
// Clicks a post from the list and validates the detail page renders title and body content
test('Blog detail view renders title and markdown content', async ({ page }) => {
  await page.goto('/blog');

  // Click the new article card link from the list view
  await page.locator(`a[href="/blog/${detailSlug}"]`).first().click();
  await expect(page).toHaveURL(new RegExp(`/blog/${detailSlug}$`));

  // Verify title and a few known body strings from the markdown
  await expect(page.getByRole('heading', { level: 1, name: 'Beyond the Buzzwords: The First Question Every Team Must Answer Before Brainstorming' })).toBeVisible();

  const article = page.locator('.prose');
  await expect(article).toContainText("The Innovator's Realization");
  await expect(article).toContainText('Formula 1 Driver');
  await expect(article).toContainText('3-Forces Competitive Map');
});

// Security Test
// Navigates directly to the XSS post and ensures the script tag is not rendered
// while the surrounding text is present
test('XSS post is sanitized: no script tag, surrounding text present', async ({ page }) => {
  await page.goto(`/blog/${xssSlug}`);

  await expect(page.getByRole('heading', { level: 1, name: xssTitle })).toBeVisible();

  const article = page.locator('.prose');
  // Ensure no script tags are rendered inside the article content
  await expect(article.locator('script')).toHaveCount(0);

  // Ensure surrounding text from the markdown appears (script content stripped)
  await expect(article).toContainText('Before the script tag');
  await expect(article).toContainText('after the script tag');
});
