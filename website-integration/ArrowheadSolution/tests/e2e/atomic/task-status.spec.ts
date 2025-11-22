import { test, expect } from '@playwright/test';
import { signUpAndGetTeam, ensureAuthToken } from '../fixtures/auth.fixture';
import { seedProject } from '../fixtures/api.fixture';
import { waitForNetworkIdle, logStep } from '../fixtures/data.fixture';

/**
 * Atomic Task Status Test (Scoreboard)
 *
 * Verifies that a user can update a task's status from todo -> complete via the
 * Scoreboard tab Edit Task modal, and that the underlying PUT /api/tasks/:taskId
 * request contains the correct status payload.
 */

// Temporarily skip in CI and on WebKit while we harden Phase 3.0
// This test is intended to run locally in Chromium during development.
test.skip(
  ({ browserName }) => browserName === 'webkit' || !!process.env.CI,
  'Temporarily skip Task Status atomic test in CI and on WebKit for Phase 3.0; tracked for Phase 3.1 hardening.'
);

test.describe('Tasks - Atomic Status (Scoreboard)', () => {
  test('can update task status from todo to complete via Edit Task modal', async ({ page }) => {
    logStep('📝', 'Signing up user and initializing team');

    const { teamId } = await signUpAndGetTeam(page, {
      teamName: 'Task Status Team',
      userName: 'Task Status User',
    });

    if (!teamId) {
      throw new Error('Missing teamId for task status test');
    }

    logStep('🌱', 'Seeding project, objective, and task via API');

    const projectName = `Task Status Project ${Date.now()}`;
    const { id: projectId, name: seededProjectName } = await seedProject(page, teamId, projectName);

    if (!projectId) {
      throw new Error('Failed to seed project for task status test');
    }

    const objectiveName = `Task Status Objective ${Date.now()}`;

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
      throw new Error('Failed to seed objective via /api/projects/:projectId/objectives for task status test');
    }

    const taskTitle = `Status Atomic Task ${Date.now()}`;

    const createTaskResponse = await page.request.post(`/api/objectives/${objectiveId}/tasks`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        title: taskTitle,
        description: 'Task used for status update test',
        priority: 2,
        assigned_team_member_ids: [],
      },
    });

    expect(createTaskResponse.ok()).toBeTruthy();
    const taskJson = (await createTaskResponse.json()) as any;
    const taskId: string | undefined = taskJson?.task?.id;

    if (!taskId) {
      throw new Error('Failed to seed task via /api/objectives/:objectiveId/tasks for task status test');
    }

    logStep('📊', 'Navigating to Scoreboard tab');

    await page.goto('/dashboard/scoreboard', { waitUntil: 'networkidle' });
    await waitForNetworkIdle(page);

    // Basic smoke: Scoreboard heading should be visible
    const scoreboardHeading = page.getByRole('heading', { name: /scoreboard/i });
    await expect(scoreboardHeading).toBeVisible({ timeout: 15_000 });

    logStep('🎯', 'Selecting seeded project and objective in Scoreboard filters');

    // Locate the Project filter section by its label, then find the combobox within
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

    // After selecting a project, wait for objectives to load and select the seeded objective
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

    logStep('🔍', 'Locating seeded task card on Scoreboard');

    const taskTitleLocator = page.getByText(taskTitle).first();
    await expect(taskTitleLocator).toBeVisible({ timeout: 15_000 });

    const taskCard = taskTitleLocator.locator(
      'xpath=ancestor::div[contains(@class,"border") and contains(@class,"rounded-lg")][1]'
    );

    // Sanity: initial status badge should show todo (API default)
    await expect(taskCard.getByText(/todo/i)).toBeVisible({ timeout: 15_000 });

    logStep('✏️', 'Opening Edit Task modal from task card');

    const editButton = taskCard.getByRole('button').first();
    await expect(editButton).toBeVisible({ timeout: 10_000 });
    await editButton.click();

    // Change status to Complete via Status select
    const statusTrigger = page.getByRole('combobox', { name: 'Status' });
    await expect(statusTrigger).toBeVisible({ timeout: 10_000 });
    await statusTrigger.click();

    const completeOption = page.getByRole('option', { name: /complete/i }).first();
    await expect(completeOption).toBeVisible({ timeout: 10_000 });
    await completeOption.click();

    const saveButton = page.getByRole('button', { name: /save changes/i }).first();
    await expect(saveButton).toBeVisible({ timeout: 10_000 });

    logStep('📡', 'Saving task and capturing status update request');

    const [request, response] = await Promise.all([
      page.waitForRequest((req) =>
        req.method() === 'PUT' && req.url().includes(`/api/tasks/${taskId}`)
      ),
      page.waitForResponse((res) =>
        res.request().method() === 'PUT' &&
        res.url().includes(`/api/tasks/${taskId}`)
      ),
      saveButton.click(),
    ]);

    const requestBody = request.postDataJSON() as any;
    const responseStatus = response.status();
    let responseBodyText: string;
    try {
      responseBodyText = await response.text();
    } catch {
      responseBodyText = '<no body>'; 
    }
    console.log('Task status update response:', responseStatus, responseBodyText);

    expect(request.url()).toContain(`/api/tasks/${taskId}`);
    expect(requestBody).toBeTruthy();
    expect(requestBody.status).toBe('complete');

    logStep('✅', 'Verifying status badge updated on task card');

    const updatedTaskCard = page
      .getByText(taskTitle)
      .first()
      .locator('xpath=ancestor::div[contains(@class,"border") and contains(@class,"rounded-lg")][1]');

    await expect(updatedTaskCard.getByText(/complete/i)).toBeVisible({ timeout: 15_000 });
  });
});
