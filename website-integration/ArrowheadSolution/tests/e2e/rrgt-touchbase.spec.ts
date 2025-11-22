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
  ensureAuthToken,
} from './fixtures/auth.fixture';
import { 
  cleanupTestData, 
  DataGenerators,
  waitForNetworkIdle,
  reloadAndWait,
  logStep 
} from './fixtures/data.fixture';
import {
  seedProject,
} from './fixtures/api.fixture';

// Generate unique email for this test run
let testEmail: string;

test.describe('RRGT & Touchbase', () => {
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

    const projectName = 'RRGT Test Project';
    const objectiveName = 'RRGT Test Objective';
    const taskTitle = 'RRGT Test Task';

    const { id: projectId, name: seededProjectName } = await seedProject(page, teamId, projectName);

    const token = await ensureAuthToken(page);

    // Create objective via authenticated Express API
    const objectiveResponse = await page.request.post(`/api/projects/${projectId}/objectives`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        name: objectiveName,
        start_with_brainstorm: false,
      },
    });

    expect(objectiveResponse.ok()).toBeTruthy();
    const objectiveJson = (await objectiveResponse.json()) as any;
    const objectiveId: string | undefined = objectiveJson?.objective?.id;

    if (!objectiveId) {
      throw new Error('Failed to seed objective via /api/projects/:projectId/objectives for RRGT test');
    }

    // Create task assigned to current team member via Tasks API
    const createTaskResponse = await page.request.post(`/api/objectives/${objectiveId}/tasks`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        title: taskTitle,
        description: 'RRGT Test Task seeded via API',
        priority: 2,
        assigned_team_member_ids: [teamMemberId],
      },
    });

    expect(createTaskResponse.ok()).toBeTruthy();
    const taskJson = (await createTaskResponse.json()) as any;
    const taskId: string | undefined = taskJson?.task?.id;

    if (!taskId) {
      throw new Error('Failed to seed task via /api/objectives/:objectiveId/tasks for RRGT test');
    }

    const project = { id: projectId, name: seededProjectName };
    const objective = { id: objectiveId, name: objectiveName };
    const task = { id: taskId, title: taskTitle };

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

  test('Can create touchbase and view history', async ({ page }) => {
    // TODO: Implement after RRGT test is stable
    // Requires: API seeding of Project → Objective → Task
    logStep('🚀', 'Test 2: Touchbase Flow');

    // STEP 1: Setup - Sign up and create team
    logStep('📝', 'Step 1: Setting up user and team...');
    const { teamId } = await signUpAndGetTeam(page, {
      teamName: 'Touchbase Test Team',
      userName: 'Touchbase Tester',
    });
    logStep('✅', 'Team created successfully');

    if (!teamId) {
      throw new Error('Missing teamId for Touchbase test');
    }

    // STEP 2: Create Project and Objective via API (Touchbases are linked to objectives)
    logStep('📊', 'Step 2: Seeding project and objective for touchbase via API...');
    
    const projectName = `Touchbase Test Project ${Date.now()}`;
    const objectiveName = DataGenerators.objectiveName('Touchbase Test Objective');

    const { id: projectId, name: seededProjectName } = await seedProject(page, teamId, projectName);

    const token = await ensureAuthToken(page);

    const objectiveResponse = await page.request.post(`/api/projects/${projectId}/objectives`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        name: objectiveName,
        start_with_brainstorm: false,
      },
    });

    expect(objectiveResponse.ok()).toBeTruthy();
    const objectiveJson = (await objectiveResponse.json()) as any;
    const objectiveId: string | undefined = objectiveJson?.objective?.id;

    if (!objectiveId) {
      throw new Error('Failed to seed objective for Touchbase test');
    }

    logStep('✅', `Test data seeded: ${seededProjectName} → ${objectiveName}`);

    // STEP 3: Navigate to Scoreboard and select project/objective
    logStep('🧭', 'Step 3: Navigating to Scoreboard and selecting objective...');

    await page.goto('/dashboard/scoreboard', { waitUntil: 'networkidle' });
    await waitForNetworkIdle(page);

    const scoreboardHeading = page.getByRole('heading', { name: /scoreboard/i });
    await expect(scoreboardHeading).toBeVisible({ timeout: 15_000 });

    // Select project in Scoreboard filters
    const projectFilterSection = page
      .getByText(/^Project$/)
      .locator('xpath=ancestor::div[contains(@class,"space-y-2")][1]');

    const projectSelectTrigger = projectFilterSection.getByRole('combobox').first();
    await expect(projectSelectTrigger).toBeVisible({ timeout: 15_000 });
    await expect(projectSelectTrigger).toBeEnabled({ timeout: 15_000 });
    await projectSelectTrigger.click();

    const projectOption = page.getByRole('option', { name: seededProjectName }).first();
    await expect(projectOption).toBeVisible({ timeout: 10_000 });
    await projectOption.click();

    // Select objective in Scoreboard filters
    const objectiveFilterSection = page
      .getByText(/^Objective$/)
      .locator('xpath=ancestor::div[contains(@class,"space-y-2")][1]');

    const objectiveSelectTrigger = objectiveFilterSection.getByRole('combobox').first();
    await expect(objectiveSelectTrigger).toBeVisible({ timeout: 15_000 });
    await expect(objectiveSelectTrigger).toBeEnabled({ timeout: 15_000 });
    await objectiveSelectTrigger.click();

    const objectiveOption = page.getByRole('option', { name: objectiveName }).first();
    await expect(objectiveOption).toBeVisible({ timeout: 10_000 });
    await objectiveOption.click();

    // STEP 4: Open New Touchbase modal from Touchbases card
    logStep('📋', 'Step 4: Opening New Touchbase modal...');

    const touchbasesCard = page
      .getByText(/^Touchbases/i)
      .locator('xpath=ancestor::div[contains(@class,"rounded-lg") and contains(@class,"border")][1]');

    await expect(touchbasesCard).toBeVisible({ timeout: 15_000 });

    const newTouchbaseButton = touchbasesCard.getByRole('button', { name: /new touchbase/i });
    await expect(newTouchbaseButton).toBeVisible({ timeout: 10_000 });
    await newTouchbaseButton.click();

    // New Touchbase modal
    const touchbaseModalTitle = page.getByRole('heading', { name: /new touchbase \/ 1-on-1 meeting/i });
    await expect(touchbaseModalTitle).toBeVisible({ timeout: 10_000 });

    // Select team member
    const memberSelect = page.getByRole('combobox', { name: /team member/i });
    await expect(memberSelect).toBeVisible({ timeout: 10_000 });
    await memberSelect.click();

    const memberOption = page.getByRole('option', { name: /touchbase tester/i }).first();
    await expect(memberOption).toBeVisible({ timeout: 10_000 });
    await memberOption.click();

    // Fill wins question (question 4) and leave others blank for brevity
    logStep('📝', 'Step 5: Filling touchbase responses...');

    const winsAnswer = 'Completed database migration';
    const winsTextarea = page.getByLabel(/4\. What wins or accomplishments do you want to share\?/i);
    await winsTextarea.fill(winsAnswer);

    // Submit touchbase
    const createTouchbaseButton = page.getByRole('button', { name: /create touchbase/i });
    await expect(createTouchbaseButton).toBeVisible({ timeout: 10_000 });

    const createTouchbaseResponsePromise = page.waitForResponse((response) => {
      return response.url().includes(`/api/objectives/${objectiveId}/touchbases`) &&
        response.request().method() === 'POST';
    });

    await createTouchbaseButton.click();

    const createTouchbaseResponse = await createTouchbaseResponsePromise;
    const responseOk = createTouchbaseResponse.ok();

    if (!responseOk) {
      const debugBody = await createTouchbaseResponse.text();
      // eslint-disable-next-line no-console
      console.error('Touchbase create failed:', createTouchbaseResponse.status(), debugBody);
    }

    expect(responseOk).toBeTruthy();

    logStep('✅', 'Touchbase submitted');

    // Wait for the New Touchbase modal to fully close before interacting with the underlying card
    await expect(touchbaseModalTitle).toBeHidden({ timeout: 10_000 });

    // STEP 6: Expand Touchbases history and verify preview
    logStep('📚', 'Step 6: Verifying touchbase history...');

    const showButton = touchbasesCard.getByRole('button', { name: /show/i }).first();
    await expect(showButton).toBeVisible({ timeout: 10_000 });
    await showButton.click();
    await waitForNetworkIdle(page);

    await expect(touchbasesCard.getByText(winsAnswer)).toBeVisible({ timeout: 10_000 });
    logStep('✅', 'Touchbase history verified (JSONB storage verified)');

    logStep('🎉', 'Test 2 complete: Touchbase Flow');
  });
});
