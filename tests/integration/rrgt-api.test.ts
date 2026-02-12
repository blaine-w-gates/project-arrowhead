/**
 * RRGT & Dial API Integration Tests
 * Comprehensive coverage for My Work dashboard and Manager God-view
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import rrgtRouter from '../../server/api/rrgt';
import * as supabaseModule from '../../server/auth/supabase';
import * as dbModule from '../../server/db';

vi.mock('../../server/auth/supabase');
vi.mock('../../server/db');

describe('RRGT & Dial API', () => {
  let app: Express;
  let mockDb: any;

  const teamId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const taskId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  const memberId1 = 'm-1';

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', rrgtRouter);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
    };
    // Ensure the first .where() call (from requireAuth) returns the builder,
    // so that .limit() (mocked in tests) can be called on it.
    // Subsequent .where() calls in route handlers can be overridden by tests using mockResolvedValueOnce.
    mockDb.where.mockReturnValueOnce(mockDb);

    vi.mocked(dbModule.getDb).mockReturnValue(mockDb as never);
  });

  describe('GET /api/rrgt/mine', () => {
    it('Returns user\'s RRGT data (plans)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Team Member' }]); // Auth

      // 1. Task assignments
      mockDb.where.mockResolvedValueOnce([{ taskId, teamMemberId: memberId1 }]);

      // 2. Tasks
      mockDb.where.mockResolvedValueOnce([{ id: taskId, objectiveId: 'obj-1', title: 'My Task', status: 'in_progress' }]);

      // 3. Objectives
      mockDb.where.mockResolvedValueOnce([{ id: 'obj-1', projectId: 'proj-1', name: 'Objective 1' }]);

      // 4. Existing plans
      mockDb.where.mockResolvedValueOnce([{ id: 'plan-1', taskId, teamMemberId: memberId1, objectiveId: 'obj-1' }]);

      // 5. Plans with Joins (for enrichment)
      // Mock db.select({...}).from(rrgtPlans).innerJoin...
      mockDb.where.mockResolvedValueOnce([{
        plan: { id: 'plan-1', taskId, teamMemberId: memberId1, objectiveId: 'obj-1', maxColumnIndex: 6 },
        task: { id: taskId, objectiveId: 'obj-1', title: 'My Task', status: 'in_progress' },
        objective: { id: 'obj-1', projectId: 'proj-1', name: 'Objective 1' },
        rabbit: null,
      }]);

      // 6. Subtasks
      mockDb.where.mockResolvedValueOnce([]);

      const res = await request(app)
        .get('/api/rrgt/mine')
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(200);
      expect(res.body.plans).toHaveLength(1);
      expect(res.body.plans[0].task.title).toBe('My Task');
      expect(res.body.total).toBe(1);
    });

    it('Uses batch inserts (optimizes N+1 problem)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Team Member' }]); // Auth

      const tasks = [
        { id: 'task-1', objectiveId: 'obj-1', title: 'Task 1' },
        { id: 'task-2', objectiveId: 'obj-1', title: 'Task 2' },
        { id: 'task-3', objectiveId: 'obj-1', title: 'Task 3' },
      ];

      // 1. Assignments
      mockDb.where.mockReturnValueOnce([{ taskId: 'task-1' }, { taskId: 'task-2' }, { taskId: 'task-3' }]);

      // 2. Tasks
      mockDb.where.mockReturnValueOnce(tasks);

      // 3. Objectives
      mockDb.where.mockReturnValueOnce([{ id: 'obj-1', projectId: 'proj-1', name: 'Objective 1' }]);

      // 4. Existing plans (empty)
      mockDb.where.mockReturnValueOnce([]);

      // 5. Batch Inserts
      // Mock returning values for plans so subsequent inserts can use IDs
      mockDb.returning.mockImplementation(() => {
        // Return 3 plans
        return [
          { id: 'plan-1' },
          { id: 'plan-2' },
          { id: 'plan-3' }
        ];
      });

      // 6. Final fetch of plansWithJoins
      mockDb.where.mockResolvedValueOnce([]);

      const res = await request(app)
        .get('/api/rrgt/mine')
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(200);

      // We expect 3 batch inserts: 1 for plans, 1 for rabbits, 1 for subtasks
      expect(mockDb.insert).toHaveBeenCalledTimes(3);
    });
  });

  // ... (keeping other tests unchanged until dial)

  describe('PUT /api/dial/mine', () => {
    it('Creates new dial state', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Team Member' }]); // Auth

      mockDb.where.mockReturnValueOnce(mockDb); // for left plan check
      mockDb.where.mockReturnValueOnce(mockDb); // for dial state check

      const planId = '11111111-1111-1111-1111-111111111111';
      // Left plan check (replacing item check)
      mockDb.limit.mockResolvedValueOnce([{ id: planId, teamMemberId: memberId1 }]);

      // Dial state check (doesn't exist)
      mockDb.limit.mockResolvedValueOnce([]);

      mockDb.returning.mockResolvedValue([{
        teamMemberId: memberId1,
        leftPlanId: planId,
        rightPlanId: null,
        isLeftPrivate: false,
        isRightPrivate: false,
      }]);

      // Get task titles mocks
      // db.select().from(rrgtPlans).innerJoin...
      mockDb.where.mockResolvedValueOnce([{
        planId: planId,
        taskTitle: 'My Task'
      }]);

      const res = await request(app)
        .put('/api/dial/mine')
        .set('Authorization', 'Bearer jwt')
        .send({
          left_plan_id: planId,
          right_plan_id: null,
        });

      expect(res.status).toBe(200);
      expect(res.body.dial_state.left_plan_id).toBe(planId);
    });

    it('Updates existing dial state with privacy flags', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Team Member' }]); // Auth

      mockDb.where.mockReturnValueOnce(mockDb); // for left plan check
      mockDb.where.mockReturnValueOnce(mockDb); // for dial state check
      mockDb.where.mockReturnValueOnce(mockDb); // for update query

      const planId = '11111111-1111-1111-1111-111111111111';
      // Left plan check
      mockDb.limit.mockResolvedValueOnce([{ id: planId, teamMemberId: memberId1 }]);

      // Existing dial state
      mockDb.limit.mockResolvedValueOnce([{ teamMemberId: memberId1 }]);

      mockDb.returning.mockResolvedValue([{
        teamMemberId: memberId1,
        leftPlanId: planId,
        rightPlanId: null,
        isLeftPrivate: true, // Incognito task flag
        isRightPrivate: false,
      }]);

      // Get task titles mocks
      mockDb.where.mockResolvedValueOnce([{
        planId: planId,
        taskTitle: 'My Task'
      }]);

      const res = await request(app)
        .put('/api/dial/mine')
        .set('Authorization', 'Bearer jwt')
        .send({
          left_plan_id: planId,
          is_left_private: true, // Mark as incognito
        });

      expect(res.status).toBe(200);
      expect(res.body.dial_state.is_left_private).toBe(true);
    });

    it('Rejects plan not belonging to user (400)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Team Member' }]);

      mockDb.where.mockReturnValueOnce(mockDb); // for left plan check

      // Plan check returns empty (not belonging or not found)
      mockDb.limit.mockResolvedValueOnce([]);

      const res = await request(app)
        .put('/api/dial/mine')
        .set('Authorization', 'Bearer jwt')
        .send({
          left_plan_id: '11111111-1111-1111-1111-111111111111',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('does not belong to you');
    });
  });
});
