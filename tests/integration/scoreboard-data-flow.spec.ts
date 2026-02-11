import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';

import { registerRoutes } from '../../server/routes';
import * as supabaseModule from '../../server/auth/supabase';

// Use a dedicated, likely-unique test email so we don't collide with seeded users
const TEST_JWT = 'test-scoreboard-jwt';
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
const TEST_EMAIL = 'scoreboard-dataflow-it@example.test';

let app: Express;
let server: import('http').Server;
let teamId: string;
let teamMemberId: string;
let projectId: string;
let objectiveId: string;
let taskId: string;

function authGet(path: string) {
  return request(server).get(path).set('Authorization', `Bearer ${TEST_JWT}`);
}

function authPost(path: string) {
  return request(server).post(path).set('Authorization', `Bearer ${TEST_JWT}`);
}

function authPut(path: string) {
  return request(server).put(path).set('Authorization', `Bearer ${TEST_JWT}`);
}

function authDelete(path: string) {
  return request(server).delete(path).set('Authorization', `Bearer ${TEST_JWT}`);
}

// Full-stack diagnostic of the Scoreboard data pipeline
// Team -> Project -> Objective -> Task -> RRGT

describe('Scoreboard data flow: Project → Objective → Task → RRGT', () => {
  beforeAll(async () => {
    // Ensure test flags and DB SSL behavior for local Postgres
    process.env.NODE_ENV = process.env.NODE_ENV || 'test';
    process.env.VITEST = '1';
    // Local dev DB often does not support SSL; disable it for this test run
    if (!process.env.DB_SSL_DISABLE) {
      process.env.DB_SSL_DISABLE = '1';
    }

    vi.spyOn(supabaseModule, 'verifySupabaseJwt').mockResolvedValue({
      valid: true,
      userId: TEST_USER_ID,
      email: TEST_EMAIL,
      role: 'authenticated',
    });

    const adminAny = supabaseModule.supabaseAdmin as any;
    adminAny.auth = adminAny.auth || {};
    adminAny.auth.admin = adminAny.auth.admin || {};
    adminAny.auth.admin.getUserById = vi.fn().mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: TEST_EMAIL } },
      error: null,
    });

    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    server = await registerRoutes(app);

    const initRes = await authPost('/api/auth/initialize-team').send({
      teamName: 'Scoreboard Data Flow Team',
      userName: 'Scoreboard Owner',
    });

    if (![200, 201].includes(initRes.status)) {
      // eslint-disable-next-line no-console
      console.warn('INIT TEAM NON-OK', initRes.status, initRes.body);
    }

    const profileRes = await authGet('/api/auth/profile');
    expect(profileRes.status).toBe(200);
    teamId = profileRes.body.teamId as string;
    teamMemberId = profileRes.body.teamMemberId as string;

    const projectName = `Reddit Scoreboard Test ${Date.now()}`;
    const projectRes = await authPost(`/api/teams/${teamId}/projects`).send({
      name: projectName,
    });
    expect(projectRes.status).toBe(201);
    projectId = projectRes.body.project.id as string;

    const objectiveName = `Decide on Objective ${Date.now()}`;
    const objectiveRes = await authPost(`/api/projects/${projectId}/objectives`).send({
      name: objectiveName,
      start_with_brainstorm: false,
    });
    expect(objectiveRes.status).toBe(201);
    objectiveId = objectiveRes.body.objective.id as string;

    const taskRes = await authPost(`/api/objectives/${objectiveId}/tasks`).send({
      title: 'Test Task 1',
      description: 'Scoreboard data-flow test task',
      priority: 1,
      assigned_team_member_ids: [teamMemberId],
    });
    expect(taskRes.status).toBe(201);
    taskId = taskRes.body.task.id as string;
  }, 60_000);

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('ensures hierarchy integrity: team → project → objective → task', async () => {
    const projectsRes = await authGet(`/api/teams/${teamId}/projects`);
    expect(projectsRes.status).toBe(200);
    const projects = projectsRes.body.projects as Array<{
      id: string;
      teamId: string;
      stats?: { objectives_count: number; tasks_count: number };
    }>;
    const proj = projects.find((p) => p.id === projectId);
    expect(proj).toBeDefined();
    expect(proj!.teamId).toBe(teamId);

    const objectivesRes = await authGet(`/api/projects/${projectId}/objectives`);
    expect(objectivesRes.status).toBe(200);
    const objectives = objectivesRes.body as Array<{ id: string }>;
    const obj = objectives.find((o) => o.id === objectiveId);
    expect(obj).toBeDefined();

    const tasksRes = await authGet(`/api/objectives/${objectiveId}/tasks`);
    expect(tasksRes.status).toBe(200);
    const tasks = tasksRes.body.tasks as Array<{ id: string; objectiveId: string }>;
    const task = tasks.find((t) => t.id === taskId);
    expect(task).toBeDefined();
    expect(task!.objectiveId).toBe(objectiveId);
  }, 60_000);

  it('Scoreboard fetch (/api/objectives/:id/tasks) returns the created task', async () => {
    const res = await authGet(`/api/objectives/${objectiveId}/tasks`);
    expect(res.status).toBe(200);
    const tasks = res.body.tasks as Array<{ id: string; title: string }>;
    const task = tasks.find((t) => t.id === taskId);
    expect(task).toBeDefined();
    expect(task!.title).toBe('Test Task 1');
  }, 60_000);

  it('RRGT propagation: /api/rrgt/mine includes a plan for the task', async () => {
    const res = await authGet(`/api/rrgt/mine?objective_id=${objectiveId}`);
    expect(res.status).toBe(200);
    const plans = res.body.plans as Array<{
      id: string;
      taskId: string;
      objectiveId: string;
      task: { id: string; status: string };
    }>;
    expect(Array.isArray(plans)).toBe(true);
    expect(res.body.total).toBe(plans.length);
    const plan = plans.find((p) => p.taskId === taskId || p.task?.id === taskId);
    expect(plan).toBeDefined();
    expect(plan!.objectiveId).toBe(objectiveId);
  }, 60_000);

  it('Task status updates are reflected in RRGT (/api/tasks/:id then /api/rrgt/mine)', async () => {
    const updateRes = await authPut(`/api/tasks/${taskId}`).send({
      status: 'in_progress',
    });
    expect(updateRes.status).toBe(200);

    const rrgtRes = await authGet(`/api/rrgt/mine?objective_id=${objectiveId}`);
    expect(rrgtRes.status).toBe(200);
    const plans = rrgtRes.body.plans as Array<{
      taskId: string;
      task: { id: string; status: string };
    }>;
    const plan = plans.find((p) => p.taskId === taskId || p.task?.id === taskId);
    expect(plan).toBeDefined();
    expect(plan!.task.status).toBe('in_progress');
  }, 60_000);

  it('Task reordering updates positions and GET returns new order', async () => {
    const createTask = async (title: string) => {
      const res = await authPost(`/api/objectives/${objectiveId}/tasks`).send({
        title,
        description: `${title} - reorder test`,
        priority: 2,
        assigned_team_member_ids: [teamMemberId],
      });
      expect(res.status).toBe(201);
      return res.body.task.id as string;
    };

    const secondTaskId = await createTask('Test Task 2');
    const thirdTaskId = await createTask('Test Task 3');

    const listResBefore = await authGet(`/api/objectives/${objectiveId}/tasks`);
    expect(listResBefore.status).toBe(200);
    const tasksBefore = listResBefore.body.tasks as Array<{ id: string }>;
    const ourTasksBefore = tasksBefore.filter((t) =>
      [taskId, secondTaskId, thirdTaskId].includes(t.id),
    );
    expect(ourTasksBefore.map((t) => t.id)).toEqual([taskId, secondTaskId, thirdTaskId]);

    const newOrder = [thirdTaskId, taskId, secondTaskId];
    const reorderRes = await authPut(`/api/objectives/${objectiveId}/tasks/reorder`).send({
      task_ids: newOrder,
    });
    expect(reorderRes.status).toBe(200);

    const listResAfter = await authGet(`/api/objectives/${objectiveId}/tasks`);
    expect(listResAfter.status).toBe(200);
    const tasksAfter = listResAfter.body.tasks as Array<{ id: string }>;
    const ourTasksAfter = tasksAfter.filter((t) =>
      [taskId, secondTaskId, thirdTaskId].includes(t.id),
    );
    expect(ourTasksAfter.map((t) => t.id)).toEqual(newOrder);
  }, 60_000);

  it('Deleting a task removes it from Scoreboard and RRGT', async () => {
    const createRes = await authPost(`/api/objectives/${objectiveId}/tasks`).send({
      title: 'Task To Delete',
      description: 'Task created for delete flow test',
      priority: 2,
      assigned_team_member_ids: [teamMemberId],
    });
    expect(createRes.status).toBe(201);
    const deleteTaskId = createRes.body.task.id as string;

    const rrgtBeforeRes = await authGet(`/api/rrgt/mine?objective_id=${objectiveId}`);
    expect(rrgtBeforeRes.status).toBe(200);
    const plansBefore = rrgtBeforeRes.body.plans as Array<{ taskId: string; task?: { id: string } }>;
    const hasPlanBefore = plansBefore.some(
      (p) => p.taskId === deleteTaskId || p.task?.id === deleteTaskId,
    );
    expect(hasPlanBefore).toBe(true);

    const deleteRes = await authDelete(`/api/tasks/${deleteTaskId}`);
    expect(deleteRes.status).toBe(200);

    const listRes = await authGet(`/api/objectives/${objectiveId}/tasks`);
    expect(listRes.status).toBe(200);
    const tasksAfterDelete = listRes.body.tasks as Array<{ id: string }>;
    const deletedStillPresent = tasksAfterDelete.some((t) => t.id === deleteTaskId);
    expect(deletedStillPresent).toBe(false);

    const rrgtAfterRes = await authGet(`/api/rrgt/mine?objective_id=${objectiveId}`);
    expect(rrgtAfterRes.status).toBe(200);
    const plansAfter = rrgtAfterRes.body.plans as Array<{ taskId: string; task?: { id: string } }>;
    const hasPlanAfter = plansAfter.some(
      (p) => p.taskId === deleteTaskId || p.task?.id === deleteTaskId,
    );
    expect(hasPlanAfter).toBe(false);
  }, 60_000);
});
