/**
 * Tasks API Integration Tests
 * Comprehensive coverage for CRUD operations and Team Member permission logic
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import tasksRouter from '../../server/api/tasks';
import * as supabaseModule from '../../server/auth/supabase';
import * as dbModule from '../../server/db';

vi.mock('../../server/auth/supabase');
vi.mock('../../server/db');

// Helper to generate a chainable mock that is also thenable
const createMockQueryBuilder = () => {
  const builder: any = {};
  const responses: any[] = [];

  builder.queueResponse = (data: any) => responses.push(data);
  builder.clearQueue = () => { responses.length = 0; };

  // Define methods that return the builder (chainable)
  const chainableMethods = [
    'select', 'from', 'where', 'limit', 'orderBy',
    'insert', 'values', 'update', 'set', 'delete', 'returning'
  ];

  chainableMethods.forEach(method => {
    builder[method] = vi.fn().mockReturnThis();
  });

  // Make it thenable to simulate await
  builder.then = (resolve: any) => {
    const data = responses.shift();
    // Default to empty array if queue is empty
    return Promise.resolve(data !== undefined ? data : []).then(resolve);
  };

  // Transaction support
  builder.transaction = vi.fn(async (cb) => {
    return await cb(builder);
  });

  return builder;
};

describe('Tasks API', () => {
  let app: Express;
  let mockDb: any;

  // Use valid UUIDs
  const teamId = '123e4567-e89b-12d3-a456-426614174000';
  const objectiveId = '123e4567-e89b-12d3-a456-426614174001';
  const taskId = '123e4567-e89b-12d3-a456-426614174002';
  const memberId1 = '123e4567-e89b-12d3-a456-426614174003';
  const taskId2 = '123e4567-e89b-12d3-a456-426614174005';

  beforeAll(() => {
    app = express();
    app.use(express.json());
    // Mock user context middleware
    app.use((req: any, res, next) => {
        req.user = { sub: 'user-1' };
        next();
    });
    app.use('/api', tasksRouter);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockQueryBuilder();
    vi.mocked(dbModule.getDb).mockReturnValue(mockDb);
  });

  describe('POST /api/objectives/:objectiveId/tasks', () => {
    it('Creates task with assignments', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });

      // 1. setDbContext: Team Member lookup
      mockDb.queueResponse([{ id: memberId1, teamId, role: 'Project Owner' }]);
      // 2. Objective Check
      mockDb.queueResponse([{ id: objectiveId, projectId: 'p-1' }]);
      // 3. Transaction -> Max position
      mockDb.queueResponse([{ maxPosition: 0 }]);
      // 4. Insert Task
      mockDb.queueResponse([{
        id: taskId,
        objectiveId,
        title: 'Test Task',
        status: 'todo',
        priority: 2,
      }]);
      // 5. Insert Assignments
      mockDb.queueResponse([]);
      // 6. Fetch Assignments
      mockDb.queueResponse([{ taskId, teamMemberId: memberId1 }]);

      const res = await request(app)
        .post(`/api/objectives/${objectiveId}/tasks`)
        .set('Authorization', 'Bearer jwt')
        .send({
          title: 'Test Task',
          description: 'Test description',
          priority: 1,
          assigned_team_member_ids: [memberId1],
        });

      expect(res.status).toBe(201);
      expect(res.body.task.title).toBe('Test Task');
      expect(res.body.task.assigned_team_members).toHaveLength(1);
    });

    it('Returns 404 for non-existent objective', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });

      // 1. Auth check
      mockDb.queueResponse([{ id: memberId1, teamId, role: 'Project Owner' }]);
      // 2. Objective Check -> Return empty array (not found)
      mockDb.queueResponse([]);

      const res = await request(app)
        .post(`/api/objectives/${objectiveId}/tasks`)
        .set('Authorization', 'Bearer jwt')
        .send({ title: 'Test Task' });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/objectives/:objectiveId/tasks', () => {
    it('Lists tasks with assignments', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });

      // 1. Auth check
      mockDb.queueResponse([{ id: memberId1, teamId, role: 'Project Owner' }]);
      // 2. Objective Check
      mockDb.queueResponse([{ id: objectiveId, projectId: 'p-1' }]);
      // 3. Fetch Tasks
      mockDb.queueResponse([{ id: taskId, objectiveId, title: 'Task 1', position: 0 }]);
      // 4. Fetch Assignments
      mockDb.queueResponse([{ taskId, teamMemberId: memberId1 }]);

      const res = await request(app)
        .get(`/api/objectives/${objectiveId}/tasks`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(200);
      expect(res.body.tasks).toHaveLength(1);
      expect(res.body.tasks[0].assigned_team_members).toContain(memberId1);
    });
  });

  describe('PUT /api/objectives/:objectiveId/tasks/reorder', () => {
    it('Reorders tasks successfully (Optimization check)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });

      // 1. Auth context
      mockDb.queueResponse([{ id: memberId1, teamId, role: 'Project Owner' }]);
      // 2. Objective Check
      mockDb.queueResponse([{ id: objectiveId, projectId: 'p-1' }]);
      // 3. Tasks validation
      mockDb.queueResponse([
        { id: taskId, objectiveId },
        { id: taskId2, objectiveId }
      ]);
      // 4. Optimized Batch Update (1 call)
      mockDb.queueResponse([]);

      const res = await request(app)
        .put(`/api/objectives/${objectiveId}/tasks/reorder`)
        .set('Authorization', 'Bearer jwt')
        .send({ task_ids: [taskId, taskId2] });

      expect(res.status).toBe(200);

      // Verify Optimization: Should be called exactly once
      expect(mockDb.update).toHaveBeenCalledTimes(1);
    });

    it('Returns 400 if tasks do not belong to objective', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });

      // 1. Auth context
      mockDb.queueResponse([{ id: memberId1, teamId, role: 'Project Owner' }]);
      // 2. Objective Check
      mockDb.queueResponse([{ id: objectiveId, projectId: 'p-1' }]);
      // 3. Tasks validation - One task has wrong objectiveId
      mockDb.queueResponse([
        { id: taskId, objectiveId },
        { id: taskId2, objectiveId: 'wrong-objective-id' }
      ]);

      const res = await request(app)
        .put(`/api/objectives/${objectiveId}/tasks/reorder`)
        .set('Authorization', 'Bearer jwt')
        .send({ task_ids: [taskId, taskId2] });

      expect(res.status).toBe(400);
    });
  });
});
