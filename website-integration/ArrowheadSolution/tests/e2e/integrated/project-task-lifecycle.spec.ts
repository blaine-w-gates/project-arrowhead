import { test, expect } from '@playwright/test';
import { signUpAndGetTeam } from '../fixtures/auth.fixture';
import { waitForNetworkIdle, logStep } from '../fixtures/data.fixture';

/**
 * Integrated Project → Objective → Task Lifecycle Test
 *
 * Verifies the full dependency chain using modern fixtures and UI flows:
 * - Create Project via Projects tab UI
 * - Create Objective via Objectives tab UI
 * - Open Objective Journey wizard and verify lock lifecycle (POST + DELETE)
 * - Add Task for that Objective via Scoreboard tab (priority sent as number)
 * - Mark Task as complete via Edit Task modal (status update payload)
 */

test.skip(
  ({ browserName }) => browserName === 'webkit' || !!process.env.CI,
  'Temporarily skip integrated lifecycle test in CI and on WebKit for Phase 3.1; tracked for CI hardening.'
);

test.describe('Integrated Project→Objective→Task Lifecycle', () => {
  test('can create project, objective, add task, and complete task with proper locks and payloads', async ({ page }) => {
    logStep('📝', 'Signing up user and initializing team');

    const { teamId } = await signUpAndGetTeam(page, {
      teamName: 'Lifecycle Test Team',
      userName: 'Lifecycle Test User',
    });

    if (!teamId) {
      throw new Error('Missing teamId for integrated lifecycle test');
    }

    // =====================================================================
    // STEP 1: Create Project via Projects Tab UI
    // =====================================================================

    logStep('📂', 'Navigating to Projects tab');
    await page.goto('/dashboard/projects', { waitUntil: 'networkidle' });
    await waitForNetworkIdle(page);

    const projectName = `Lifecycle Project ${Date.now()}`;

    logStep('➕', 'Creating project via Add Project modal');

    const addProjectButton = page.getByRole('button', { name: /add project/i });
    await expect(addProjectButton).toBeVisible({ timeout: 10_000 });
    await addProjectButton.click();

    const projectNameInput = page.getByLabel(/project name/i);
    await expect(projectNameInput).toBeVisible({ timeout: 10_000 });
    await projectNameInput.fill(projectName);

    const createProjectButton = page.getByRole('button', { name: /create project/i }).last();
    await expect(createProjectButton).toBeVisible({ timeout: 10_000 });
    await createProjectButton.click();

    const projectTitle = page.getByText(projectName).first();
    await expect(projectTitle).toBeVisible({ timeout: 15_000 });

    logStep('✅', 'Project created and visible in Projects tab');

    // =====================================================================
    // STEP 2: Create Objective via Objectives Tab UI
    // =====================================================================

    logStep('🧭', 'Navigating to Objectives tab');

    const objectivesNav = page
      .getByRole('link', { name: /objectives/i })
      .or(page.getByRole('button', { name: /objectives/i }))
      .first();

    if (await objectivesNav.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await objectivesNav.click();
    } else {
      await page.goto('/dashboard/objectives', { waitUntil: 'networkidle' });
    }

    await waitForNetworkIdle(page);

    const objectivesHeading = page.getByRole('heading', { name: /objectives/i });
    await expect(objectivesHeading).toBeVisible({ timeout: 10_000 });

    logStep('🎯', 'Selecting lifecycle project in Objectives project selector');

    const projectSelectTrigger = page
      .getByText(/select a project/i)
      .locator('xpath=ancestor::button[1]');

    await expect(projectSelectTrigger).toBeVisible({ timeout: 10_000 });
    await projectSelectTrigger.click();

    const objectivesProjectOption = page.getByRole('option', { name: projectName }).first();
    await expect(objectivesProjectOption).toBeVisible({ timeout: 10_000 });
    await objectivesProjectOption.click();

    // Wait for Objectives card / Add Objective button
    const addObjectiveButton = page.getByRole('button', { name: /add objective/i });
    await expect(addObjectiveButton).toBeVisible({ timeout: 10_000 });

    logStep('🎯', 'Creating objective via Add Objective modal (Yes / I know my objective flow)');

    await addObjectiveButton.click();

    const addObjectiveTitle = page.getByRole('heading', { name: /new objective/i });
    await expect(addObjectiveTitle).toBeVisible({ timeout: 10_000 });

    // Choose "Yes, I know my objective" path
    const yesKnowObjectiveButton = page.getByRole('button', { name: /i know my objective/i }).first();
    await expect(yesKnowObjectiveButton).toBeVisible({ timeout: 10_000 });
    await yesKnowObjectiveButton.click();

    const objectiveDetailsTitle = page.getByRole('heading', { name: /create objective|start brainstorming/i });
    await expect(objectiveDetailsTitle).toBeVisible({ timeout: 10_000 });

    const objectiveName = `Lifecycle Objective ${Date.now()}`;

    const objectiveNameInput = page.getByLabel(/objective name \*/i).first();
    await expect(objectiveNameInput).toBeVisible({ timeout: 10_000 });
    await objectiveNameInput.fill(objectiveName);

    // Target date is optional; fill if field is present
    const targetDateInput = page.getByLabel(/target date/i).first();
    if (await targetDateInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      await targetDateInput.fill(futureDate.toISOString().split('T')[0]);
    }

    const createObjectiveButton = page
      .getByRole('button', { name: /create objective|start journey/i })
      .last();
    await expect(createObjectiveButton).toBeVisible({ timeout: 10_000 });
    await createObjectiveButton.click();

    // Wait for details modal to close and objective to appear in list
    await expect(objectiveDetailsTitle).not.toBeVisible({ timeout: 15_000 });

    const objectiveTitleLocator = page.getByText(objectiveName).first();
    await expect(objectiveTitleLocator).toBeVisible({ timeout: 15_000 });

    logStep('✅', 'Objective created and visible in Objectives list');

    // =====================================================================
    // STEP 3: Objective Journey Lock Lifecycle (POST + DELETE)
    // =====================================================================

    logStep('🔐', 'Opening Objective Journey wizard and verifying lock lifecycle');

    const objectiveCard = objectiveTitleLocator.locator(
      'xpath=ancestor::div[contains(@class,"rounded-lg") and contains(@class,"border")][1]'
    );

    const lockRequestPromise = page.waitForRequest((req) =>
      req.method() === 'POST' && /\/api\/objectives\/[^/]+\/lock$/.test(req.url())
    );
    const lockResponsePromise = page.waitForResponse((res) =>
      res.request().method() === 'POST' && /\/api\/objectives\/[^/]+\/lock$/.test(res.url())
    );

    // Use force to avoid dialog overlay intercepting pointer events; we still assert lock + wizard open
    await objectiveCard.click({ force: true });

    const lockRequest = await lockRequestPromise;
    const lockResponse = await lockResponsePromise;

    expect(lockResponse.ok()).toBeTruthy();

    const lockUrlMatch = lockRequest.url().match(/\/api\/objectives\/([^/]+)\/lock$/);
    const lockedObjectiveId = lockUrlMatch?.[1];
    if (!lockedObjectiveId) {
      throw new Error(`Could not extract objectiveId from lock URL: ${lockRequest.url()}`);
    }

    // For the "Yes, I know my objective" path, the journey should start at step 11 (Objectives module)
    const journeyStepLabel = page.getByText(/step 11 of 17/i);
    await expect(journeyStepLabel).toBeVisible({ timeout: 10_000 });

    // Click Next once and ensure the journey update payload is accepted (no validation crash)
    const updateJourneyRequestPromise = page.waitForRequest((req) =>
      req.method() === 'PUT' && req.url().includes(`/api/objectives/${lockedObjectiveId}`)
    );
    const updateJourneyResponsePromise = page.waitForResponse((res) =>
      res.request().method() === 'PUT' && res.url().includes(`/api/objectives/${lockedObjectiveId}`)
    );

    const nextButton = page.getByRole('button', { name: /^next$/i });
    await expect(nextButton).toBeVisible({ timeout: 10_000 });
    await nextButton.click();

    const updateJourneyRequest = await updateJourneyRequestPromise;
    const updateJourneyResponse = await updateJourneyResponsePromise;

    expect(updateJourneyResponse.ok()).toBeTruthy();
    const updateJourneyBody = updateJourneyRequest.postDataJSON() as any;
    expect(updateJourneyBody).toBeTruthy();
    expect(updateJourneyBody.current_step).toBe(12);

    const step12Label = page.getByText(/step 12 of 17/i);
    await expect(step12Label).toBeVisible({ timeout: 10_000 });

    logStep('✅', 'Objective Journey wizard opened at step 11 and advanced to step 12 with valid payload');

    // =====================================================================
    // STEP 3a: Add Task from within Journey Wizard (default Medium priority)
    // =====================================================================

    const wizardTaskTitle = `Wizard Task ${Date.now()}`;

    const wizardCreateTaskRequestPromise = page.waitForRequest((req) =>
      req.method() === 'POST' && req.url().includes(`/api/objectives/${lockedObjectiveId}/tasks`)
    );
    const wizardCreateTaskResponsePromise = page.waitForResponse((res) =>
      res.request().method() === 'POST' && res.url().includes(`/api/objectives/${lockedObjectiveId}/tasks`)
    );

    const wizardAddTaskButton = page.getByRole('button', { name: /^add task$/i }).first();
    await expect(wizardAddTaskButton).toBeVisible({ timeout: 10_000 });
    await wizardAddTaskButton.click();

    const wizardAddTaskHeading = page.getByRole('heading', { name: /create new task/i });
    await expect(wizardAddTaskHeading).toBeVisible({ timeout: 10_000 });

    const wizardTaskTitleInput = page
      .getByLabel(/title \*/i)
      .or(page.getByLabel(/task title/i))
      .first();
    await expect(wizardTaskTitleInput).toBeVisible({ timeout: 10_000 });
    await wizardTaskTitleInput.fill(wizardTaskTitle);

    const wizardDueDateInput = page.getByLabel(/due date/i).first();
    if (await wizardDueDateInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const wizardFutureDate = new Date();
      wizardFutureDate.setDate(wizardFutureDate.getDate() + 7);
      await wizardDueDateInput.fill(wizardFutureDate.toISOString().split('T')[0]);
    }

    const wizardCreateTaskButton = page.getByRole('button', { name: /create task/i }).first();
    await expect(wizardCreateTaskButton).toBeVisible({ timeout: 10_000 });
    await wizardCreateTaskButton.click();

    const wizardCreateTaskRequest = await wizardCreateTaskRequestPromise;
    const wizardCreateTaskResponse = await wizardCreateTaskResponsePromise;

    expect(wizardCreateTaskResponse.ok()).toBeTruthy();

    const wizardCreateTaskBody = wizardCreateTaskRequest.postDataJSON() as any;
    expect(wizardCreateTaskBody).toBeTruthy();
    expect(typeof wizardCreateTaskBody.priority).toBe('number');
    // Default Medium priority should map to numeric 2
    expect(wizardCreateTaskBody.priority).toBe(2);

    logStep('✅', 'Task created from within Journey wizard with valid payload');

    // Close wizard and verify DELETE /lock is called
    const unlockRequestPromise = page.waitForRequest((req) =>
      req.method() === 'DELETE' && req.url().includes(`/api/objectives/${lockedObjectiveId}/lock`)
    );
    const unlockResponsePromise = page.waitForResponse((res) =>
      res.request().method() === 'DELETE' && res.url().includes(`/api/objectives/${lockedObjectiveId}/lock`)
    );

    const closeWizardButton = page.getByRole('button', { name: /close/i }).last();
    await expect(closeWizardButton).toBeVisible({ timeout: 10_000 });
    await closeWizardButton.click();

    const unlockResponse = await unlockResponsePromise;
    await unlockRequestPromise;

    expect(unlockResponse.ok()).toBeTruthy();

    logStep('✅', 'Objective lock released when journey wizard closed');

    // =====================================================================
    // STEP 4: Add Task via Scoreboard (priority as number)
    // =====================================================================

    logStep('📊', 'Navigating to Scoreboard tab');

    const scoreboardNav = page
      .getByRole('link', { name: /scoreboard/i })
      .or(page.getByRole('button', { name: /scoreboard/i }))
      .first();

    if (await scoreboardNav.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await scoreboardNav.click();
    } else {
      await page.goto('/dashboard/scoreboard', { waitUntil: 'networkidle' });
    }

    await waitForNetworkIdle(page);

    const scoreboardHeading = page.getByRole('heading', { name: /scoreboard/i });
    await expect(scoreboardHeading).toBeVisible({ timeout: 15_000 });

    logStep('🎯', 'Selecting lifecycle project and objective in Scoreboard filters');

    const scoreboardProjectFilterSection = page
      .getByText(/^Project$/)
      .locator('xpath=ancestor::div[contains(@class,"space-y-2")][1]');
    const scoreboardProjectSelectTrigger = scoreboardProjectFilterSection.getByRole('combobox').first();

    await expect(scoreboardProjectSelectTrigger).toBeVisible({ timeout: 15_000 });
    await scoreboardProjectSelectTrigger.click();

    const scoreboardProjectOption = page.getByRole('option', { name: projectName }).first();
    await expect(scoreboardProjectOption).toBeVisible({ timeout: 10_000 });
    await scoreboardProjectOption.click();

    const scoreboardObjectiveFilterSection = page
      .getByText(/^Objective$/)
      .locator('xpath=ancestor::div[contains(@class,"space-y-2")][1]');
    const scoreboardObjectiveSelectTrigger = scoreboardObjectiveFilterSection.getByRole('combobox').first();

    await expect(scoreboardObjectiveSelectTrigger).toBeVisible({ timeout: 15_000 });
    await scoreboardObjectiveSelectTrigger.click();

    const scoreboardObjectiveOption = page.getByRole('option', { name: objectiveName }).first();
    await expect(scoreboardObjectiveOption).toBeVisible({ timeout: 10_000 });
    await scoreboardObjectiveOption.click();

    // Add Task
    const addTaskButton = page.getByRole('button', { name: /add task/i }).first();
    await expect(addTaskButton).toBeVisible({ timeout: 10_000 });

    logStep('➕', 'Opening Add Task modal and creating new task');

    await addTaskButton.click();

    const addTaskHeading = page.getByRole('heading', { name: /create new task/i });
    await expect(addTaskHeading).toBeVisible({ timeout: 10_000 });

    const taskTitle = `Lifecycle Task ${Date.now()}`;

    const taskTitleInput = page
      .getByLabel(/title \*/i)
      .or(page.getByLabel(/task title/i))
      .first();
    await expect(taskTitleInput).toBeVisible({ timeout: 10_000 });
    await taskTitleInput.fill(taskTitle);

    // Set priority to High via Priority select (maps to numeric 1 in API)
    const prioritySelect = page.getByRole('combobox', { name: /priority/i });
    await expect(prioritySelect).toBeVisible({ timeout: 10_000 });
    await prioritySelect.click();

    const highPriorityOption = page.getByRole('option', { name: /high/i }).first();
    await expect(highPriorityOption).toBeVisible({ timeout: 10_000 });
    await highPriorityOption.click();

    const createTaskButton = page.getByRole('button', { name: /create task/i }).first();
    await expect(createTaskButton).toBeVisible({ timeout: 10_000 });

    const createTaskRequestPromise = page.waitForRequest((req) =>
      req.method() === 'POST' && req.url().includes(`/api/objectives/${lockedObjectiveId}/tasks`)
    );
    const createTaskResponsePromise = page.waitForResponse((res) =>
      res.request().method() === 'POST' &&
      res.url().includes(`/api/objectives/${lockedObjectiveId}/tasks`)
    );

    await createTaskButton.click();

    const createTaskRequest = await createTaskRequestPromise;
    const createTaskResponse = await createTaskResponsePromise;

    expect(createTaskResponse.ok()).toBeTruthy();

    const createTaskBody = createTaskRequest.postDataJSON() as any;
    expect(createTaskBody).toBeTruthy();
    expect(typeof createTaskBody.priority).toBe('number');
    // High priority should map to numeric 1
    expect(createTaskBody.priority).toBe(1);

    const createTaskJson = (await createTaskResponse.json()) as any;
    const taskId: string | undefined = createTaskJson?.task?.id;
    if (!taskId) {
      throw new Error('Failed to retrieve created taskId from response');
    }

    logStep('✅', 'Task created with numeric priority payload');

    // Wait for task to appear in TaskList
    const taskTitleLocator = page.getByText(taskTitle).first();
    await expect(taskTitleLocator).toBeVisible({ timeout: 15_000 });

    // =====================================================================
    // STEP 5: Mark Task as Complete via Edit Task Modal
    // =====================================================================

    logStep('✏️', 'Opening Edit Task modal to mark task as complete');

    const taskCard = taskTitleLocator.locator(
      'xpath=ancestor::div[contains(@class,"border") and contains(@class,"rounded-lg")][1]'
    );

    // Initial status badge should show todo
    await expect(taskCard.getByText(/todo/i)).toBeVisible({ timeout: 15_000 });

    const editTaskButton = taskCard.getByRole('button').first();
    await expect(editTaskButton).toBeVisible({ timeout: 10_000 });
    await editTaskButton.click();

    const statusTrigger = page.getByRole('combobox', { name: 'Status' });
    await expect(statusTrigger).toBeVisible({ timeout: 10_000 });
    await statusTrigger.click();

    const completeOption = page.getByRole('option', { name: /complete/i }).first();
    await expect(completeOption).toBeVisible({ timeout: 10_000 });
    await completeOption.click();

    const saveChangesButton = page.getByRole('button', { name: /save changes/i }).first();
    await expect(saveChangesButton).toBeVisible({ timeout: 10_000 });

    const updateTaskRequestPromise = page.waitForRequest((req) =>
      req.method() === 'PUT' && req.url().includes(`/api/tasks/${taskId}`)
    );
    const updateTaskResponsePromise = page.waitForResponse((res) =>
      res.request().method() === 'PUT' && res.url().includes(`/api/tasks/${taskId}`)
    );

    await saveChangesButton.click();

    const updateTaskRequest = await updateTaskRequestPromise;
    const updateTaskResponse = await updateTaskResponsePromise;

    expect(updateTaskResponse.ok()).toBeTruthy();

    const updateBody = updateTaskRequest.postDataJSON() as any;
    expect(updateBody).toBeTruthy();
    expect(updateBody.status).toBe('complete');

    logStep('✅', 'Task status update payload verified');

    const updatedTaskCard = page
      .getByText(taskTitle)
      .first()
      .locator('xpath=ancestor::div[contains(@class,"border") and contains(@class,"rounded-lg")][1]');

    await expect(updatedTaskCard.getByText(/complete/i)).toBeVisible({ timeout: 15_000 });

    logStep('🎉', 'Integrated Project→Objective→Task lifecycle verified end-to-end');
  });
});
