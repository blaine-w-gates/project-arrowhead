/**
 * Touchbases API Integration Tests
 * Comprehensive coverage for CRUD operations, privacy, and 24hr window logic
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import touchbasesRouter from '../../server/api/touchbases';
import * as supabaseModule from '../../server/auth/supabase';
import * as dbModule from '../../server/db';

vi.mock('../../server/auth/supabase');
vi.mock('../../server/db');

describe('Touchbases API', () => {
  let app: Express;
  let mockDb: ReturnType<typeof vi.fn>;

  const teamId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const objectiveId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  const touchbaseId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  const memberId1 = 'm-1';
  const memberId2 = 'm-2';

  const sampleResponses = {
    q1_working_on: 'Feature development',
    q2_help_needed: 'Design review',
    q3_blockers: 'None',
    q4_wins: 'Shipped v1',
    q5_priorities: 'Testing',
    q6_resource_needs: 'QA support',
    q7_timeline_change: 'On track',
  };

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', touchbasesRouter);
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
    vi.mocked(dbModule.getDb).mockReturnValue(mockDb as never);
  });

  describe('POST /api/objectives/:objectiveId/touchbases', () => {
    it('Creates touchbase', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Project Owner' }]); // Auth
      mockDb.limit.mockResolvedValueOnce([{ id: objectiveId }]); // Objective check
      mockDb.returning.mockResolvedValue([{
        id: touchbaseId,
        objectiveId,
        teamMemberId: memberId2,
        createdBy: memberId1,
        touchbaseDate: new Date(),
        responses: sampleResponses,
        editable: true,
        createdAt: new Date(),
      }]);

      const res = await request(app)
        .post(`/api/objectives/${objectiveId}/touchbases`)
        .set('Authorization', 'Bearer jwt')
        .send({
          team_member_id: memberId2,
          touchbase_date: new Date().toISOString(),
          responses: sampleResponses,
        });

      expect(res.status).toBe(201);
      expect(res.body.touchbase.responses.q1_working_on).toBe('Feature development');
    });

    it('Rejects Team Member creating (403)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-2' });
      mockDb.limit.mockResolvedValue([{ id: memberId2, teamId, role: 'Team Member' }]);

      const res = await request(app)
        .post(`/api/objectives/${objectiveId}/touchbases`)
        .set('Authorization', 'Bearer jwt')
        .send({
          team_member_id: memberId2,
          touchbase_date: new Date().toISOString(),
          responses: sampleResponses,
        });

      expect(res.status).toBe(403);
    });

    it('Rejects missing responses (400)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValue([{ id: memberId1, teamId, role: 'Project Owner' }]);

      const res = await request(app)
        .post(`/api/objectives/${objectiveId}/touchbases`)
        .set('Authorization', 'Bearer jwt')
        .send({
          team_member_id: memberId2,
          touchbase_date: new Date().toISOString(),
        });

      expect(res.status).toBe(400);
    });

    it('Returns 404 for non-existent objective', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([]); // No objective

      const res = await request(app)
        .post(`/api/objectives/${objectiveId}/touchbases`)
        .set('Authorization', 'Bearer jwt')
        .send({
          team_member_id: memberId2,
          touchbase_date: new Date().toISOString(),
          responses: sampleResponses,
        });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/objectives/:objectiveId/touchbases - Privacy Logic', () => {
    it('Returns touchbases for Account Owner (full access)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Account Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: objectiveId }]);
      mockDb.orderBy.mockResolvedValue([
        {
          id: touchbaseId,
          createdBy: memberId2,
          teamMemberId: 'm-3',
          responses: sampleResponses,
          createdAt: new Date(),
        }
      ]);

      const res = await request(app)
        .get(`/api/objectives/${objectiveId}/touchbases`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(200);
      expect(res.body.touchbases).toHaveLength(1);
    });

    it('Filters touchbases by member_id', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Account Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: objectiveId }]);
      mockDb.orderBy.mockResolvedValue([
        { id: touchbaseId, createdBy: memberId1, teamMemberId: memberId2, createdAt: new Date() }
      ]);

      const res = await request(app)
        .get(`/api/objectives/${objectiveId}/touchbases?member_id=${memberId2}`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(200);
    });

    it('Returns 404 for non-existent objective', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([]);

      const res = await request(app)
        .get(`/api/objectives/${objectiveId}/touchbases`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/touchbases/:touchbaseId - 24hr Window Logic', () => {
    it('Updates touchbase within 24hr window', async () => {
      const recentDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago

      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{
        id: touchbaseId,
        createdBy: memberId1,
        teamMemberId: memberId2,
        createdAt: recentDate,
      }]);
      mockDb.returning.mockResolvedValue([{
        id: touchbaseId,
        responses: { ...sampleResponses, q1_working_on: 'Updated task' },
      }]);

      const res = await request(app)
        .put(`/api/touchbases/${touchbaseId}`)
        .set('Authorization', 'Bearer jwt')
        .send({
          responses: { ...sampleResponses, q1_working_on: 'Updated task' },
        });

      expect(res.status).toBe(200);
    });

    it('Blocks update outside 24hr window (403)', async () => {
      const oldDate = new Date(Date.now() - 1000 * 60 * 60 * 25); // 25 hours ago

      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{
        id: touchbaseId,
        createdBy: memberId1,
        createdAt: oldDate,
      }]);

      const res = await request(app)
        .put(`/api/touchbases/${touchbaseId}`)
        .set('Authorization', 'Bearer jwt')
        .send({ responses: sampleResponses });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('24 hours');
    });

    it('Blocks non-creator from updating (403)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-2' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId2, teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{
        id: touchbaseId,
        createdBy: memberId1, // Different creator
        createdAt: new Date(),
      }]);

      const res = await request(app)
        .put(`/api/touchbases/${touchbaseId}`)
        .set('Authorization', 'Bearer jwt')
        .send({ responses: sampleResponses });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Only the creator');
    });

    it('Returns 404 for non-existent touchbase', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([]);

      const res = await request(app)
        .put(`/api/touchbases/${touchbaseId}`)
        .set('Authorization', 'Bearer jwt')
        .send({ responses: sampleResponses });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/touchbases/:touchbaseId', () => {
    it('Deletes touchbase', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: touchbaseId }]);

      const res = await request(app)
        .delete(`/api/touchbases/${touchbaseId}`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(200);
    });

    it('Rejects Team Member deleting (403)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-2' });
      mockDb.limit.mockResolvedValue([{ id: memberId2, teamId, role: 'Team Member' }]);

      const res = await request(app)
        .delete(`/api/touchbases/${touchbaseId}`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(403);
    });

    it('Returns 404 for non-existent touchbase', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([]);

      const res = await request(app)
        .delete(`/api/touchbases/${touchbaseId}`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/touchbases/:touchbaseId/lock', () => {
    it('Acquires lock', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{
        id: touchbaseId,
        createdBy: memberId1,
      }]);

      const res = await request(app)
        .post(`/api/touchbases/${touchbaseId}/lock`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(200);
      expect(res.body.lock.expires_at).toBeDefined();
    });

    it('Blocks non-creator from locking (403)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-2' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId2, teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{
        id: touchbaseId,
        createdBy: memberId1, // Different creator
      }]);

      const res = await request(app)
        .post(`/api/touchbases/${touchbaseId}/lock`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(403);
    });

    it('Returns 404 for non-existent touchbase', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([]);

      const res = await request(app)
        .post(`/api/touchbases/${touchbaseId}/lock`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/touchbases/:touchbaseId/lock', () => {
    it('Releases lock', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{
        id: touchbaseId,
        createdBy: memberId1,
      }]);

      // Acquire lock first
      await request(app)
        .post(`/api/touchbases/${touchbaseId}/lock`)
        .set('Authorization', 'Bearer jwt');

      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Project Owner' }]);

      // Release lock
      const res = await request(app)
        .delete(`/api/touchbases/${touchbaseId}/lock`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(200);
    });

    it('Returns 404 if no lock exists', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValue([{ id: memberId1, teamId, role: 'Project Owner' }]);

      const res = await request(app)
        .delete(`/api/touchbases/${touchbaseId}/lock`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(404);
    });
  });
});
