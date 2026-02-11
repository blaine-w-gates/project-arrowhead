import { test, expect } from '@playwright/test';

/**
 * Journey Hub E2E Tests
 * Tests the main journey dashboard/hub page
 */

test.describe('Journey Hub', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/journey');
  });

  test('displays journey hub heading', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Project Arrowhead');
  });

  test('shows all three journey paths', async ({ page }) => {
    // Check for Direction card
    await expect(page.getByRole('heading', { name: 'Direction' })).toBeVisible();
    
    // Check for Decision card
    await expect(page.getByRole('heading', { name: 'Decision' })).toBeVisible();
    
    // Check for Alignment card
    await expect(page.getByRole('heading', { name: 'Alignment' })).toBeVisible();
  });

  test('journey cards are clickable', async ({ page }) => {
    // Click on Direction card button
    await page.getByRole('button', { name: /Start Brainstorming/i }).click();
    
    // Should navigate to Brainstorm step 1
    await page.waitForURL(/\/journey\/brainstorm\/step\/1/, { timeout: 5000 });
  });

  test('displays path descriptions', async ({ page }) => {
    // Each path should have some description text
    const descriptions = page.locator('p');
    const count = await descriptions.count();
    
    // Should have at least 3 description paragraphs (one per path)
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('journey paths have proper visual styling', async ({ page }) => {
    // Check that the "Start Brainstorming" button exists and is visible
    const directionButton = page.getByRole('button', { name: /Start Brainstorming/i });
    
    // Button should be visible and have proper size
    await expect(directionButton).toBeVisible();
    const box = await directionButton.boundingBox();
    expect(box?.width).toBeGreaterThan(50); // Button should have reasonable width
    expect(box?.height).toBeGreaterThan(20); // Button should have reasonable height
  });
});
