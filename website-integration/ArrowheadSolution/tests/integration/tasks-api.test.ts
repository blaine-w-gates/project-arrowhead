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

describe.skip('Tasks API', () => {
  let app: Express;
  let mockDb: any;

  const teamId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const objectiveId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  const taskId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  const memberId1 = 'm-1';
  const memberId2 = 'm-2';

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', tasksRouter);
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
      orderBy: vi.fn().mockReturnThis(),
    };
    vi.mocked(dbModule.getDb).mockReturnValue(mockDb);
  });

  describe('POST /api/objectives/:objectiveId/tasks', () => {
    it('Creates task with assignments', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Project Owner' }]); // Auth
      mockDb.limit.mockResolvedValueOnce([{ id: objectiveId, projectId: 'p-1' }]); // Objective check
      mockDb.returning.mockResolvedValue([{
        id: taskId,
        objectiveId,
        title: 'Test Task',
        status: 'todo',
        priority: 2,
      }]);
      mockDb.where.mockResolvedValue([{ teamMemberId: memberId1 }]); // Assignments

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

    it('Creates task without assignments', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: objectiveId, projectId: 'p-1' }]);
      mockDb.returning.mockResolvedValue([{
        id: taskId,
        objectiveId,
        title: 'Unassigned Task',
        status: 'todo',
        priority: 2,
      }]);
      mockDb.where.mockResolvedValue([]); // No assignments

      const res = await request(app)
        .post(`/api/objectives/${objectiveId}/tasks`)
        .set('Authorization', 'Bearer jwt')
        .send({ title: 'Unassigned Task' });

      expect(res.status).toBe(201);
      expect(res.body.task.assigned_team_members).toHaveLength(0);
    });

    it('Rejects Team Member creating task (403)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Team Member' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: objectiveId }]);

      const res = await request(app)
        .post(`/api/objectives/${objectiveId}/tasks`)
        .set('Authorization', 'Bearer jwt')
        .send({ title: 'Test Task' });

      expect(res.status).toBe(403);
    });

    it('Rejects missing title (400)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValue([{ id: memberId1, teamId, role: 'Project Owner' }]);

      const res = await request(app)
        .post(`/api/objectives/${objectiveId}/tasks`)
        .set('Authorization', 'Bearer jwt')
        .send({});

      expect(res.status).toBe(400);
    });

    it('Returns 404 for non-existent objective', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([]); // No objective

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
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: objectiveId }]);
      mockDb.orderBy.mockResolvedValue([
        { id: taskId, title: 'Task 1', status: 'todo' }
      ]);
      mockDb.where.mockResolvedValue([{ taskId, teamMemberId: memberId1 }]);

      const res = await request(app)
        .get(`/api/objectives/${objectiveId}/tasks`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(200);
      expect(res.body.tasks).toHaveLength(1);
    });

    it('Returns 404 for non-existent objective', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([]);

      const res = await request(app)
        .get(`/api/objectives/${objectiveId}/tasks`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/tasks/:taskId - Team Member Status Logic', () => {
    it('Project Owner can update all fields', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: taskId, objectiveId, status: 'todo' }]);
      mockDb.returning.mockResolvedValue([{ id: taskId, title: 'Updated', priority: 1 }]);
      mockDb.where.mockResolvedValue([]);

      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', 'Bearer jwt')
        .send({ title: 'Updated', priority: 1, status: 'in_progress' });

      expect(res.status).toBe(200);
    });

    it('Team Member can update status of assigned task', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-2' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId2, teamId, role: 'Team Member' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: taskId, objectiveId, status: 'todo' }]);
      
      // Assignment check - user IS assigned
      mockDb.limit.mockResolvedValueOnce([{ taskId, teamMemberId: memberId2 }]);
      
      mockDb.returning.mockResolvedValue([{ id: taskId, status: 'in_progress' }]);
      mockDb.where.mockResolvedValue([{ teamMemberId: memberId2 }]);

      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', 'Bearer jwt')
        .send({ status: 'in_progress' });

      expect(res.status).toBe(200);
    });

    it('Team Member CANNOT update other fields (403)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-2' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId2, teamId, role: 'Team Member' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: taskId, objectiveId }]);
      mockDb.limit.mockResolvedValueOnce([{ taskId, teamMemberId: memberId2 }]); // Assigned

      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', 'Bearer jwt')
        .send({ title: 'Trying to update title' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('can only update the status field');
    });

    it('Team Member CANNOT update unassigned task (403)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-2' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId2, teamId, role: 'Team Member' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: taskId, objectiveId }]);
      mockDb.limit.mockResolvedValueOnce([]); // NOT assigned

      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', 'Bearer jwt')
        .send({ status: 'complete' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('only update tasks assigned to you');
    });

    it('Returns 404 for non-existent task', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([]);

      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', 'Bearer jwt')
        .send({ status: 'complete' });

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/tasks/:taskId/assignments', () => {
    it('Updates task assignments', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: taskId, objectiveId }]);
      mockDb.where.mockResolvedValue([
        { taskId, teamMemberId: memberId1 },
        { taskId, teamMemberId: memberId2 },
      ]);

      const res = await request(app)
        .patch(`/api/tasks/${taskId}/assignments`)
        .set('Authorization', 'Bearer jwt')
        .send({ team_member_ids: [memberId1, memberId2] });

      expect(res.status).toBe(200);
      expect(res.body.assigned_team_members).toHaveLength(2);
    });

    it('Clears all assignments with empty array', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: taskId, objectiveId }]);
      mockDb.where.mockResolvedValue([]);

      const res = await request(app)
        .patch(`/api/tasks/${taskId}/assignments`)
        .set('Authorization', 'Bearer jwt')
        .send({ team_member_ids: [] });

      expect(res.status).toBe(200);
      expect(res.body.assigned_team_members).toHaveLength(0);
    });

    it('Rejects Team Member managing assignments (403)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-2' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId2, teamId, role: 'Team Member' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: taskId, objectiveId }]);
      mockDb.limit.mockResolvedValueOnce([]); // Not objective owner

      const res = await request(app)
        .patch(`/api/tasks/${taskId}/assignments`)
        .set('Authorization', 'Bearer jwt')
        .send({ team_member_ids: [memberId1] });

      expect(res.status).toBe(403);
    });

    it('Returns 404 for non-existent task', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([]);

      const res = await request(app)
        .patch(`/api/tasks/${taskId}/assignments`)
        .set('Authorization', 'Bearer jwt')
        .send({ team_member_ids: [memberId1] });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/tasks/:taskId', () => {
    it('Deletes task', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: taskId, objectiveId }]);

      const res = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(200);
    });

    it('Rejects Team Member deleting task (403)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-2' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId2, teamId, role: 'Team Member' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: taskId, objectiveId }]);
      mockDb.limit.mockResolvedValueOnce([]); // Not objective owner

      const res = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(403);
    });

    it('Returns 404 for non-existent task', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([]);

      const res = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(404);
    });
  });
});
