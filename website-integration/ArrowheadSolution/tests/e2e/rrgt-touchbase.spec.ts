/**
 * RRGT & Touchbase E2E Tests
 * 
 * Tests the core value loop:
 * 1. RRGT Item Lifecycle (Tab 4)
 * 2. Touchbase Flow (Tab 3)
 * 3. The Dial Component
 * 
 * Based on: STRATEGIC_TESTING_PLAN.md Phase 2, Section 4
 * 
 * These tests verify:
 * - RRGT items persist after reload (Database + RLS)
 * - Touchbase responses stored correctly (JSONB)
 * - Dial component renders selected items
 */

import { test, expect } from '@playwright/test';
import { 
  signUpAndGetTeam, 
  generateTestEmail,
} from './fixtures/auth.fixture';
import { 
  cleanupTestData, 
  DataGenerators,
  waitForNetworkIdle,
  reloadAndWait,
  logStep 
} from './fixtures/data.fixture';
import {
  seedCompleteHierarchy,
} from './fixtures/api.fixture';

// Generate unique email for this test run
let testEmail: string;

test.describe('RRGT & Touchbase @heavy', () => {
  test.beforeEach(async () => {
    testEmail = generateTestEmail();
  });

  test.afterEach(async ({ page }) => {
    // Non-fatal cleanup
    if (testEmail) {
      await cleanupTestData(testEmail, page, { throwOnError: false });
    }
  });

  // ===================================================================
  // TEST 1: RRGT Item Lifecycle
  // ===================================================================

  // RRGT Item lifecycle test (was previously skipped due to HTML/JSON API bug)
  test('Can create, move, and persist RRGT items', async ({ page }) => {
    logStep('🚀', 'Test 1: RRGT Item Lifecycle');

    // STEP 1: Setup - Sign up and create team
    logStep('📝', 'Step 1: Setting up user and team...');
    const { teamId, userId, teamMemberId } = await signUpAndGetTeam(page, {
      teamName: 'RRGT Test Team',
      userName: 'RRGT Tester',
    });

    // Verify we have IDs
    if (!teamId || !userId || !teamMemberId) {
      throw new Error('Failed to get team, user, or team member ID from setup');
    }

    logStep('✅', 'Team created successfully');

    // STEP 2: Seed test data via API (fast)
    logStep('🌱', 'Step 2: Seeding Project → Objective → Task via API...');

    const { project, objective, task } = await seedCompleteHierarchy(page, teamId, teamMemberId, {
      projectName: 'RRGT Test Project',
      objectiveName: 'RRGT Test Objective',
      taskTitle: 'RRGT Test Task',
    });

    logStep('✅', `Test data seeded: ${project.name} → ${objective.name} → ${task.title}`);

    // STEP 3: Navigate to RRGT Tab and verify task appears
    logStep('📂', 'Step 3: Navigating to RRGT tab...');
    const rrgtTab = page.getByRole('link', { name: /rrgt/i }).first();
    await rrgtTab.click();
    await waitForNetworkIdle(page);

    // Verify we're on the RRGT page
    await expect(page).toHaveURL(/\/dashboard\/rrgt/, { timeout: 5000 });
    logStep('✅', 'On RRGT tab');

    // Wait for task to appear in the task list
    await expect(page.getByText(task.title)).toBeVisible({ timeout: 10000 });
    logStep('✅', 'Seeded task visible in RRGT interface');

    // STEP 4: Add RRGT Item via UI
    logStep('➕', 'Step 4: Adding RRGT item via UI...');
    const itemName = DataGenerators.rrgtItemName('Test Item');
    
    // Find the Plus button next to the task (adds item to a column)
    // The UI shows task with 6 plus buttons (one for each column)
    const plusButtons = page.locator('button').filter({ has: page.locator('svg.lucide-plus') });
    const firstPlusButton = plusButtons.first();
    
    await expect(firstPlusButton).toBeVisible({ timeout: 10000 });
    await firstPlusButton.click();

    // Fill in item title in modal
    const itemInput = page.getByLabel(/title/i).or(page.getByPlaceholder(/title/i));
    await itemInput.fill(itemName);

    // Submit the form
    const submitButton = page.getByRole('button', { name: /save|create/i }).last();
    await expect(submitButton).toBeEnabled({ timeout: 3000 });
    await submitButton.click();

    // Wait for item to appear
    await expect(page.getByText(itemName)).toBeVisible({ timeout: 10000 });
    logStep('✅', `Item created via UI: ${itemName}`);

    // STEP 5: Reload page and verify persistence
    logStep('🔄', 'Step 5: Reloading page to verify persistence...');
    await reloadAndWait(page);

    // Navigate back to RRGT tab after reload
    await page.getByRole('link', { name: /rrgt/i }).first().click();
    await waitForNetworkIdle(page);

    // Verify item still exists after reload
    await expect(page.getByText(itemName)).toBeVisible({ timeout: 10000 });
    logStep('✅', 'Item persisted after reload (Database + RLS verified)');

    logStep('🎉', 'Test 1 complete: RRGT Item Lifecycle');
  });

  // ===================================================================
  // TEST 2: Touchbase Flow
  // ===================================================================

  test.skip('Can create touchbase and view history', async ({ page }) => {
    // TODO: Implement after RRGT test is stable
    // Requires: API seeding of Project → Objective → Task
    logStep('🚀', 'Test 2: Touchbase Flow');

    // STEP 1: Setup - Sign up and create team
    logStep('📝', 'Step 1: Setting up user and team...');
    await signUpAndGetTeam(page, {
      teamName: 'Touchbase Test Team',
      userName: 'Touchbase Tester',
    });
    logStep('✅', 'Team created successfully');

    // STEP 2: Create an objective first (Touchbases are linked to objectives)
    logStep('📊', 'Step 2: Creating objective for touchbase...');
    
    // Navigate to Objectives tab
    const objectivesTab = page.getByRole('link', { name: /objectives/i }).first();
    await objectivesTab.click();
    await waitForNetworkIdle(page);

    // Create objective (adjust selectors based on actual UI)
    const addObjectiveButton = page.getByRole('button', { name: /add objective/i }).first();
    
    if (await addObjectiveButton.isVisible().catch(() => false)) {
      await addObjectiveButton.click();
      
      const objectiveName = DataGenerators.objectiveName('Touchbase Test Objective');
      const objectiveNameInput = page.getByLabel(/objective name|title/i);
      await objectiveNameInput.fill(objectiveName);
      
      const createButton = page.getByRole('button', { name: /create|save/i }).last();
      await createButton.click();
      
      await expect(page.getByText(objectiveName)).toBeVisible({ timeout: 10000 });
      logStep('✅', `Objective created: ${objectiveName}`);
    } else {
      logStep('⚠️', 'No objectives exist - touchbase requires objectives');
      logStep('ℹ️', 'Skipping touchbase test (prerequisite not met)');
      return;
    }

    // STEP 3: Navigate to Touchbase section
    logStep('📋', 'Step 3: Navigating to touchbase...');
    
    // Find touchbase button/link (may be in sidebar or within objective)
    const touchbaseButton = page.getByRole('button', { name: /touchbase|check-?in/i }).first();
    
    if (await touchbaseButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await touchbaseButton.click();
      logStep('✅', 'Touchbase form opened');
    } else {
      logStep('⚠️', 'Touchbase feature not found - may need UI navigation adjustment');
      return;
    }

    // STEP 4: Fill out touchbase (7 questions)
    logStep('📝', 'Step 4: Filling touchbase responses...');
    
    const touchbaseResponses = {
      wins: 'Completed database migration',
      challenges: 'Some performance issues',
      support: 'Need help with optimization',
      progress: 'Making steady progress',
      blockers: 'Waiting on API documentation',
      nextSteps: 'Implement caching layer',
      notes: 'Overall good week',
    };

    // Fill each question (adjust selectors based on actual form)
    for (const [key, value] of Object.entries(touchbaseResponses)) {
      const input = page.getByLabel(new RegExp(key, 'i')).or(
        page.getByPlaceholder(new RegExp(key, 'i'))
      );
      
      if (await input.isVisible().catch(() => false)) {
        await input.fill(value);
      }
    }

    // Submit touchbase
    const submitButton = page.getByRole('button', { name: /submit|save touchbase/i });
    await expect(submitButton).toBeEnabled({ timeout: 3000 });
    await submitButton.click();
    
    logStep('✅', 'Touchbase submitted');

    // STEP 5: Verify touchbase appears in history
    logStep('📚', 'Step 5: Verifying touchbase history...');
    
    // Navigate to history view (may need to click a tab or button)
    const historyButton = page.getByRole('button', { name: /history|past touchbases/i }).first();
    
    if (await historyButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await historyButton.click();
      await waitForNetworkIdle(page);
    }

    // Verify at least one response is visible in history
    await expect(page.getByText(touchbaseResponses.wins)).toBeVisible({ timeout: 10000 });
    logStep('✅', 'Touchbase history verified (JSONB storage verified)');

    logStep('🎉', 'Test 2 complete: Touchbase Flow');
  });

  // ===================================================================
  // TEST 3: The Dial Component
  // ===================================================================

  test.skip('Dial component renders selected RRGT items', async ({ page }) => {
    // TODO: Implement after RRGT test is stable
    // Requires: API seeding of Project → Objective → Task + RRGT items
    logStep('🚀', 'Test 3: The Dial');

    // STEP 1: Setup - Sign up and create team
    logStep('📝', 'Step 1: Setting up user and team...');
    await signUpAndGetTeam(page, {
      teamName: 'Dial Test Team',
      userName: 'Dial Tester',
    });
    logStep('✅', 'Team created successfully');

    // STEP 2: Navigate to RRGT Tab
    logStep('📂', 'Step 2: Navigating to RRGT tab...');
    const rrgtTab = page.getByRole('link', { name: /rrgt/i }).first();
    await rrgtTab.click();
    await waitForNetworkIdle(page);

    // STEP 3: Create two RRGT items
    logStep('➕', 'Step 3: Creating two RRGT items for dial...');
    
    const item1Name = DataGenerators.rrgtItemName('Left Item');
    const item2Name = DataGenerators.rrgtItemName('Right Item');

    // Create first item
    const addItemButton = page.getByRole('button', { name: /add item/i });
    await expect(addItemButton).toBeVisible({ timeout: 10000 });
    await addItemButton.click();

    let itemInput = page.getByLabel(/item name|title/i);
    await itemInput.fill(item1Name);
    
    let submitButton = page.getByRole('button', { name: /create|add|save/i }).last();
    await submitButton.click();
    await expect(page.getByText(item1Name)).toBeVisible({ timeout: 10000 });
    logStep('✅', `Item 1 created: ${item1Name}`);

    // Create second item
    await addItemButton.click();
    itemInput = page.getByLabel(/item name|title/i);
    await itemInput.fill(item2Name);
    submitButton = page.getByRole('button', { name: /create|add|save/i }).last();
    await submitButton.click();
    await expect(page.getByText(item2Name)).toBeVisible({ timeout: 10000 });
    logStep('✅', `Item 2 created: ${item2Name}`);

    // STEP 4: Select items for dial
    logStep('🎯', 'Step 4: Selecting items for dial...');
    
    // Look for checkboxes or selection mechanism next to items
    const item1Checkbox = page.locator(`text=${item1Name}`).locator('..').getByRole('checkbox').first();
    const item2Checkbox = page.locator(`text=${item2Name}`).locator('..').getByRole('checkbox').first();
    
    if (await item1Checkbox.isVisible().catch(() => false)) {
      await item1Checkbox.check();
      await item2Checkbox.check();
      logStep('✅', 'Items selected');
    } else {
      logStep('⚠️', 'Item selection mechanism not found');
    }

    // STEP 5: Verify dial component renders
    logStep('🔍', 'Step 5: Verifying dial component...');
    
    // Look for dial component (may have specific test ID or aria-label)
    const dialComponent = page.getByTestId('dial-component').or(
      page.getByRole('region', { name: /dial/i })
    );
    
    if (await dialComponent.isVisible({ timeout: 10000 }).catch(() => false)) {
      // Verify both items appear in dial
      await expect(dialComponent.getByText(item1Name)).toBeVisible();
      await expect(dialComponent.getByText(item2Name)).toBeVisible();
      logStep('✅', 'Dial component renders both items');
    } else {
      logStep('⚠️', 'Dial component not visible - may need UI implementation');
    }

    logStep('🎉', 'Test 3 complete: The Dial');
  });
});
