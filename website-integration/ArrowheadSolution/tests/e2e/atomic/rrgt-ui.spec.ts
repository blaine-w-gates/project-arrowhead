import { test, expect } from '@playwright/test';
import { signUpAndGetTeam, ensureAuthToken } from '../fixtures/auth.fixture';
import { seedProject } from '../fixtures/api.fixture';
import { waitForNetworkIdle, logStep } from '../fixtures/data.fixture';

// Atomic RRGT UI Test
// Verifies that the Rabbit Race Matrix renders seeded subtask text and rabbit icon

// Skip in CI and WebKit until hardened, mirroring other RRGT atomic tests
test.skip(
  ({ browserName }) => browserName === 'webkit' || !!process.env.CI,
  'Skip RRGT UI atomic test in CI and on WebKit while hardening.'
);

test.describe('RRGT - Matrix UI Rendering', () => {
  test('renders seeded subtask and rabbit in matrix', async ({ page }) => {
    logStep('📝', 'Signing up user and initializing team');

    const { teamId, teamMemberId } = await signUpAndGetTeam(page, {
      teamName: 'RRGT UI Team',
      userName: 'RRGT UI User',
    });

    if (!teamId || !teamMemberId) {
      throw new Error('Missing teamId or teamMemberId for RRGT UI test');
    }

    const projectName = `RRGT UI Project ${Date.now()}`;
    const objectiveName = `RRGT UI Objective ${Date.now()}`;
    const taskTitle = `RRGT UI Task ${Date.now()}`;

    logStep('🌱', 'Seeding project via API');
    const project = await seedProject(page, teamId, projectName);

    const token = await ensureAuthToken(page);

    logStep('🌱', 'Seeding objective via API');
    const objectiveResponse = await page.request.post(`/api/projects/${project.id}/objectives`, {
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
      throw new Error('Failed to seed objective via API for RRGT UI test');
    }

    logStep('🌱', 'Seeding task via API');
    const taskResponse = await page.request.post(`/api/objectives/${objectiveId}/tasks`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        title: taskTitle,
        description: 'RRGT UI test task',
        priority: 2,
        assigned_team_member_ids: [teamMemberId],
      },
    });

    expect(taskResponse.ok()).toBeTruthy();
    const taskJson = (await taskResponse.json()) as any;
    const taskId: string | undefined = taskJson?.task?.id;

    if (!taskId) {
      throw new Error('Failed to seed task via API for RRGT UI test');
    }

    logStep('🧭', 'Calling /api/rrgt/mine to auto-provision RRGT plan');
    const mineResponse = await page.request.get('/api/rrgt/mine', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(mineResponse.ok()).toBeTruthy();

    const mineJson = (await mineResponse.json()) as any;
    const plans = (mineJson?.plans as any[]) || [];

    const planForTask = plans.find((p) => p.taskId === taskId);
    if (!planForTask) {
      throw new Error('RRGT plan was not auto-provisioned for seeded task');
    }

    const planId: string = planForTask.id;

    logStep('🧪', 'Setting subtask text via RRGT API');
    const subtaskResponse = await page.request.put(`/api/rrgt/plans/${planId}/subtasks`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        column_index: 1,
        text: 'Step 1',
      },
    });

    expect(subtaskResponse.ok()).toBeTruthy();

    logStep('🧪', 'Setting rabbit position via RRGT API');
    const rabbitResponse = await page.request.put(`/api/rrgt/plans/${planId}/rabbit`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        column_index: 2,
      },
    });

    expect(rabbitResponse.ok()).toBeTruthy();

    logStep('📊', 'Navigating to RRGT tab');
    await page.goto('/dashboard/rrgt', { waitUntil: 'networkidle' });
    await waitForNetworkIdle(page);

    // Basic smoke: RRGT heading should be visible
    const rrgtHeading = page.getByRole('heading', { name: /my work \(rrgt\)/i });
    await expect(rrgtHeading).toBeVisible({ timeout: 15_000 });

    // Assert that the seeded subtask text is visible somewhere in the matrix
    await expect(page.getByText('Step 1')).toBeVisible({ timeout: 15_000 });

    // Assert that the rabbit icon is visible
    await expect(page.getByText('🐇')).toBeVisible({ timeout: 15_000 });
  });

  test('user can drag rabbit to a new column and it persists', async ({ page }) => {
    logStep('📝', 'Signing up user and initializing team');

    const { teamId, teamMemberId } = await signUpAndGetTeam(page, {
      teamName: 'RRGT UI DnD Team',
      userName: 'RRGT UI DnD User',
    });

    if (!teamId || !teamMemberId) {
      throw new Error('Missing teamId or teamMemberId for RRGT UI DnD test');
    }

    const projectName = `RRGT UI DnD Project ${Date.now()}`;
    const objectiveName = `RRGT UI DnD Objective ${Date.now()}`;
    const taskTitle = `RRGT UI DnD Task ${Date.now()}`;

    logStep('🌱', 'Seeding project via API');
    const project = await seedProject(page, teamId, projectName);

    const token = await ensureAuthToken(page);

    logStep('🌱', 'Seeding objective via API');
    const objectiveResponse = await page.request.post(`/api/projects/${project.id}/objectives`, {
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
      throw new Error('Failed to seed objective via API for RRGT UI DnD test');
    }

    logStep('🌱', 'Seeding task via API');
    const taskResponse = await page.request.post(`/api/objectives/${objectiveId}/tasks`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        title: taskTitle,
        description: 'RRGT UI DnD test task',
        priority: 2,
        assigned_team_member_ids: [teamMemberId],
      },
    });

    expect(taskResponse.ok()).toBeTruthy();
    const taskJson = (await taskResponse.json()) as any;
    const taskId: string | undefined = taskJson?.task?.id;

    if (!taskId) {
      throw new Error('Failed to seed task via API for RRGT UI DnD test');
    }

    logStep('🧭', 'Calling /api/rrgt/mine to auto-provision RRGT plan');
    const mineResponse = await page.request.get('/api/rrgt/mine', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(mineResponse.ok()).toBeTruthy();

    const mineJson = (await mineResponse.json()) as any;
    const plans = (mineJson?.plans as any[]) || [];

    const planForTask = plans.find((p) => p.taskId === taskId);
    if (!planForTask) {
      throw new Error('RRGT plan was not auto-provisioned for seeded task (DnD test)');
    }

    const planId: string = planForTask.id;

    logStep('🧪', 'Setting initial subtask and rabbit via RRGT API');
    const subtaskResponse = await page.request.put(`/api/rrgt/plans/${planId}/subtasks`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        column_index: 1,
        text: 'Step 1',
      },
    });

    expect(subtaskResponse.ok()).toBeTruthy();

    const rabbitInitResponse = await page.request.put(`/api/rrgt/plans/${planId}/rabbit`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        column_index: 2,
      },
    });

    expect(rabbitInitResponse.ok()).toBeTruthy();

    logStep('📊', 'Navigating to RRGT tab for drag-and-drop');
    await page.goto('/dashboard/rrgt', { waitUntil: 'networkidle' });
    await waitForNetworkIdle(page);

    const rabbit = page.getByTestId(`rabbit-${planId}`);
    const targetCell = page.getByTestId(`rrgt-cell-${planId}-4`);

    logStep('🕹', 'Dragging rabbit to new column');
    await rabbit.dragTo(targetCell);

    // After drag, rabbit should appear in the target cell
    await expect(targetCell.getByText('🐇')).toBeVisible({ timeout: 15_000 });

    logStep('🔄', 'Reloading page to verify persistence');
    await page.reload({ waitUntil: 'networkidle' });
    await waitForNetworkIdle(page);

    const targetCellAfterReload = page.getByTestId(`rrgt-cell-${planId}-4`);
    await expect(targetCellAfterReload.getByText('🐇')).toBeVisible({ timeout: 15_000 });
  });

  test('user can edit subtask text and it persists', async ({ page }) => {
    logStep('📝', 'Signing up user and initializing team for subtask editing');

    const { teamId, teamMemberId } = await signUpAndGetTeam(page, {
      teamName: 'RRGT UI Edit Team',
      userName: 'RRGT UI Edit User',
    });

    if (!teamId || !teamMemberId) {
      throw new Error('Missing teamId or teamMemberId for RRGT UI Edit test');
    }

    const projectName = `RRGT UI Edit Project ${Date.now()}`;
    const objectiveName = `RRGT UI Edit Objective ${Date.now()}`;
    const taskTitle = `RRGT UI Edit Task ${Date.now()}`;

    logStep('🌱', 'Seeding project via API');
    const project = await seedProject(page, teamId, projectName);

    const token = await ensureAuthToken(page);

    logStep('🌱', 'Seeding objective via API');
    const objectiveResponse = await page.request.post(`/api/projects/${project.id}/objectives`, {
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
      throw new Error('Failed to seed objective via API for RRGT UI Edit test');
    }

    logStep('🌱', 'Seeding task via API');
    const taskResponse = await page.request.post(`/api/objectives/${objectiveId}/tasks`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        title: taskTitle,
        description: 'RRGT UI Edit test task',
        priority: 2,
        assigned_team_member_ids: [teamMemberId],
      },
    });

    expect(taskResponse.ok()).toBeTruthy();
    const taskJson = (await taskResponse.json()) as any;
    const taskId: string | undefined = taskJson?.task?.id;

    if (!taskId) {
      throw new Error('Failed to seed task via API for RRGT UI Edit test');
    }

    logStep('🧭', 'Calling /api/rrgt/mine to auto-provision RRGT plan');
    const mineResponse = await page.request.get('/api/rrgt/mine', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(mineResponse.ok()).toBeTruthy();

    const mineJson = (await mineResponse.json()) as any;
    const plans = (mineJson?.plans as any[]) || [];

    const planForTask = plans.find((p) => p.taskId === taskId);
    if (!planForTask) {
      throw new Error('RRGT plan was not auto-provisioned for seeded task (Edit test)');
    }

    const planId: string = planForTask.id;

    logStep('📊', 'Navigating to RRGT tab for subtask editing');
    await page.goto('/dashboard/rrgt', { waitUntil: 'networkidle' });
    await waitForNetworkIdle(page);

    const cell = page.getByTestId(`rrgt-cell-${planId}-1`);
    const textarea = cell.locator('textarea');

    const newText = 'New Plan';
    await textarea.fill(newText);

    const rrgtHeading = page.getByRole('heading', { name: /my work \(rrgt\)/i });
    await rrgtHeading.click();
    await waitForNetworkIdle(page);

    logStep('🔄', 'Reloading page to verify subtask persistence');
    await page.reload({ waitUntil: 'networkidle' });
    await waitForNetworkIdle(page);

    const cellAfter = page.getByTestId(`rrgt-cell-${planId}-1`);
    const textareaAfter = cellAfter.locator('textarea');
    await expect(textareaAfter).toHaveValue(newText);
  });
});
