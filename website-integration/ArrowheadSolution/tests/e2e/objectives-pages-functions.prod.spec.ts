import { test, expect } from '@playwright/test';

const PROD_BASE = process.env.PLAYWRIGHT_PROD_BASE_URL || 'https://project-arrowhead.pages.dev';
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || '';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || '';

// Only run against production Pages preview/site when creds provided
const SHOULD_RUN = !!TEST_EMAIL && !!TEST_PASSWORD && !!PROD_BASE && /^https?:\/\//.test(PROD_BASE);

test.describe('Objectives Cloudflare Functions - Prod smoke', () => {
  test.skip(!SHOULD_RUN, 'E2E_TEST_EMAIL/PASSWORD or PLAYWRIGHT_PROD_BASE_URL not configured');

  test.use({ baseURL: PROD_BASE });

  async function login(page: import('@playwright/test').Page) {
    await page.goto('/signin', { waitUntil: 'networkidle' });
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    const btn = page.getByRole('button', { name: /sign in/i });
    await expect(btn).toBeEnabled();
    await btn.click();
    await page.waitForURL(/\/dashboard\//, { timeout: 20000 });
  }

  test('List objectives and create objective via UI', async ({ page }) => {
    await login(page);

    // Navigate to Objectives tab
    const objectivesTab = page.getByRole('link', { name: /objectives/i });
    await objectivesTab.click();
    await expect(page).toHaveURL(/\/dashboard\/objectives/);

    // Select first project in dropdown if not already selected
    const selectTrigger = page.locator('[role="combobox"], [data-state][aria-haspopup="listbox"]').first();
    await selectTrigger.click();
    const firstOption = page.locator('[role="option"], [data-radix-collection-item]').first();
    await firstOption.click();

    // Expect Objectives header visible
    await expect(page.getByRole('heading', { name: /objectives/i })).toBeVisible();

    // Ensure no error alert "Failed to load objectives"
    await expect(page.getByText('Failed to load objectives', { exact: false })).toHaveCount(0);

    // Click Add Objective
    const addButton = page.getByRole('button', { name: /add objective/i });
    await addButton.click();

    // Choose "No" (brainstorm) path to ensure POST works regardless of name
    const noBtn = page.getByRole('button', { name: /^no$/i }).first();
    await noBtn.click();

    // Fill minimal details
    const nameInput = page.getByLabel(/objective name/i);
    await nameInput.fill(`E2E Objective ${Date.now()}`);

    const startBtn = page.getByRole('button', { name: /start journey|create objective/i }).last();
    await startBtn.click();

    // Modal closes and list refreshes
    await page.waitForTimeout(1000);

    // Validate an objective card rendered
    const cards = page.locator('article, [data-testid="objective-card"], .card');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);
  });
});
