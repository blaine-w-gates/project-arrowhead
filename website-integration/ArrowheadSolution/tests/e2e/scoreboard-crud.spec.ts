import { test, expect } from '@playwright/test';
import { signUpAndGetTeam, ensureAuthToken } from './fixtures/auth.fixture';
import { seedProject } from './fixtures/api.fixture';
import { waitForNetworkIdle, logStep } from './fixtures/data.fixture';

/**
 * Scoreboard CRUD E2E (Cache Invalidation Proof)
 *
 * Verifies that creating, editing, and deleting a task via the Scoreboard UI
 * updates the visible task list immediately without a manual page reload.
 *
 * Scenario:
 *  1. Sign up + initialize team
 *  2. Seed project and objective via API
 *  3. Navigate to Scoreboard and select seeded project/objective
 *  4. Create a task via Add Task modal and assert it appears
 *  5. Edit the task status to "In Progress" via Edit Task modal and assert
 *     the status badge updates in-place
 *  6. Delete the task via Edit Task modal and assert it disappears
 */

test.describe('Scoreboard - CRUD cache invalidation', () => {
  test('creates, edits, and deletes a task with instant UI updates', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Scoreboard CRUD proof runs only in local Chromium for now; tracked for cross-browser hardening.');

    logStep('📝', 'Signing up user and initializing team for Scoreboard CRUD test');

    const { teamId, email } = await signUpAndGetTeam(page, {
      teamName: 'Scoreboard CRUD Team',
      userName: 'Scoreboard CRUD User',
    });

    if (!teamId) {
      throw new Error('Missing teamId for Scoreboard CRUD test');
    }
    if (process.env.CI) {
      logStep('🔐', 'CI: Performing explicit UI login to verify session persistence');
      await page.goto('/signin', { waitUntil: 'networkidle' });
      // Check if already logged in (redirected to dashboard)
      if (!page.url().includes('/dashboard')) {
        await page.getByLabel(/email/i).fill(email);
        await page.getByLabel(/password/i).fill('TestPassword123!');
        await page.getByRole('button', { name: /sign in/i }).click();
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
      }
    }


    logStep('🌱', 'Seeding project and objective via API');

    const projectName = `Scoreboard CRUD Project ${Date.now()}`;
    const { id: projectId, name: seededProjectName } = await seedProject(page, teamId, projectName);

    if (!projectId) {
      throw new Error('Failed to seed project for Scoreboard CRUD test');
    }

    const objectiveName = `Scoreboard CRUD Objective ${Date.now()}`;

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
    const seededObjectiveName: string | undefined = objectiveJson?.objective?.name;

    if (!objectiveId || !seededObjectiveName) {
      throw new Error('Failed to seed objective via /api/projects/:projectId/objectives for Scoreboard CRUD test');
    }

    logStep('📊', 'Navigating to Scoreboard tab');

    await page.goto('/dashboard/scoreboard', { waitUntil: 'networkidle' });
    await waitForNetworkIdle(page);

    // Basic smoke: Scoreboard heading should be visible
    const scoreboardHeading = page.getByRole('heading', { name: /scoreboard/i });
    await expect(page).toHaveURL(new RegExp('/dashboard/scoreboard'), { timeout: 30_000 });
    await expect(scoreboardHeading).toBeVisible({ timeout: 30_000 });

    logStep('🎯', 'Selecting seeded project and objective in Scoreboard filters');

    // Select project
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

    // Select objective
    const objectiveFilterSection = page
      .getByText(/^Objective$/)
      .locator('xpath=ancestor::div[contains(@class,"space-y-2")][1]');

    const objectiveSelectTrigger = objectiveFilterSection.getByRole('combobox').first();

    await expect(objectiveSelectTrigger).toBeVisible({ timeout: 15_000 });
    await expect(objectiveSelectTrigger).toBeEnabled({ timeout: 15_000 });
    await objectiveSelectTrigger.click();

    const objectiveOption = page.getByRole('option', { name: seededObjectiveName }).first();
    await expect(objectiveOption).toBeVisible({ timeout: 10_000 });
    await objectiveOption.click();

    // ---------------------------------------------------------------------
    // STEP 1: CREATE TASK VIA SCOREBOARD UI
    // ---------------------------------------------------------------------

    logStep('➕', 'Opening Add Task modal and creating a new task');

    const addTaskButton = page.getByRole('button', { name: /add task/i }).first();
    await expect(addTaskButton).toBeVisible({ timeout: 10_000 });

    await addTaskButton.click();

    const taskTitle = `Scoreboard CRUD Task ${Date.now()}`;

    const titleInput = page.getByLabel(/title \*/i).or(page.getByLabel(/task title/i)).first();
    await expect(titleInput).toBeVisible({ timeout: 10_000 });
    await titleInput.fill(taskTitle);

    const createButton = page.getByRole('button', { name: /create task/i }).first();
    await expect(createButton).toBeVisible({ timeout: 10_000 });
    await createButton.click();

    logStep('✅', 'Verifying task appears on Scoreboard without reload');

    const taskTitleLocator = page.getByText(taskTitle).first();
    await expect(taskTitleLocator).toBeVisible({ timeout: 15_000 });

    // In the objective-scoped Scoreboard view, tasks are rendered as table rows
    const taskRow = page.getByRole('row', { name: new RegExp(taskTitle) }).first();
    await expect(taskRow).toBeVisible({ timeout: 15_000 });

    // ---------------------------------------------------------------------
    // STEP 2: EDIT TASK STATUS VIA EDIT TASK MODAL
    // ---------------------------------------------------------------------

    logStep('✏️', 'Opening Edit Task modal and changing status to In Progress');

    const editButton = taskRow.getByRole('button', { name: /edit task/i }).first();
    await expect(editButton).toBeVisible({ timeout: 10_000 });
    await editButton.click();

    // Locate the Status select trigger inside the Edit Task dialog by test id
    const editDialog = page.getByRole('dialog');
    await expect(editDialog).toBeVisible({ timeout: 10_000 });

    const statusTrigger = editDialog.getByTestId('edit-task-status-trigger');
    await expect(statusTrigger).toBeVisible({ timeout: 10_000 });
    await statusTrigger.click();

    const inProgressOption = page.getByRole('option', { name: /in progress/i }).first();
    await expect(inProgressOption).toBeVisible({ timeout: 10_000 });
    await inProgressOption.click();

    const saveButton = page.getByRole('button', { name: /save changes/i }).first();
    await expect(saveButton).toBeVisible({ timeout: 10_000 });
    await saveButton.click();

    logStep('🔄', 'Asserting status badge updates to In Progress without page reload');

    const updatedTaskRow = page.getByRole('row', { name: new RegExp(taskTitle) }).first();
    await expect(updatedTaskRow.getByText(/in progress/i)).toBeVisible({ timeout: 15_000 });

    // ---------------------------------------------------------------------
    // STEP 3: DELETE TASK VIA EDIT TASK MODAL
    // ---------------------------------------------------------------------

    logStep('🗑️', 'Deleting task via Edit Task modal and verifying it disappears');

    const editButtonAgain = updatedTaskRow.getByRole('button', { name: /edit task/i }).first();
    await expect(editButtonAgain).toBeVisible({ timeout: 10_000 });
    await editButtonAgain.click();

    const deleteTaskButton = page.getByRole('button', { name: /delete task/i }).first();
    await expect(deleteTaskButton).toBeVisible({ timeout: 10_000 });
    await deleteTaskButton.click();

    const confirmDeleteButton = page.getByRole('button', { name: /^delete$/i }).first();
    await expect(confirmDeleteButton).toBeVisible({ timeout: 10_000 });
    await confirmDeleteButton.click();

    logStep('✅', 'Asserting task row is removed from Scoreboard without manual reload');

    await expect(page.getByRole('row', { name: new RegExp(taskTitle) })).toHaveCount(0, { timeout: 15_000 });
  });
});
