import { test, expect } from '@playwright/test';
import { signUpAndGetTeam, ensureAuthToken } from '../fixtures/auth.fixture';
import { seedProject } from '../fixtures/api.fixture';
import { waitForNetworkIdle, logStep } from '../fixtures/data.fixture';

/**
 * Atomic Task Assignment Test (Scoreboard)
 *
 * Verifies that a user can create a task and assign it to themselves via the
 * Scoreboard tab, and that the underlying POST /api/objectives/:objectiveId/tasks
 * request contains the correct assigned_team_member_ids payload.
 */

// Temporarily skip in CI and on WebKit while we harden Phase 3.0
// This test is intended to run locally in Chromium during development.
// Mirrors T-3.1 but adds assignment-specific assertions.
test.skip(
  ({ browserName }) => browserName === 'webkit' || !!process.env.CI,
  'Temporarily skip Task Assignment atomic test in CI and on WebKit for Phase 3.0; tracked for Phase 3.1 hardening.'
);

test.describe('Tasks - Atomic Assignment (Scoreboard)', () => {
  test('can create a task and assign it to the current user via Scoreboard UI', async ({ page }) => {
    logStep('📝', 'Signing up user and initializing team');

    const { teamId, teamMemberId } = await signUpAndGetTeam(page, {
      teamName: 'Task Assignment Team',
      userName: 'Task Assignment User',
    });

    if (!teamId || !teamMemberId) {
      throw new Error('Missing teamId or teamMemberId for task assignment test');
    }

    logStep('🌱', 'Seeding project and objective via API fixtures');

    const projectName = `Task Assignment Project ${Date.now()}`;
    const { id: projectId, name: seededProjectName } = await seedProject(page, teamId, projectName);

    if (!projectId) {
      throw new Error('Failed to seed project for task assignment test');
    }

    const objectiveName = `Task Assignment Objective ${Date.now()}`;

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
      throw new Error('Failed to seed objective via /api/projects/:projectId/objectives for task assignment test');
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

    // Ensure the Add Task button is visible (Tasks card rendered)
    const addTaskButton = page.getByRole('button', { name: /add task/i }).first();
    await expect(addTaskButton).toBeVisible({ timeout: 10_000 });

    logStep('➕', 'Opening Add Task modal and creating an assigned task');

    await addTaskButton.click();

    const taskTitle = `Assigned Atomic Task ${Date.now()}`;

    // Fill in the task title field in the modal
    const titleInput = page.getByLabel(/title \*/i).or(page.getByLabel(/task title/i)).first();
    await expect(titleInput).toBeVisible({ timeout: 10_000 });
    await titleInput.fill(taskTitle);

    // Select the current user in the Assign To multi-select
    // The checkbox accessible name comes from the label text (user name + role)
    const assigneeCheckbox = page.getByRole('checkbox', { name: /Task Assignment User/i }).first();
    await expect(assigneeCheckbox).toBeVisible({ timeout: 10_000 });
    await assigneeCheckbox.click();

    // Submit the form and capture the POST request + response
    const createButton = page.getByRole('button', { name: /create task/i }).first();
    await expect(createButton).toBeVisible({ timeout: 10_000 });

    const [request, response] = await Promise.all([
      page.waitForRequest((req) =>
        req.method() === 'POST' &&
        req.url().includes(`/api/objectives/${objectiveId}/tasks`)
      ),
      page.waitForResponse((res) =>
        res.request().method() === 'POST' &&
        res.url().includes(`/api/objectives/${objectiveId}/tasks`) &&
        res.status() >= 200 &&
        res.status() < 400
      ),
      createButton.click(),
    ]);

    // Assert request URL and body structure
    const requestBody = request.postDataJSON() as any;

    expect(request.url()).toContain(`/api/objectives/${objectiveId}/tasks`);
    expect(requestBody).toBeTruthy();
    expect(requestBody.title).toBe(taskTitle);
    expect(Array.isArray(requestBody.assigned_team_member_ids)).toBe(true);
    expect(requestBody.assigned_team_member_ids.length).toBeGreaterThanOrEqual(1);
    expect(requestBody.assigned_team_member_ids).toContain(teamMemberId);

    // Ensure the server responded successfully
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(400);

    logStep('✅', 'Verifying assigned avatar appears in the Scoreboard task list');

    // Locate the task card by its title and then assert initials + count
    const taskCard = page
      .getByText(taskTitle)
      .first()
      .locator('xpath=ancestor::div[contains(@class,"border")][1]');

    // Initials are derived from "Task Assignment User" => "TA".
    // Use a strict regex match to avoid matching the task title text.
    await expect(taskCard.getByText(/^TA$/)).toBeVisible({ timeout: 15_000 });
    await expect(taskCard.getByText(/1 assigned/i)).toBeVisible({ timeout: 15_000 });
  });
});
