import { test, expect } from '@playwright/test';
import { signUpAndGetTeam, ensureAuthToken } from '../fixtures/auth.fixture';
import { seedProject } from '../fixtures/api.fixture';

// Atomic RRGT API Test
// Verifies:
// - GET /api/rrgt/mine auto-provisions rrgt_plans for assigned tasks
// - PUT /api/rrgt/plans/:planId/rabbit updates rabbit position

// Skip in CI and WebKit until hardened, mirroring other RRGT atomic tests
test.skip(
  ({ browserName }) => browserName === 'webkit' || !!process.env.CI,
  'Skip RRGT API atomic test in CI and on WebKit while hardening.'
);

test.describe('RRGT - API Auto-Provisioning & Rabbit Update', () => {
  test('auto-provisions plans on GET /mine and updates rabbit via PUT', async ({ page }) => {
    const { teamId, teamMemberId } = await signUpAndGetTeam(page, {
      teamName: 'RRGT API Team',
      userName: 'RRGT API User',
    });

    if (!teamId || !teamMemberId) {
      throw new Error('Missing teamId or teamMemberId for RRGT API test');
    }

    const projectName = `RRGT API Project ${Date.now()}`;
    const objectiveName = `RRGT API Objective ${Date.now()}`;
    const taskTitle = `RRGT API Task ${Date.now()}`;

    const project = await seedProject(page, teamId, projectName);

    const token = await ensureAuthToken(page);

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
      throw new Error('Failed to seed objective via API for RRGT API test');
    }

    const taskResponse = await page.request.post(`/api/objectives/${objectiveId}/tasks`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        title: taskTitle,
        description: 'RRGT API test task',
        priority: 2,
        assigned_team_member_ids: [teamMemberId],
      },
    });

    expect(taskResponse.ok()).toBeTruthy();
    const taskJson = (await taskResponse.json()) as any;
    const taskId: string | undefined = taskJson?.task?.id;

    if (!taskId) {
      throw new Error('Failed to seed task via API for RRGT API test');
    }

    const mineResponse = await page.request.get('/api/rrgt/mine', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(mineResponse.ok()).toBeTruthy();

    const mineJson = (await mineResponse.json()) as any;
    const plans = mineJson?.plans as any[] | undefined;

    expect(plans).toBeTruthy();
    expect(plans!.length).toBeGreaterThan(0);

    const planForTask = plans!.find((p) => p.taskId === taskId);
    expect(planForTask).toBeTruthy();

    const planId: string = planForTask!.id;

    const targetColumn = 2;

    const rabbitResponse = await page.request.put(`/api/rrgt/plans/${planId}/rabbit`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        column_index: targetColumn,
      },
    });

    expect(rabbitResponse.ok()).toBeTruthy();

    const rabbitJson = (await rabbitResponse.json()) as any;
    const rabbit = rabbitJson?.rabbit;

    expect(rabbit).toBeTruthy();
    expect(rabbit.planId || rabbit.plan_id).toBe(planId);
    expect(rabbit.currentColumnIndex ?? rabbit.current_column_index).toBe(targetColumn);

    const mineResponseAfterRabbit = await page.request.get('/api/rrgt/mine', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(mineResponseAfterRabbit.ok()).toBeTruthy();

    const mineJsonAfterRabbit = (await mineResponseAfterRabbit.json()) as any;
    const plansAfterRabbit = mineJsonAfterRabbit?.plans as any[] | undefined;

    expect(plansAfterRabbit).toBeTruthy();

    const updatedPlanForTask = plansAfterRabbit!.find((p) => p.id === planId);
    expect(updatedPlanForTask).toBeTruthy();
    expect(
      updatedPlanForTask!.rabbit?.currentColumnIndex ??
      updatedPlanForTask!.rabbit?.current_column_index
    ).toBe(targetColumn);
  });
});
