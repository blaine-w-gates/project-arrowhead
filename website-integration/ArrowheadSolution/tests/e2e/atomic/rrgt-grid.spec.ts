import { test, expect } from '@playwright/test';
import { signUpAndGetTeam, ensureAuthToken } from '../fixtures/auth.fixture';
import { seedProject } from '../fixtures/api.fixture';
import { waitForNetworkIdle, logStep } from '../fixtures/data.fixture';

/**
 * Atomic RRGT Grid Test (T-3.4)
 *
 * Verifies that a user can create an RRGT item for a task assigned to them:
 * - Seed Project + Objective via authenticated APIs
 * - Seed Task assigned to current team member via Tasks API
 * - Navigate to RRGT tab (/dashboard/rrgt)
 * - Use the Assigned Tasks list to add an item into the Green column
 * - Assert POST /api/tasks/:taskId/items payload and RRGT grid UI
 */

// Temporarily skip in CI and on WebKit while we harden Phase 3.0
// This test is intended to run locally in Chromium during development.
test.skip(
  ({ browserName }) => browserName === 'webkit' || !!process.env.CI,
  'Temporarily skip RRGT atomic test in CI and on WebKit for Phase 3.0; tracked for Phase 3.1 hardening.'
);

const GREEN_COLUMN_INDEX = 5; // As defined in RrgtGrid COLUMN_CONFIG

test.describe('RRGT - Atomic Grid (My Work)', () => {
  test('can create RRGT item in Green column for assigned task', async ({ page }) => {
    logStep('📝', 'Signing up user, initializing team');

    const { teamId, teamMemberId } = await signUpAndGetTeam(page, {
      teamName: 'RRGT Team',
      userName: 'RRGT User',
    });

    if (!teamId || !teamMemberId) {
      throw new Error('Missing teamId or teamMemberId for RRGT test');
    }

    logStep('🌱', 'Seeding project, objective, and assigned task via API');

    const projectName = `RRGT Project ${Date.now()}`;
    const { id: projectId, name: seededProjectName } = await seedProject(page, teamId, projectName);

    if (!projectId) {
      throw new Error('Failed to seed project for RRGT test');
    }

    const objectiveName = `RRGT Objective ${Date.now()}`;
    const token = await ensureAuthToken(page);

    // Seed objective via authenticated Express API
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
      throw new Error('Failed to seed objective for RRGT test');
    }

    // Seed a task assigned to the current team member via Tasks API
    const taskTitle = `RRGT Atomic Task ${Date.now()}`;
    const createTaskResponse = await page.request.post(`/api/objectives/${objectiveId}/tasks`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        title: taskTitle,
        description: 'Task used for RRGT item creation test',
        priority: 2,
        assigned_team_member_ids: [teamMemberId],
      },
    });

    expect(createTaskResponse.ok()).toBeTruthy();
    const taskJson = (await createTaskResponse.json()) as any;
    const taskId: string | undefined = taskJson?.task?.id;

    if (!taskId) {
      throw new Error('Failed to seed assigned task for RRGT test');
    }

    logStep('📊', 'Navigating to RRGT tab');

    await page.goto('/dashboard/rrgt', { waitUntil: 'networkidle' });
    await waitForNetworkIdle(page);

    // Basic smoke: RRGT heading should be visible
    const rrgtHeading = page.getByRole('heading', { name: /my work \(rrgt\)/i });
    await expect(rrgtHeading).toBeVisible({ timeout: 15_000 });

    logStep('🎯', 'Ensuring seeded project is available in RRGT filters (optional)');

    // Project filter: select the seeded project (not strictly required for current API behavior,
    // but aligns with user workflow and future-proofs filters).
    const projectFilterLabel = page.getByText(/^Project$/);
    const projectFilterSection = projectFilterLabel.locator(
      'xpath=ancestor::div[contains(@class,"space-y-2")][1]'
    );

    const projectSelectTrigger = projectFilterSection.getByRole('combobox').first();
    await expect(projectSelectTrigger).toBeVisible({ timeout: 15_000 });
    await expect(projectSelectTrigger).toBeEnabled({ timeout: 15_000 });
    await projectSelectTrigger.click();

    const projectOption = page.getByRole('option', { name: seededProjectName }).first();
    await expect(projectOption).toBeVisible({ timeout: 10_000 });
    await projectOption.click();

    logStep('🔍', 'Locating assigned task in RRGT "Your Assigned Tasks" list');

    const assignedTasksHeading = page.getByText(/your assigned tasks/i).first();
    await expect(assignedTasksHeading).toBeVisible({ timeout: 15_000 });

    const taskTitleLocator = page.getByText(taskTitle).first();
    await expect(taskTitleLocator).toBeVisible({ timeout: 15_000 });

    const taskRow = taskTitleLocator.locator(
      'xpath=ancestor::div[contains(@class,"bg-background")][1]'
    );

    logStep('➕', 'Opening RRGT item modal for Green column');

    // In the task row, there are 6 plus buttons (one per column) rendered in COLUMN_CONFIG order.
    // Green column has index 5 => 0-based nth(4).
    const greenColumnButton = taskRow.getByRole('button').nth(GREEN_COLUMN_INDEX - 1);
    await expect(greenColumnButton).toBeVisible({ timeout: 10_000 });
    await greenColumnButton.click();

    // RRGT item modal should appear
    const itemModalTitle = page.getByRole('heading', { name: /create new item/i });
    await expect(itemModalTitle).toBeVisible({ timeout: 10_000 });

    const itemTitle = 'Atomic Green Item';
    const itemTitleInput = page.getByLabel(/item title \*/i);
    await expect(itemTitleInput).toBeVisible({ timeout: 10_000 });
    await itemTitleInput.fill(itemTitle);

    const createButton = page.getByRole('button', { name: /create/i }).first();
    await expect(createButton).toBeVisible({ timeout: 10_000 });

    logStep('📡', 'Saving RRGT item and capturing creation request');

    const [request, response] = await Promise.all([
      page.waitForRequest((req) =>
        req.method() === 'POST' && req.url().includes(`/api/tasks/${taskId}/items`)
      ),
      page.waitForResponse((res) =>
        res.request().method() === 'POST' &&
        res.url().includes(`/api/tasks/${taskId}/items`)
      ),
      createButton.click(),
    ]);

    const requestBody = request.postDataJSON() as any;
    const responseStatus = response.status();
    const responseBodyText = await response.text();
    // Helpful for debugging if this test ever fails
    console.log('RRGT item create response:', responseStatus, responseBodyText);

    expect(request.url()).toContain(`/api/tasks/${taskId}/items`);
    expect(requestBody).toBeTruthy();
    expect(requestBody.title).toBe(itemTitle);
    expect(requestBody.column_index).toBe(GREEN_COLUMN_INDEX);
    expect(responseStatus).toBe(201);

    logStep('✅', 'Verifying RRGT grid shows new item in Green column');

    // Locate the RRGT Grid card by its title text and assert the new item title
    // is rendered somewhere inside it. CardTitle is a <div>, not a semantic heading,
    // so we use text-based location instead of a heading role.
    const rrgtGridCard = page
      .getByText(/rrgt grid \(6 priority columns\)/i)
      .locator('xpath=ancestor::div[contains(@class,"rounded-lg") and contains(@class,"border")][1]');

    await expect(rrgtGridCard.getByText(itemTitle)).toBeVisible({ timeout: 15_000 });
  });
});
