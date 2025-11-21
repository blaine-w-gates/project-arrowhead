/**
 * Objectives API Integration Tests
 * Comprehensive coverage for CRUD operations, journey management, and locking
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import objectivesRouter from '../../server/api/objectives';
import * as supabaseModule from '../../server/auth/supabase';
import * as dbModule from '../../server/db';

vi.mock('../../server/auth/supabase');
vi.mock('../../server/db');

describe.skip('Objectives API', () => {
  let app: Express;
  let mockDb: any;

  const teamId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const projectId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const objectiveId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', objectivesRouter);
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

  describe('POST /api/projects/:projectId/objectives', () => {
    it('Creates objective with Yes (Brainstorm)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Project Owner' }]); // Auth
      mockDb.limit.mockResolvedValueOnce([{ id: projectId, teamId }]); // Project check
      mockDb.returning.mockResolvedValue([{
        id: objectiveId,
        projectId,
        name: 'Test Objective',
        currentStep: 1,
        journeyStatus: 'draft',
      }]);

      const res = await request(app)
        .post(`/api/projects/${projectId}/objectives`)
        .set('Authorization', 'Bearer jwt')
        .send({ name: 'Test Objective', start_with_brainstorm: true });

      expect(res.status).toBe(201);
      expect(res.body.objective.currentStep).toBe(1);
      expect(res.body.started_with_brainstorm).toBe(true);
    });

    it('Creates objective with No (Skip Brainstorm)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: projectId, teamId }]);
      mockDb.returning.mockResolvedValue([{
        id: objectiveId,
        projectId,
        name: 'Test Objective',
        currentStep: 11,
        journeyStatus: 'draft',
      }]);

      const res = await request(app)
        .post(`/api/projects/${projectId}/objectives`)
        .set('Authorization', 'Bearer jwt')
        .send({ name: 'Test Objective', start_with_brainstorm: false });

      expect(res.status).toBe(201);
      expect(res.body.objective.currentStep).toBe(11);
    });

    it('Rejects Team Member creating objective (403)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValue([{ id: 'm-1', teamId, role: 'Team Member' }]);

      const res = await request(app)
        .post(`/api/projects/${projectId}/objectives`)
        .set('Authorization', 'Bearer jwt')
        .send({ name: 'Test Objective' });

      expect(res.status).toBe(403);
    });

    it('Rejects missing name (400)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValue([{ id: 'm-1', teamId, role: 'Project Owner' }]);

      const res = await request(app)
        .post(`/api/projects/${projectId}/objectives`)
        .set('Authorization', 'Bearer jwt')
        .send({});

      expect(res.status).toBe(400);
    });

    it('Returns 404 for non-existent project', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([]); // No project

      const res = await request(app)
        .post(`/api/projects/${projectId}/objectives`)
        .set('Authorization', 'Bearer jwt')
        .send({ name: 'Test Objective' });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/projects/:projectId/objectives', () => {
    it('Lists objectives', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: projectId }]);
      mockDb.orderBy.mockResolvedValue([
        { id: objectiveId, name: 'Objective 1', journeyStatus: 'draft', currentStep: 5 }
      ]);

      const res = await request(app)
        .get(`/api/projects/${projectId}/objectives`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(200);
      expect(res.body.objectives).toHaveLength(1);
    });

    it('Filters by journey_status=draft', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: projectId }]);
      mockDb.orderBy.mockResolvedValue([
        { id: objectiveId, journeyStatus: 'draft' }
      ]);

      const res = await request(app)
        .get(`/api/projects/${projectId}/objectives?journey_status=draft`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(200);
    });

    it('Returns 404 for non-existent project', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([]);

      const res = await request(app)
        .get(`/api/projects/${projectId}/objectives`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/objectives/:objectiveId/resume', () => {
    it('Returns draft objective state', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{
        id: objectiveId,
        name: 'Test',
        currentStep: 3,
        journeyStatus: 'draft',
        brainstormData: { step1_imitate: 'test' },
      }]);

      const res = await request(app)
        .get(`/api/objectives/${objectiveId}/resume`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(200);
      expect(res.body.objective.current_step).toBe(3);
      expect(res.body.objective.brainstorm_data).toBeDefined();
    });

    it('Returns 404 for non-existent objective', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([]);

      const res = await request(app)
        .get(`/api/objectives/${objectiveId}/resume`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/objectives/:objectiveId', () => {
    it('Updates objective name', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: objectiveId }]);
      mockDb.returning.mockResolvedValue([{ id: objectiveId, name: 'Updated' }]);

      const res = await request(app)
        .put(`/api/objectives/${objectiveId}`)
        .set('Authorization', 'Bearer jwt')
        .send({ name: 'Updated' });

      expect(res.status).toBe(200);
    });

    it('Updates journey step', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: objectiveId }]);
      mockDb.returning.mockResolvedValue([{ id: objectiveId, currentStep: 6 }]);

      const res = await request(app)
        .put(`/api/objectives/${objectiveId}`)
        .set('Authorization', 'Bearer jwt')
        .send({ current_step: 6 });

      expect(res.status).toBe(200);
    });

    it('Updates brainstorm data', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: objectiveId }]);
      mockDb.returning.mockResolvedValue([{ id: objectiveId, brainstormData: { step1_imitate: 'test' } }]);

      const res = await request(app)
        .put(`/api/objectives/${objectiveId}`)
        .set('Authorization', 'Bearer jwt')
        .send({ brainstorm_data: { step1_imitate: 'test' } });

      expect(res.status).toBe(200);
    });

    it('Rejects Team Member updating (403)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValue([{ id: 'm-1', teamId, role: 'Team Member' }]);

      const res = await request(app)
        .put(`/api/objectives/${objectiveId}`)
        .set('Authorization', 'Bearer jwt')
        .send({ name: 'Updated' });

      expect(res.status).toBe(403);
    });

    it('Returns 404 for non-existent objective', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([]);

      const res = await request(app)
        .put(`/api/objectives/${objectiveId}`)
        .set('Authorization', 'Bearer jwt')
        .send({ name: 'Updated' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/objectives/:objectiveId/lock', () => {
    it('Acquires lock', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: objectiveId }]);

      const res = await request(app)
        .post(`/api/objectives/${objectiveId}/lock`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(200);
      expect(res.body.lock.expires_at).toBeDefined();
    });

    it('Renews existing lock by same user', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: objectiveId }]);

      // First lock
      await request(app)
        .post(`/api/objectives/${objectiveId}/lock`)
        .set('Authorization', 'Bearer jwt');

      // Renew lock
      const res = await request(app)
        .post(`/api/objectives/${objectiveId}/lock`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(200);
    });

    it('Returns 404 for non-existent objective', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([]);

      const res = await request(app)
        .post(`/api/objectives/${objectiveId}/lock`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/objectives/:objectiveId/lock', () => {
    it('Releases lock', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: objectiveId }]);

      // Acquire lock first
      await request(app)
        .post(`/api/objectives/${objectiveId}/lock`)
        .set('Authorization', 'Bearer jwt');

      mockDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Project Owner' }]);

      // Release lock
      const res = await request(app)
        .delete(`/api/objectives/${objectiveId}/lock`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(200);
    });

    it('Returns 404 if no lock exists', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValue([{ id: 'm-1', teamId, role: 'Project Owner' }]);

      const res = await request(app)
        .delete(`/api/objectives/${objectiveId}/lock`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(404);
    });
  });

  describe('Lock Concurrency', () => {
    it('Blocks update when locked by another user', async () => {
      // User 1 acquires lock
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Project Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: objectiveId }]);

      await request(app)
        .post(`/api/objectives/${objectiveId}/lock`)
        .set('Authorization', 'Bearer jwt');

      // User 2 tries to update
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-2' });
      mockDb.limit.mockResolvedValueOnce([{ id: 'm-2', teamId, role: 'Project Owner' }]);

      const res = await request(app)
        .put(`/api/objectives/${objectiveId}`)
        .set('Authorization', 'Bearer jwt-2')
        .send({ name: 'Updated' });

      expect(res.status).toBe(423); // Locked
    });
  });
});
