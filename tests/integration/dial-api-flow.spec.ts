import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';

import { registerRoutes } from '../../server/routes';
import * as supabaseModule from '../../server/auth/supabase';

const TEST_JWT = 'test-dial-jwt';
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
const TEST_EMAIL = 'dial-dataflow-it@example.test';

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

async function ensurePlanForTask(): Promise<string> {
  const rrgtRes = await authGet(`/api/rrgt/mine?objective_id=${objectiveId}`);
  expect(rrgtRes.status).toBe(200);
  const plans = rrgtRes.body.plans as Array<{ id: string; taskId: string; task?: { id: string } }>;
  expect(Array.isArray(plans)).toBe(true);
  const plan = plans.find((p) => p.taskId === taskId || p.task?.id === taskId);
  expect(plan).toBeDefined();
  return plan!.id;
}

// Integration tests for Dial API lifecycle using the real Express app
// Team -> Project -> Objective -> Task -> RRGT plan -> Dial

describe('Dial API flow: lifecycle, focus, and ghost handling', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = process.env.NODE_ENV || 'test';
    process.env.VITEST = '1';
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
      teamName: 'Dial Data Flow Team',
      userName: 'Dial Owner',
    });

    if (![200, 201].includes(initRes.status)) {
      // eslint-disable-next-line no-console
      console.warn('INIT TEAM NON-OK (dial)', initRes.status, initRes.body);
    }

    const profileRes = await authGet('/api/auth/profile');
    expect(profileRes.status).toBe(200);
    teamId = profileRes.body.teamId as string;
    teamMemberId = profileRes.body.teamMemberId as string;

    const projectName = `Dial Scoreboard Project ${Date.now()}`;
    const projectRes = await authPost(`/api/teams/${teamId}/projects`).send({
      name: projectName,
    });
    expect(projectRes.status).toBe(201);
    projectId = projectRes.body.project.id as string;

    const objectiveName = `Dial Objective ${Date.now()}`;
    const objectiveRes = await authPost(`/api/projects/${projectId}/objectives`).send({
      name: objectiveName,
      start_with_brainstorm: false,
    });
    expect(objectiveRes.status).toBe(201);
    objectiveId = objectiveRes.body.objective.id as string;

    const taskRes = await authPost(`/api/objectives/${objectiveId}/tasks`).send({
      title: 'Dial Test Task',
      description: 'Task used for Dial API flow test',
      priority: 2,
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

  it('sets left slot and returns enriched task title in GET /api/dial/mine', async () => {
    const planId = await ensurePlanForTask();

    const putRes = await authPut('/api/dial/mine').send({
      left_plan_id: planId,
      left_column_index: 0,
      left_text: 'Dial left narrative',
      is_left_private: false,
    });
    expect(putRes.status).toBe(200);

    const getRes = await authGet('/api/dial/mine');
    expect(getRes.status).toBe(200);
    const dial = getRes.body.dial_state as {
      team_member_id: string;
      left_plan_id: string | null;
      left_column_index: number | null;
      left_text: string | null;
      leftTaskTitle: string | null;
    } | null;

    expect(dial).not.toBeNull();
    expect(dial!.team_member_id).toBe(teamMemberId);
    expect(dial!.left_plan_id).toBe(planId);
    expect(dial!.left_column_index).toBe(0);
    expect(dial!.left_text).toBe('Dial left narrative');
    expect(typeof dial!.leftTaskTitle === 'string' && dial!.leftTaskTitle.length > 0).toBe(true);
  }, 60_000);

  it('can set selected_slot to left and GET reflects focus', async () => {
    const planId = await ensurePlanForTask();

    const putRes = await authPut('/api/dial/mine').send({
      left_plan_id: planId,
      left_column_index: 0,
      selected_slot: 'left',
    });
    expect(putRes.status).toBe(200);

    const getRes = await authGet('/api/dial/mine');
    expect(getRes.status).toBe(200);
    const dial = getRes.body.dial_state as { selected_slot: 'left' | 'right' | null } | null;
    expect(dial).not.toBeNull();
    expect(dial!.selected_slot).toBe('left');
  }, 60_000);

  it('handles ghost scenario when underlying task (and plan) are deleted', async () => {
    const planId = await ensurePlanForTask();

    const putRes = await authPut('/api/dial/mine').send({
      left_plan_id: planId,
      left_column_index: 0,
      left_text: 'Ghost test',
      is_left_private: false,
    });
    expect(putRes.status).toBe(200);

    const deleteRes = await authDelete(`/api/tasks/${taskId}`);
    expect(deleteRes.status).toBe(200);

    const getRes = await authGet('/api/dial/mine');
    expect(getRes.status).toBe(200);

    const dial = getRes.body.dial_state as {
      left_plan_id: string | null;
      leftTaskTitle: string | null;
    } | null;

    // Dial should not crash; left_plan_id should be null (FK ON DELETE SET NULL) and title enrichment should be null
    expect(dial).not.toBeNull();
    expect(dial!.left_plan_id).toBeNull();
    expect(dial!.leftTaskTitle).toBeNull();
  }, 60_000);
});
