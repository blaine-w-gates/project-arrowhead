import { test, expect } from '@playwright/test';

/**
 * Journey Choose Module E2E Tests
 * Tests the complete flow through all 5 Choose steps
 */

const CHOOSE_STEPS = [
  { step: 1, title: 'Scenarios', questionText: 'scenarios are being considered' },
  { step: 2, title: 'Similarities/Differences', questionText: 'similarities and differences' },
  { step: 3, title: 'Criteria', questionText: 'more or less important' },
  { step: 4, title: 'Evaluation', questionText: 'Evaluate the differences' },
  { step: 5, title: 'Decision', questionText: 'statements that support your decision' }
];

test.describe('Journey - Choose Module Flow', () => {
  test.beforeEach(async ({ context }) => {
    // Clear localStorage before any page loads (WebKit compatible)
    await context.addInitScript(() => {
      localStorage.clear();
    });
  });

  test('completes full Choose module flow (all 5 steps)', async ({ page }) => {
    await page.goto('/journey/choose/step/1');
    await page.waitForLoadState('networkidle');

    for (const stepInfo of CHOOSE_STEPS) {
      console.log(`Testing Choose Step ${stepInfo.step}: ${stepInfo.title}`);
      
      await expect(page.locator('h1')).toContainText(`Step ${stepInfo.step}`);
      await expect(page.locator('h1')).toContainText(stepInfo.title);
      await expect(page.locator('h2')).toContainText('Choose Module');
      
      const testAnswer = `Test answer for Choose step ${stepInfo.step}: ${stepInfo.title}. Detailed evaluation and analysis for decision-making process.`;
      await page.fill('textarea', testAnswer);
      await page.waitForTimeout(2500); // Auto-save
      
      await page.getByRole('button', { name: /Save Progress/ }).click();
      await page.waitForTimeout(1000);
      
      if (stepInfo.step < 5) {
        await page.getByRole('button', { name: 'Next Step' }).click();
        await page.waitForLoadState('networkidle');
      } else {
        await expect(page.getByRole('button', { name: 'Complete Module' })).toBeVisible();
        await expect(page.getByRole('button', { name: /Export.*Choose/ })).toBeVisible();
        
        await page.getByRole('button', { name: 'Complete Module' }).click();
        await page.waitForURL(/\/journey\/objectives\/step\/1/);
      }
    }
    
    await expect(page).toHaveURL(/\/journey\/objectives\/step\/1/);
    await expect(page.locator('h2')).toContainText('Objectives Module');
  });

  test('Step 1 - Scenarios: defines decision options', async ({ page }) => {
    await page.goto('/journey/choose/step/1');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByRole('heading', { name: /Step 1.*Scenarios/ })).toBeVisible();
    await expect(page.getByText(/scenarios are being considered/i).first()).toBeVisible();
    
    await page.fill('textarea', 'Option A: Build in-house. Option B: Buy SaaS solution. Option C: Hybrid approach.');
    expect(await page.inputValue('textarea')).toContain('Build in-house');
  });

  test('Step 2 - Similarities/Differences: compares options', async ({ page }) => {
    await page.goto('/journey/choose/step/2');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByRole('heading', { name: /Step 2.*Similarities/ })).toBeVisible();
    await page.fill('textarea', 'Similarities: All require team training. Differences: Cost varies by 3x, time to market differs by 6 months.');
    
    expect(await page.inputValue('textarea')).toContain('Similarities');
  });

  test('Step 3 - Criteria: defines decision factors', async ({ page }) => {
    await page.goto('/journey/choose/step/3');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByRole('heading', { name: /Step 3.*Criteria/ })).toBeVisible();
    await page.fill('textarea', 'Criteria: 1. Cost (40%), 2. Time to market (30%), 3. Scalability (20%), 4. Team expertise (10%)');
    
    expect(await page.inputValue('textarea')).toContain('Cost');
  });

  test('Step 4 - Evaluation: scores options', async ({ page }) => {
    await page.goto('/journey/choose/step/4');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByRole('heading', { name: /Step 4.*Evaluation/ })).toBeVisible();
    await page.fill('textarea', 'Option A scores: Cost=Low, Time=Slow. Option B scores: Cost=High, Time=Fast. Winner: Option B.');
    
    expect(await page.inputValue('textarea')).toContain('scores');
  });

  test('Step 5 - Decision: documents final choice', async ({ page }) => {
    await page.goto('/journey/choose/step/5');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByRole('heading', { name: /Step 5.*Decision/ })).toBeVisible();
    await page.fill('textarea', 'Decision: Proceed with Option B. Rationale: Time to market is critical for competitive advantage.');
    
    expect(await page.inputValue('textarea')).toContain('Decision');
  });

  test('navigation preserves data across Choose steps', async ({ page }) => {
    await page.goto('/journey/choose/step/1');
    await page.waitForLoadState('networkidle');
    
    const step1Data = 'Choose step 1 data';
    await page.fill('textarea', step1Data);
    await page.waitForTimeout(2500);
    
    await page.getByRole('button', { name: 'Next Step' }).click();
    await page.waitForLoadState('networkidle');
    
    const step2Data = 'Choose step 2 data';
    await page.fill('textarea', step2Data);
    await page.waitForTimeout(2500);
    
    await page.getByRole('button', { name: 'Previous Step' }).click();
    await page.waitForLoadState('networkidle');
    
    expect(await page.inputValue('textarea')).toBe(step1Data);
  });

  test('completing Choose redirects to Objectives step 1', async ({ page }) => {
    await page.goto('/journey/choose/step/5');
    await page.waitForLoadState('networkidle');
    
    await page.fill('textarea', 'Final decision documented');
    await page.waitForTimeout(2500);
    
    await page.getByRole('button', { name: 'Complete Module' }).click();
    
    await page.waitForURL(/\/journey\/objectives\/step\/1/, { timeout: 10000 });
    await expect(page.locator('h2')).toContainText('Objectives Module');
  });

  test('export button visible only on step 5', async ({ page }) => {
    await page.goto('/journey/choose/step/1');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /Export.*Choose/ })).not.toBeVisible();
    
    await page.goto('/journey/choose/step/5');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /Export/ })).toBeVisible();
  });

  test('step progress shows 5 total steps', async ({ page }) => {
    await page.goto('/journey/choose/step/3');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByText('Step 3 of 5')).toBeVisible();
  });
});
