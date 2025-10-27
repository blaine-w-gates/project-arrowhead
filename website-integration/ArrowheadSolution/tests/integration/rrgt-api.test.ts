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
  let mockDb: ReturnType<typeof vi.fn>;

  const teamId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const taskId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  const itemId = 'item-1';
  const memberId1 = 'm-1';
  const memberId2 = 'm-2';

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
    };
    vi.mocked(dbModule.getDb).mockReturnValue(mockDb as never);
  });

  describe('GET /api/rrgt/mine', () => {
    it('Returns user\'s RRGT data (tasks, items, dial)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Team Member' }]); // Auth
      
      // Task assignments
      mockDb.where.mockResolvedValueOnce([{ taskId, teamMemberId: memberId1 }]);
      
      // Tasks
      mockDb.where.mockResolvedValueOnce([{ id: taskId, title: 'My Task', status: 'in_progress' }]);
      
      // Items
      mockDb.where.mockResolvedValueOnce([
        { id: itemId, title: 'Sub-task 1', columnIndex: 3 }
      ]);
      
      // Dial state
      mockDb.limit.mockResolvedValueOnce([{
        teamMemberId: memberId1,
        leftItemId: itemId,
        rightItemId: null,
      }]);

      const res = await request(app)
        .get('/api/rrgt/mine')
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(200);
      expect(res.body.tasks).toHaveLength(1);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.dial_state).toBeDefined();
    });
  });

  describe('GET /api/rrgt/:teamMemberId - Manager God-View', () => {
    it('Account Owner can access team member data', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Account Owner' }]); // Auth
      
      // Task assignments
      mockDb.where.mockResolvedValueOnce([{ taskId, teamMemberId: memberId2 }]);
      
      // Tasks
      mockDb.where.mockResolvedValueOnce([{ id: taskId, title: 'Member Task' }]);
      
      // Items
      mockDb.where.mockResolvedValueOnce([{ id: itemId, title: 'Member Item' }]);
      
      // Dial state
      mockDb.limit.mockResolvedValueOnce([{ teamMemberId: memberId2 }]);

      const res = await request(app)
        .get(`/api/rrgt/${memberId2}`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(200);
      expect(res.body.team_member_id).toBe(memberId2);
      expect(res.body.tasks).toHaveLength(1);
      expect(res.body.items).toHaveLength(1);
    });

    it('Account Manager can access team member data', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Account Manager' }]);
      mockDb.where.mockResolvedValueOnce([]);
      mockDb.where.mockResolvedValueOnce([]);
      mockDb.where.mockResolvedValueOnce([]);
      mockDb.limit.mockResolvedValueOnce([]);

      const res = await request(app)
        .get(`/api/rrgt/${memberId2}`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(200);
    });

    it('Rejects Project Owner accessing God-view (403)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValue([{ id: memberId1, teamId, role: 'Project Owner' }]);

      const res = await request(app)
        .get(`/api/rrgt/${memberId2}`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Only Account Owner and Account Manager');
    });

    it('Rejects Team Member accessing God-view (403)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-2' });
      mockDb.limit.mockResolvedValue([{ id: memberId2, teamId, role: 'Team Member' }]);

      const res = await request(app)
        .get(`/api/rrgt/${memberId1}`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Only Account Owner and Account Manager');
    });
  });

  describe('POST /api/tasks/:taskId/items', () => {
    it('Creates RRGT item for assigned task', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Team Member' }]); // Auth
      mockDb.limit.mockResolvedValueOnce([{ id: taskId }]); // Task exists
      mockDb.limit.mockResolvedValueOnce([{ taskId, teamMemberId: memberId1 }]); // Assignment check
      mockDb.returning.mockResolvedValue([{
        id: itemId,
        taskId,
        teamMemberId: memberId1,
        columnIndex: 3,
        title: 'New sub-task',
      }]);

      const res = await request(app)
        .post(`/api/tasks/${taskId}/items`)
        .set('Authorization', 'Bearer jwt')
        .send({
          title: 'New sub-task',
          column_index: 3,
        });

      expect(res.status).toBe(201);
      expect(res.body.item.title).toBe('New sub-task');
      expect(res.body.item.columnIndex).toBe(3);
    });

    it('Rejects if user not assigned to task (403)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Team Member' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: taskId }]);
      mockDb.limit.mockResolvedValueOnce([]); // Not assigned

      const res = await request(app)
        .post(`/api/tasks/${taskId}/items`)
        .set('Authorization', 'Bearer jwt')
        .send({
          title: 'New sub-task',
          column_index: 3,
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('only create items for tasks assigned to you');
    });

    it('Returns 404 for non-existent task', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Team Member' }]);
      mockDb.limit.mockResolvedValueOnce([]); // Task not found

      const res = await request(app)
        .post(`/api/tasks/${taskId}/items`)
        .set('Authorization', 'Bearer jwt')
        .send({
          title: 'New sub-task',
          column_index: 3,
        });

      expect(res.status).toBe(404);
    });

    it('Rejects invalid column_index (400)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValue([{ id: memberId1, teamId, role: 'Team Member' }]);

      const res = await request(app)
        .post(`/api/tasks/${taskId}/items`)
        .set('Authorization', 'Bearer jwt')
        .send({
          title: 'New sub-task',
          column_index: 7, // Invalid: must be 1-6
        });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/items/:itemId', () => {
    it('Updates item title', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Team Member' }]); // Auth
      mockDb.limit.mockResolvedValueOnce([{
        id: itemId,
        teamMemberId: memberId1,
        title: 'Old title',
      }]); // Item exists and owned
      mockDb.returning.mockResolvedValue([{
        id: itemId,
        title: 'Updated title',
      }]);

      const res = await request(app)
        .put(`/api/items/${itemId}`)
        .set('Authorization', 'Bearer jwt')
        .send({ title: 'Updated title' });

      expect(res.status).toBe(200);
      expect(res.body.item.title).toBe('Updated title');
    });

    it('Rejects updating another user\'s item (403)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Team Member' }]);
      mockDb.limit.mockResolvedValueOnce([{
        id: itemId,
        teamMemberId: memberId2, // Different owner
      }]);

      const res = await request(app)
        .put(`/api/items/${itemId}`)
        .set('Authorization', 'Bearer jwt')
        .send({ title: 'Updated title' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('only update your own items');
    });

    it('Returns 404 for non-existent item', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Team Member' }]);
      mockDb.limit.mockResolvedValueOnce([]);

      const res = await request(app)
        .put(`/api/items/${itemId}`)
        .set('Authorization', 'Bearer jwt')
        .send({ title: 'Updated title' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/items/:itemId', () => {
    it('Deletes item', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Team Member' }]);
      mockDb.limit.mockResolvedValueOnce([{
        id: itemId,
        teamMemberId: memberId1,
      }]);

      const res = await request(app)
        .delete(`/api/items/${itemId}`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(200);
    });

    it('Rejects deleting another user\'s item (403)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Team Member' }]);
      mockDb.limit.mockResolvedValueOnce([{
        id: itemId,
        teamMemberId: memberId2,
      }]);

      const res = await request(app)
        .delete(`/api/items/${itemId}`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(403);
    });

    it('Returns 404 for non-existent item', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Team Member' }]);
      mockDb.limit.mockResolvedValueOnce([]);

      const res = await request(app)
        .delete(`/api/items/${itemId}`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/dial/mine', () => {
    it('Creates new dial state', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Team Member' }]); // Auth
      mockDb.limit.mockResolvedValueOnce([{ id: itemId, teamMemberId: memberId1 }]); // Left item check
      mockDb.limit.mockResolvedValueOnce([]); // No existing dial state
      mockDb.returning.mockResolvedValue([{
        teamMemberId: memberId1,
        leftItemId: itemId,
        rightItemId: null,
        isLeftPrivate: false,
        isRightPrivate: false,
      }]);

      const res = await request(app)
        .put('/api/dial/mine')
        .set('Authorization', 'Bearer jwt')
        .send({
          left_item_id: itemId,
          right_item_id: null,
        });

      expect(res.status).toBe(200);
      expect(res.body.dial_state.leftItemId).toBe(itemId);
    });

    it('Updates existing dial state with privacy flags', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Team Member' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: itemId, teamMemberId: memberId1 }]); // Left item check
      mockDb.limit.mockResolvedValueOnce([{ teamMemberId: memberId1 }]); // Existing dial state
      mockDb.returning.mockResolvedValue([{
        teamMemberId: memberId1,
        leftItemId: itemId,
        rightItemId: null,
        isLeftPrivate: true, // Incognito task flag
        isRightPrivate: false,
      }]);

      const res = await request(app)
        .put('/api/dial/mine')
        .set('Authorization', 'Bearer jwt')
        .send({
          left_item_id: itemId,
          is_left_private: true, // Mark as incognito
        });

      expect(res.status).toBe(200);
      expect(res.body.dial_state.isLeftPrivate).toBe(true);
    });

    it('Rejects item not belonging to user (400)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Team Member' }]);
      mockDb.limit.mockResolvedValueOnce([]); // Item doesn't belong to user

      const res = await request(app)
        .put('/api/dial/mine')
        .set('Authorization', 'Bearer jwt')
        .send({
          left_item_id: itemId,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('does not belong to you');
    });
  });
});
