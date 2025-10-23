import { test, expect } from '@playwright/test';

/**
 * Journey Hub E2E Tests
 * Tests the main journey dashboard showing all modules and progress
 */

test.describe('Journey Hub', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to journey dashboard
    await page.goto('/journey');
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('displays journey dashboard with header and description', async ({ page }) => {
    // Check main header
    await expect(page.locator('h1')).toContainText('Your Journey Dashboard');
    
    // Check description
    await expect(page.getByText('Navigate through structured modules')).toBeVisible();
  });

  test('shows all three journey modules', async ({ page }) => {
    // Wait for module cards to load
    await page.waitForSelector('[class*="Card"]', { timeout: 10000 });
    
    // Check Brainstorm module
    await expect(page.getByRole('heading', { name: 'Brainstorm' })).toBeVisible();
    await expect(page.getByText('Generate and capture creative ideas')).toBeVisible();
    
    // Check Choose module
    await expect(page.getByRole('heading', { name: 'Choose' })).toBeVisible();
    await expect(page.getByText('Evaluate and select the best options')).toBeVisible();
    
    // Check Objectives module
    await expect(page.getByRole('heading', { name: 'Objectives' })).toBeVisible();
    await expect(page.getByText('Set clear goals and success metrics')).toBeVisible();
  });

  test('displays quick stats cards', async ({ page }) => {
    // Check for stats cards
    await expect(page.getByText('Modules Started')).toBeVisible();
    await expect(page.getByText('In Progress')).toBeVisible();
    await expect(page.getByText('Completed')).toBeVisible();
  });

  test('shows correct step counts for each module', async ({ page }) => {
    // Brainstorm: 5 steps
    const brainstormCard = page.locator('text=Brainstorm').locator('..').locator('..');
    await expect(brainstormCard.getByText('Step')).toContainText('5');
    
    // Choose: 5 steps
    const chooseCard = page.locator('text=Choose').locator('..').locator('..');
    await expect(chooseCard.getByText('Step')).toContainText('5');
    
    // Objectives: 7 steps
    const objectivesCard = page.locator('text=Objectives').locator('..').locator('..');
    await expect(objectivesCard.getByText('Step')).toContainText('7');
  });

  test('displays status badges for modules', async ({ page }) => {
    // All modules should show "Not Started" initially
    const badges = page.locator('[class*="Badge"]');
    const badgeCount = await badges.count();
    
    expect(badgeCount).toBeGreaterThanOrEqual(3); // At least 3 module status badges
  });

  test('displays progress bars for each module', async ({ page }) => {
    // Check for progress sections
    await expect(page.getByText('Progress').first()).toBeVisible();
    
    // Progress bars should exist (multiple instances)
    const progressBars = page.locator('[class*="bg-gray-200"][class*="rounded-full"]');
    const count = await progressBars.count();
    expect(count).toBeGreaterThanOrEqual(3); // One per module
  });

  test('shows "Start Module" button for not-started modules', async ({ page }) => {
    // Should have Start Module buttons
    const startButtons = page.getByRole('button', { name: /Start Module|Continue/ });
    expect(await startButtons.count()).toBeGreaterThanOrEqual(1);
  });

  test('navigates to Brainstorm step 1 when clicking Start Module', async ({ page }) => {
    // Find and click Start Module button for Brainstorm
    const brainstormCard = page.locator('text=Brainstorm').locator('..').locator('..').locator('..');
    await brainstormCard.getByRole('button', { name: /Start Module|Continue/ }).click();
    
    // Should navigate to brainstorm step 1
    await expect(page).toHaveURL(/\/journey\/brainstorm\/step\/1/);
  });

  test('navigates to Choose step 1 when clicking Start Module', async ({ page }) => {
    // Find and click Start Module button for Choose
    const chooseCard = page.locator('text=Choose').locator('..').locator('..').locator('..');
    await chooseCard.getByRole('button', { name: /Start Module|Continue/ }).click();
    
    // Should navigate to choose step 1
    await expect(page).toHaveURL(/\/journey\/choose\/step\/1/);
  });

  test('navigates to Objectives step 1 when clicking Start Module', async ({ page }) => {
    // Find and click Start Module button for Objectives
    const objectivesCard = page.locator('text=Objectives').locator('..').locator('..').locator('..');
    await objectivesCard.getByRole('button', { name: /Start Module|Continue/ }).click();
    
    // Should navigate to objectives step 1
    await expect(page).toHaveURL(/\/journey\/objectives\/step\/1/);
  });

  test('displays Quick Actions sidebar', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Quick Actions' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'View All Tasks' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export Progress' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset Progress' })).toBeVisible();
  });

  test('View All Tasks button navigates to tasks page', async ({ page }) => {
    await page.getByRole('button', { name: 'View All Tasks' }).click();
    await expect(page).toHaveURL(/\/tasks/);
  });

  test('handles loading state gracefully', async ({ page }) => {
    // Clear localStorage to simulate fresh session
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    
    // Should show loading or content (not error)
    await page.waitForTimeout(500);
    
    // Either loading skeleton or actual content
    const hasLoadingOrContent = await page.evaluate(() => {
      const hasContent = document.querySelector('[class*="animate-pulse"]') !== null ||
                        document.querySelector('h1') !== null;
      return hasContent;
    });
    
    expect(hasLoadingOrContent).toBe(true);
  });

  test('module icons are visible', async ({ page }) => {
    // Check for module icons (Lightbulb, CheckSquare, Target)
    const icons = page.locator('[class*="w-5 h-5"], [class*="w-10 h-10"]');
    const iconCount = await icons.count();
    
    // Should have icons for modules and stats
    expect(iconCount).toBeGreaterThanOrEqual(6);
  });
});

test.describe('Journey Hub - Module Progress Tracking', () => {
  test('displays progress percentage', async ({ page }) => {
    await page.goto('/journey');
    await page.waitForLoadState('networkidle');
    
    // Progress percentages should be visible (0%, some %, or 100%)
    const progressTexts = page.locator('text=/\\d+%/');
    expect(await progressTexts.count()).toBeGreaterThanOrEqual(3);
  });

  test('shows last updated timestamp for started modules', async ({ page }) => {
    await page.goto('/journey');
    await page.waitForLoadState('networkidle');
    
    // Start a module first
    const brainstormCard = page.locator('text=Brainstorm').locator('..').locator('..').locator('..');
    await brainstormCard.getByRole('button').first().click();
    
    // Fill some data
    await page.fill('textarea', 'Test answer for tracking');
    
    // Go back to hub
    await page.goto('/journey');
    await page.waitForLoadState('networkidle');
    
    // Should show "Last updated" text
    await expect(page.getByText(/Last updated:/)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Journey Hub - Error Handling', () => {
  test('displays error message when API fails', async ({ page, context }) => {
    // Block API requests to simulate failure
    await context.route('**/api/journey/**', route => route.abort());
    
    await page.goto('/journey');
    await page.waitForTimeout(2000);
    
    // Should show error message or fallback UI
    const hasErrorOrLoading = await page.evaluate(() => {
      const errorText = document.body.textContent?.includes('Unable to Load') ||
                       document.body.textContent?.includes('Failed to load') ||
                       document.body.textContent?.includes('error');
      const hasLoading = document.querySelector('[class*="animate-pulse"]') !== null;
      return errorText || hasLoading;
    });
    
    expect(hasErrorOrLoading).toBe(true);
  });
});
