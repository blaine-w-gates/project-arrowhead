import { test, expect } from '@playwright/test';

/**
 * Journey Objectives Module E2E Tests
 * Tests the complete flow through all 7 Objectives steps
 * This is the final module before Tasks
 */

const OBJECTIVES_STEPS = [
  { step: 1, title: 'Objective', questionText: 'which objective would you like' },
  { step: 2, title: 'Delegation Steps', questionText: 'steps to accomplish the objective' },
  { step: 3, title: 'Business Services', questionText: 'additional business services' },
  { step: 4, title: 'Skills', questionText: 'skills are necessary' },
  { step: 5, title: 'Tools', questionText: 'additional tools are needed' },
  { step: 6, title: 'Contacts', questionText: 'who will you need to contact' },
  { step: 7, title: 'Cooperation', questionText: 'who will you need to cooperate' }
];

test.describe('Journey - Objectives Module Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate first for WebKit compatibility
    await page.goto('/journey/objectives/step/1');
    await page.evaluate(() => localStorage.clear());
  });

  test('completes full Objectives module flow (all 7 steps)', async ({ page }) => {
    await page.goto('/journey/objectives/step/1');
    await page.waitForLoadState('networkidle');

    for (const stepInfo of OBJECTIVES_STEPS) {
      console.log(`Testing Objectives Step ${stepInfo.step}: ${stepInfo.title}`);
      
      await expect(page.locator('h1')).toContainText(`Step ${stepInfo.step}`);
      await expect(page.locator('h1')).toContainText(stepInfo.title);
      await expect(page.locator('h2')).toContainText('Objectives Module');
      
      const testAnswer = `Test answer for Objectives step ${stepInfo.step}: ${stepInfo.title}. Detailed planning and resource allocation.`;
      await page.fill('textarea', testAnswer);
      await page.waitForTimeout(2500); // Auto-save
      
      await page.getByRole('button', { name: /Save Progress/ }).click();
      await page.waitForTimeout(1000);
      
      if (stepInfo.step < 7) {
        await page.getByRole('button', { name: 'Next Step' }).click();
        await page.waitForLoadState('networkidle');
      } else {
        await expect(page.getByRole('button', { name: 'Complete Module' })).toBeVisible();
        await expect(page.getByRole('button', { name: /Export.*Objectives/ })).toBeVisible();
        
        await page.getByRole('button', { name: 'Complete Module' }).click();
        await page.waitForURL(/\/tasks/, { timeout: 10000 });
      }
    }
    
    // Final module completes to tasks page
    await expect(page).toHaveURL(/\/tasks/);
  });

  test('Step 1 - Objective: defines primary goal', async ({ page }) => {
    await page.goto('/journey/objectives/step/1');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByRole('heading', { name: /Step 1.*Objective/ })).toBeVisible();
    await expect(page.getByText(/which objective would you like/i)).toBeVisible();
    
    await page.fill('textarea', 'Launch MVP by Q2 2026 with 100 beta users and 80% positive feedback score.');
    expect(await page.inputValue('textarea')).toContain('Launch MVP');
  });

  test('Step 2 - Delegation Steps: breaks down tasks', async ({ page }) => {
    await page.goto('/journey/objectives/step/2');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByRole('heading', { name: /Step 2.*Delegation/ })).toBeVisible();
    await page.fill('textarea', '1. Design wireframes, 2. Develop backend, 3. Build frontend, 4. QA testing, 5. Deploy.');
    
    expect(await page.inputValue('textarea')).toContain('wireframes');
  });

  test('Step 3 - Business Services: identifies required services', async ({ page }) => {
    await page.goto('/journey/objectives/step/3');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByRole('heading', { name: /Step 3.*Business Services/ })).toBeVisible();
    await page.fill('textarea', 'Legal: Contract review. Marketing: Launch campaign. IT: Cloud infrastructure (AWS).');
    
    expect(await page.inputValue('textarea')).toContain('Legal');
  });

  test('Step 4 - Skills: performs gap analysis', async ({ page }) => {
    await page.goto('/journey/objectives/step/4');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByRole('heading', { name: /Step 4.*Skills/ })).toBeVisible();
    await page.fill('textarea', 'Required: React, Node.js, PostgreSQL. Current: React (strong), Node.js (medium), PostgreSQL (need training).');
    
    expect(await page.inputValue('textarea')).toContain('PostgreSQL');
  });

  test('Step 5 - Tools: lists required software/hardware', async ({ page }) => {
    await page.goto('/journey/objectives/step/5');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByRole('heading', { name: /Step 5.*Tools/ })).toBeVisible();
    await page.fill('textarea', 'Tools: Figma (design), GitHub (code), Jira (PM), Slack (comms), DataDog (monitoring).');
    
    expect(await page.inputValue('textarea')).toContain('Figma');
  });

  test('Step 6 - Contacts: identifies key people', async ({ page }) => {
    await page.goto('/journey/objectives/step/6');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByRole('heading', { name: /Step 6.*Contacts/ })).toBeVisible();
    await page.fill('textarea', 'Jane Doe (Legal), John Smith (Vendor), Sarah Lee (Stakeholder), Mike Chen (SME).');
    
    expect(await page.inputValue('textarea')).toContain('Jane Doe');
  });

  test('Step 7 - Cooperation: defines collaboration needs', async ({ page }) => {
    await page.goto('/journey/objectives/step/7');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByRole('heading', { name: /Step 7.*Cooperation/ })).toBeVisible();
    await page.fill('textarea', 'Marketing team (launch), IT (infrastructure), Customer Success (onboarding), Sales (pilots).');
    
    expect(await page.inputValue('textarea')).toContain('Marketing');
  });

  test('navigation preserves data across Objectives steps', async ({ page }) => {
    await page.goto('/journey/objectives/step/1');
    await page.waitForLoadState('networkidle');
    
    const step1Data = 'Objectives step 1 data';
    await page.fill('textarea', step1Data);
    await page.waitForTimeout(2500);
    
    await page.getByRole('button', { name: 'Next Step' }).click();
    await page.waitForLoadState('networkidle');
    
    const step2Data = 'Objectives step 2 data';
    await page.fill('textarea', step2Data);
    await page.waitForTimeout(2500);
    
    await page.getByRole('button', { name: 'Previous Step' }).click();
    await page.waitForLoadState('networkidle');
    
    expect(await page.inputValue('textarea')).toBe(step1Data);
  });

  test('completing Objectives redirects to Tasks page', async ({ page }) => {
    await page.goto('/journey/objectives/step/7');
    await page.waitForLoadState('networkidle');
    
    await page.fill('textarea', 'Final cooperation plan');
    await page.waitForTimeout(2500);
    
    await page.getByRole('button', { name: 'Complete Module' }).click();
    
    // Should redirect to Tasks (final destination)
    await page.waitForURL(/\/tasks/, { timeout: 10000 });
  });

  test('export button visible only on step 7', async ({ page }) => {
    await page.goto('/journey/objectives/step/1');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /Export.*Objectives/ })).not.toBeVisible();
    
    await page.goto('/journey/objectives/step/7');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /Export/ })).toBeVisible();
  });

  test('step progress shows 7 total steps', async ({ page }) => {
    await page.goto('/journey/objectives/step/4');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByText('Step 4 of 7')).toBeVisible();
  });

  test('can navigate to any step directly via URL', async ({ page }) => {
    for (let step = 1; step <= 7; step++) {
      await page.goto(`/journey/objectives/step/${step}`);
      await page.waitForLoadState('networkidle');
      
      await expect(page.getByText(`Step ${step} of 7`)).toBeVisible();
    }
  });
});

test.describe('Journey - Objectives Module Completion', () => {
  test('objectives is the final module before tasks', async ({ page }) => {
    // Verify completion flow: Objectives → Tasks (not another module)
    await page.goto('/journey/objectives/step/7');
    await page.waitForLoadState('networkidle');
    
    await page.fill('textarea', 'Completion test');
    await page.waitForTimeout(2500);
    
    // Complete button should exist
    await expect(page.getByRole('button', { name: 'Complete Module' })).toBeVisible();
    
    // Click it
    await page.getByRole('button', { name: 'Complete Module' }).click();
    
    // Should NOT go to another journey module
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).not.toContain('/journey/brainstorm');
    expect(url).not.toContain('/journey/choose');
    
    // Should be at tasks page
    expect(url).toMatch(/\/tasks/);
  });
});
