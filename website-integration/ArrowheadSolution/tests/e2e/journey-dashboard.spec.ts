import { test, expect } from '@playwright/test';

/**
 * Journey Dashboard E2E Tests
 * Tests the main landing page with 3 path cards (Direction/Decision/Alignment)
 * This is the entry point to the journey system
 */

test.describe('Journey Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/journey');
    await page.waitForLoadState('networkidle');
  });

  test('displays Project Arrowhead hero section', async ({ page }) => {
    // Check main title
    await expect(page.getByRole('heading', { name: 'Project Arrowhead' })).toBeVisible();
    
    // Check tagline
    await expect(page.getByText('17 crucial questions for more better task lists')).toBeVisible();
  });

  test('displays HSE framework badges', async ({ page }) => {
    // Check for H-S-E badges
    await expect(page.getByText(/H - Headlights.*Strategy/)).toBeVisible();
    await expect(page.getByText(/S - Steering Wheel.*Tactical/)).toBeVisible();
    await expect(page.getByText(/E - Engine.*Execution/)).toBeVisible();
  });

  test('shows all three path cards', async ({ page }) => {
    // Direction path card
    await expect(page.getByRole('heading', { name: 'Direction' })).toBeVisible();
    await expect(page.getByText(/Explore the competitive landscape/)).toBeVisible();
    
    // Decision path card
    await expect(page.getByRole('heading', { name: 'Decision' })).toBeVisible();
    await expect(page.getByText(/Compare your options against clear/)).toBeVisible();
    
    // Alignment path card
    await expect(page.getByRole('heading', { name: 'Alignment' })).toBeVisible();
    await expect(page.getByText(/Transform your strategic decision/)).toBeVisible();
  });

  test('displays correct module names and question counts', async ({ page }) => {
    // Direction → Brainstorm (5 questions)
    await expect(page.getByText('Brainstorm')).toBeVisible();
    await expect(page.getByText('5 questions total').first()).toBeVisible();
    
    // Decision → Choose (5 questions)
    await expect(page.getByText('Choose')).toBeVisible();
    await expect(page.getByText('5 questions total').nth(1)).toBeVisible();
    
    // Alignment → Objectives (7 questions)
    await expect(page.getByText('Objectives')).toBeVisible();
    await expect(page.getByText('7 questions total')).toBeVisible();
  });

  test('Direction card navigates to Brainstorm step 1', async ({ page }) => {
    await page.getByRole('button', { name: 'Start Brainstorming' }).click();
    
    await page.waitForURL(/\/journey\/brainstorm\/step\/1/);
    await expect(page.locator('h2')).toContainText('Brainstorm Module');
  });

  test('Decision card navigates to Choose step 1', async ({ page }) => {
    await page.getByRole('button', { name: 'Make Decisions' }).click();
    
    await page.waitForURL(/\/journey\/choose\/step\/1/);
    await expect(page.locator('h2')).toContainText('Choose Module');
  });

  test('Alignment card navigates to Objectives step 1', async ({ page }) => {
    await page.getByRole('button', { name: 'Start Objectives' }).click();
    
    await page.waitForURL(/\/journey\/objectives\/step\/1/);
    await expect(page.locator('h2')).toContainText('Objectives Module');
  });

  test('displays Quick Actions section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Quick Actions' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'View All Tasks' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear Session' })).toBeVisible();
  });

  test('View All Tasks button navigates to tasks page', async ({ page }) => {
    await page.getByRole('button', { name: 'View All Tasks' }).click();
    
    await expect(page).toHaveURL(/\/tasks/);
  });

  test('Clear Session button shows confirmation modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Clear Session' }).click();
    
    // Modal should appear
    await expect(page.getByText('Clear Session Data')).toBeVisible();
    await expect(page.getByText(/Are you sure you want to clear all session data/)).toBeVisible();
    
    // Should have Cancel and Clear buttons
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear Session' }).nth(1)).toBeVisible();
  });

  test('Clear Session modal Cancel button closes modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Clear Session' }).click();
    await expect(page.getByText('Clear Session Data')).toBeVisible();
    
    await page.getByRole('button', { name: 'Cancel' }).click();
    
    // Modal should disappear
    await expect(page.getByText('Clear Session Data')).not.toBeVisible();
  });

  test('Clear Session modal Clear button clears localStorage and reloads', async ({ page }) => {
    // Set some test data in localStorage
    await page.evaluate(() => {
      localStorage.setItem('test_key', 'test_value');
    });
    
    // Verify data exists
    const beforeClear = await page.evaluate(() => localStorage.getItem('test_key'));
    expect(beforeClear).toBe('test_value');
    
    // Open modal and confirm clear
    await page.getByRole('button', { name: 'Clear Session' }).click();
    await page.getByRole('button', { name: 'Clear Session' }).nth(1).click();
    
    // Wait for page reload
    await page.waitForLoadState('networkidle');
    
    // Verify localStorage is cleared
    const afterClear = await page.evaluate(() => localStorage.getItem('test_key'));
    expect(afterClear).toBeNull();
  });

  test('path cards have correct icons', async ({ page }) => {
    // Direction/Brainstorm should have Lightbulb icon
    const directionCard = page.locator('text=Direction').locator('..').locator('..');
    await expect(directionCard.locator('[class*="lucide"]').first()).toBeVisible();
    
    // Decision/Choose should have CheckSquare icon
    const decisionCard = page.locator('text=Decision').locator('..').locator('..');
    await expect(decisionCard.locator('[class*="lucide"]').first()).toBeVisible();
    
    // Alignment/Objectives should have Target icon
    const alignmentCard = page.locator('text=Alignment').locator('..').locator('..');
    await expect(alignmentCard.locator('[class*="lucide"]').first()).toBeVisible();
  });

  test('path cards are clickable containers', async ({ page }) => {
    // Clicking anywhere on the card (not just button) should navigate
    const directionCard = page.locator('text=Direction').locator('..').locator('..').locator('..');
    
    // Click on the card title
    await page.getByRole('heading', { name: 'Direction' }).click();
    
    // Should navigate to Brainstorm
    await page.waitForURL(/\/journey\/brainstorm\/step\/1/, { timeout: 5000 });
  });

  test('cards have hover effects', async ({ page }) => {
    const directionCard = page.locator('text=Direction').locator('..').locator('..').locator('..');
    
    // Hover over card
    await directionCard.hover();
    
    // Card should have hover class (shadow-xl transition)
    const cardClasses = await directionCard.getAttribute('class');
    expect(cardClasses).toContain('hover:shadow-xl');
  });

  test('buttons have correct color themes', async ({ page }) => {
    // Direction/Brainstorm button should be yellow
    const brainstormButton = page.getByRole('button', { name: 'Start Brainstorming' });
    const brainstormClasses = await brainstormButton.getAttribute('class');
    expect(brainstormClasses).toContain('bg-yellow');
    
    // Decision/Choose button should be blue
    const chooseButton = page.getByRole('button', { name: 'Make Decisions' });
    const chooseClasses = await chooseButton.getAttribute('class');
    expect(chooseClasses).toContain('bg-blue');
    
    // Alignment/Objectives button should be green
    const objectivesButton = page.getByRole('button', { name: 'Start Objectives' });
    const objectivesClasses = await objectivesButton.getAttribute('class');
    expect(objectivesClasses).toContain('bg-green');
  });

  test('page is responsive and mobile-friendly', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // All cards should still be visible
    await expect(page.getByRole('heading', { name: 'Direction' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Decision' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Alignment' })).toBeVisible();
  });
});

test.describe('Journey Dashboard - Integration', () => {
  test('navigating from hub to dashboard and back', async ({ page }) => {
    // Start at new journey hub
    await page.goto('/journey');
    await page.waitForLoadState('networkidle');
    
    // If it loads the hub view (with stats cards), navigate to dashboard
    const hasStatsCards = await page.getByText('Modules Started').isVisible().catch(() => false);
    
    if (hasStatsCards) {
      // We're at the hub, need to check if dashboard route exists
      console.log('Currently at Journey Hub');
    }
    
    // Verify dashboard functionality
    await expect(page.getByRole('heading', { name: /Project Arrowhead|Your Journey/ })).toBeVisible();
  });

  test('preserves session across dashboard navigation', async ({ page }) => {
    // Start a module
    await page.goto('/journey');
    await page.waitForLoadState('networkidle');
    
    await page.getByRole('button', { name: 'Start Brainstorming' }).click();
    await page.waitForURL(/\/journey\/brainstorm\/step\/1/);
    
    // Fill some data
    await page.fill('textarea', 'Test session data');
    await page.waitForTimeout(2500);
    
    // Go back to dashboard
    await page.goto('/journey');
    await page.waitForLoadState('networkidle');
    
    // Session should persist (verified by localStorage)
    const hasSessionData = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      return keys.some(key => key.includes('journey_'));
    });
    
    expect(hasSessionData).toBe(true);
  });
});
