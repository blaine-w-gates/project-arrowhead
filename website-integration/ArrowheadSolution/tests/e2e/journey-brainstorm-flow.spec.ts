import { test, expect } from '@playwright/test';

/**
 * Journey Brainstorm Module E2E Tests
 * Tests the complete flow through all 5 Brainstorm steps
 * Tests data persistence, navigation, and module completion
 */

const BRAINSTORM_STEPS = [
  { step: 1, title: 'Imitate / Trends', questionText: 'How are others doing it' },
  { step: 2, title: 'Ideate', questionText: 'think outside the box' },
  { step: 3, title: 'Ignore', questionText: "didn't work, won't work" },
  { step: 4, title: 'Integrate', questionText: 'shorten the distance' },
  { step: 5, title: 'Interfere', questionText: 'slow down competitors' }
];

test.describe('Journey - Brainstorm Module Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh session - navigate first for WebKit compatibility
    await page.goto('/journey/brainstorm/step/1');
    await page.evaluate(() => localStorage.clear());
  });

  test('completes full Brainstorm module flow (all 5 steps)', async ({ page }) => {
    // Start at step 1
    await page.goto('/journey/brainstorm/step/1');
    await page.waitForLoadState('networkidle');

    // Iterate through all 5 steps
    for (const stepInfo of BRAINSTORM_STEPS) {
      console.log(`Testing Brainstorm Step ${stepInfo.step}: ${stepInfo.title}`);
      
      // Verify step title
      await expect(page.locator('h1')).toContainText(`Step ${stepInfo.step}`);
      await expect(page.locator('h1')).toContainText(stepInfo.title);
      
      // Verify module name
      await expect(page.locator('h2')).toContainText('Brainstorm Module');
      
      // Fill the textarea with test data
      const testAnswer = `Test answer for Brainstorm step ${stepInfo.step}: ${stepInfo.title}. This is a comprehensive response that includes multiple sentences to demonstrate proper data persistence and handling of longer text inputs.`;
      await page.fill('textarea', testAnswer);
      
      // Wait for auto-save (2 second debounce)
      await page.waitForTimeout(2500);
      
      // Verify Save Progress button exists
      await expect(page.getByRole('button', { name: /Save Progress/ })).toBeVisible();
      
      // Click save manually to ensure data is persisted
      await page.getByRole('button', { name: /Save Progress/ }).click();
      
      // Wait for save confirmation
      await page.waitForTimeout(1000);
      
      // Navigate to next step (or complete module on final step)
      if (stepInfo.step < 5) {
        await page.getByRole('button', { name: 'Next Step' }).click();
        await page.waitForLoadState('networkidle');
      } else {
        // On final step, should see Complete Module button
        await expect(page.getByRole('button', { name: 'Complete Module' })).toBeVisible();
        
        // Also check for Export button
        await expect(page.getByRole('button', { name: /Export Brainstorm/ })).toBeVisible();
        
        // Complete the module
        await page.getByRole('button', { name: 'Complete Module' }).click();
        
        // Should redirect to Choose step 1
        await page.waitForURL(/\/journey\/choose\/step\/1/);
      }
    }
    
    // Verify we ended up at Choose step 1
    await expect(page).toHaveURL(/\/journey\/choose\/step\/1/);
    await expect(page.locator('h2')).toContainText('Choose Module');
  });

  test('Step 1 - Imitate/Trends: form renders and accepts input', async ({ page }) => {
    await page.goto('/journey/brainstorm/step/1');
    await page.waitForLoadState('networkidle');
    
    // Check step title
    await expect(page.getByRole('heading', { name: /Step 1.*Imitate.*Trends/ })).toBeVisible();
    
    // Check instructions card
    await expect(page.getByRole('heading', { name: 'Step Instructions' })).toBeVisible();
    await expect(page.getByText(/understanding the landscape/i)).toBeVisible();
    
    // Check question text
    await expect(page.getByText(/How are others doing it/)).toBeVisible();
    
    // Fill textarea
    await page.fill('textarea', 'Competitor X is using AI-powered recommendations. Industry trends show focus on mobile-first design.');
    
    // Verify data is in textarea
    expect(await page.inputValue('textarea')).toContain('AI-powered recommendations');
  });

  test('Step 2 - Ideate: accepts creative ideas', async ({ page }) => {
    await page.goto('/journey/brainstorm/step/2');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByRole('heading', { name: /Step 2.*Ideate/ })).toBeVisible();
    await expect(page.getByText(/think outside the box/i)).toBeVisible();
    
    await page.fill('textarea', 'Idea 1: Gamification with leaderboards. Idea 2: Social sharing features. Idea 3: AI-generated insights.');
    
    expect(await page.inputValue('textarea')).toContain('Gamification');
  });

  test('Step 3 - Ignore: accepts anti-patterns', async ({ page }) => {
    await page.goto('/journey/brainstorm/step/3');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByRole('heading', { name: /Step 3.*Ignore/ })).toBeVisible();
    await expect(page.getByText(/didn't work.*won't work/i)).toBeVisible();
    
    await page.fill('textarea', 'Avoid: Over-complicated UI. Failed approach: Email-only login (too restrictive). Waste of time: Building custom analytics when tools exist.');
    
    expect(await page.inputValue('textarea')).toContain('Over-complicated UI');
  });

  test('Step 4 - Integrate: accepts integration ideas', async ({ page }) => {
    await page.goto('/journey/brainstorm/step/4');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByRole('heading', { name: /Step 4.*Integrate/ })).toBeVisible();
    await expect(page.getByText(/shorten the distance/i)).toBeVisible();
    
    await page.fill('textarea', 'Combine: Stripe checkout + automated onboarding emails. Integration: CRM data with customer support ticketing.');
    
    expect(await page.inputValue('textarea')).toContain('Stripe checkout');
  });

  test('Step 5 - Interfere: accepts competitive moat strategies', async ({ page }) => {
    await page.goto('/journey/brainstorm/step/5');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByRole('heading', { name: /Step 5.*Interfere/ })).toBeVisible();
    await expect(page.getByText(/slow down competitors/i)).toBeVisible();
    
    await page.fill('textarea', 'Strategy: Build exclusive partnerships with key vendors. Moat: Proprietary data model. Lock-in: Enterprise contracts with high switching costs.');
    
    expect(await page.inputValue('textarea')).toContain('exclusive partnerships');
  });

  test('navigation between steps preserves data', async ({ page }) => {
    await page.goto('/journey/brainstorm/step/1');
    await page.waitForLoadState('networkidle');
    
    // Fill step 1
    const step1Data = 'Step 1 test data for persistence';
    await page.fill('textarea', step1Data);
    await page.waitForTimeout(2500); // Wait for auto-save
    
    // Navigate to step 2
    await page.getByRole('button', { name: 'Next Step' }).click();
    await page.waitForLoadState('networkidle');
    
    // Fill step 2
    const step2Data = 'Step 2 test data for persistence';
    await page.fill('textarea', step2Data);
    await page.waitForTimeout(2500);
    
    // Navigate back to step 1
    await page.getByRole('button', { name: 'Previous Step' }).click();
    await page.waitForLoadState('networkidle');
    
    // Verify step 1 data is preserved
    expect(await page.inputValue('textarea')).toBe(step1Data);
    
    // Navigate forward to step 2 again
    await page.getByRole('button', { name: 'Next Step' }).click();
    await page.waitForLoadState('networkidle');
    
    // Verify step 2 data is preserved
    expect(await page.inputValue('textarea')).toBe(step2Data);
  });

  test('auto-save triggers after 2 seconds of inactivity', async ({ page }) => {
    await page.goto('/journey/brainstorm/step/1');
    await page.waitForLoadState('networkidle');
    
    // Fill textarea
    await page.fill('textarea', 'Auto-save test data');
    
    // Should not show "Last saved" immediately
    await page.waitForTimeout(500);
    
    // Wait for auto-save (2 second debounce)
    await page.waitForTimeout(2000);
    
    // Should show "Last saved" text
    await expect(page.getByText(/Last saved:/)).toBeVisible({ timeout: 5000 });
  });

  test('manual save button works', async ({ page }) => {
    await page.goto('/journey/brainstorm/step/1');
    await page.waitForLoadState('networkidle');
    
    await page.fill('textarea', 'Manual save test');
    
    // Click Save Progress
    await page.getByRole('button', { name: /Save Progress/ }).click();
    
    // Should show saving state
    await expect(page.getByRole('button', { name: /Saving/ })).toBeVisible({ timeout: 2000 });
    
    // Then show success
    await expect(page.getByText(/Last saved:/)).toBeVisible({ timeout: 5000 });
  });

  test('step progress indicator shows correct current step', async ({ page }) => {
    await page.goto('/journey/brainstorm/step/3');
    await page.waitForLoadState('networkidle');
    
    // Should show "Step 3 of 5"
    await expect(page.getByText('Step 3 of 5')).toBeVisible();
  });

  test('previous button on step 1 goes to journey home', async ({ page }) => {
    await page.goto('/journey/brainstorm/step/1');
    await page.waitForLoadState('networkidle');
    
    await page.getByRole('button', { name: /Previous Step|Home/ }).click();
    
    // Should navigate to journey dashboard
    await expect(page).toHaveURL(/\/journey\/?$/);
  });

  test('add task button opens modal', async ({ page }) => {
    await page.goto('/journey/brainstorm/step/1');
    await page.waitForLoadState('networkidle');
    
    // Click Add button in sidebar
    await page.getByRole('button', { name: 'Add' }).click();
    
    // Modal should open
    await expect(page.getByText(/Add New Task|Task/)).toBeVisible({ timeout: 2000 });
  });

  test('export button appears only on final step', async ({ page }) => {
    // Step 1 should NOT have export button
    await page.goto('/journey/brainstorm/step/1');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /Export Brainstorm/ })).not.toBeVisible();
    
    // Step 5 SHOULD have export button
    await page.goto('/journey/brainstorm/step/5');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /Export Brainstorm/ })).toBeVisible();
  });

  test('complete module button appears only on final step', async ({ page }) => {
    // Step 1 should NOT have Complete Module button
    await page.goto('/journey/brainstorm/step/1');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Complete Module' })).not.toBeVisible();
    
    // Step 5 SHOULD have Complete Module button
    await page.goto('/journey/brainstorm/step/5');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Complete Module' })).toBeVisible();
  });

  test('handles direct URL navigation to specific step', async ({ page }) => {
    // Navigate directly to step 3
    await page.goto('/journey/brainstorm/step/3');
    await page.waitForLoadState('networkidle');
    
    // Should render step 3
    await expect(page.getByRole('heading', { name: /Step 3.*Ignore/ })).toBeVisible();
    await expect(page.getByText('Step 3 of 5')).toBeVisible();
  });

  test('handles invalid step number gracefully', async ({ page }) => {
    // Try to navigate to step 99
    await page.goto('/journey/brainstorm/step/99');
    await page.waitForLoadState('networkidle');
    
    // Should show error or redirect
    const url = page.url();
    const hasError = await page.getByText(/not found|error/i).isVisible().catch(() => false);
    
    // Either shows error or redirects to valid page
    expect(hasError || !url.includes('/step/99')).toBe(true);
  });
});

test.describe('Journey - Brainstorm Module Completion', () => {
  test('completing brainstorm redirects to Choose step 1', async ({ page }) => {
    // Go to final brainstorm step
    await page.goto('/journey/brainstorm/step/5');
    await page.waitForLoadState('networkidle');
    
    // Fill some data
    await page.fill('textarea', 'Final step completion test');
    await page.waitForTimeout(2500);
    
    // Click Complete Module
    await page.getByRole('button', { name: 'Complete Module' }).click();
    
    // Should redirect to Choose step 1
    await page.waitForURL(/\/journey\/choose\/step\/1/, { timeout: 10000 });
    await expect(page.locator('h2')).toContainText('Choose Module');
  });
});
