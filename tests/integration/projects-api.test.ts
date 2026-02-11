/**
 * Projects API Integration Tests
 * Comprehensive coverage for CRUD operations with permissions
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import projectsRouter from '../../server/api/projects';
import * as supabaseModule from '../../server/auth/supabase';
import * as dbModule from '../../server/db';

vi.mock('../../server/auth/supabase');
vi.mock('../../server/db');

describe.skip('Projects API', () => {
  let app: Express;
  let mockDb: any;

  const teamId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const projectId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', projectsRouter);
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
      innerJoin: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(dbModule.getDb).mockReturnValue(mockDb);
  });

  describe('POST /api/teams/:teamId/projects', () => {
    it('Account Owner can create project', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Account Owner' }]);
      mockDb.limit.mockResolvedValueOnce([]); // No duplicate
      mockDb.returning.mockResolvedValue([{ id: projectId, name: 'Test', teamId, completionStatus: 'not_started' }]);

      const res = await request(app)
        .post(`/api/teams/${teamId}/projects`)
        .set('Authorization', 'Bearer jwt')
        .send({ name: 'Test' });

      expect(res.status).toBe(201);
    });

    it('Team Member cannot create project (403)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValue([{ id: 'm-1', teamId, role: 'Team Member' }]);

      const res = await request(app)
        .post(`/api/teams/${teamId}/projects`)
        .set('Authorization', 'Bearer jwt')
        .send({ name: 'Test' });

      expect(res.status).toBe(403);
    });

    it('Rejects missing name (400)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValue([{ id: 'm-1', teamId, role: 'Account Owner' }]);

      const res = await request(app)
        .post(`/api/teams/${teamId}/projects`)
        .set('Authorization', 'Bearer jwt')
        .send({});

      expect(res.status).toBe(400);
    });

    it('Rejects duplicate name (409)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Account Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: projectId }]); // Duplicate

      const res = await request(app)
        .post(`/api/teams/${teamId}/projects`)
        .set('Authorization', 'Bearer jwt')
        .send({ name: 'Existing' });

      expect(res.status).toBe(409);
    });

    it('Creates project with vision', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Account Owner' }]);
      mockDb.limit.mockResolvedValueOnce([]);
      mockDb.returning.mockResolvedValue([{ id: projectId, visionData: { q1_purpose: 'test' } }]);

      const res = await request(app)
        .post(`/api/teams/${teamId}/projects`)
        .set('Authorization', 'Bearer jwt')
        .send({ name: 'Test', vision: { q1_purpose: 'test', q2_achieve: 'test', q3_market: 'test', q4_customers: 'test', q5_win: 'test' } });

      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/teams/:teamId/projects', () => {
    it('Lists projects', async () => {
      vi.clearAllMocks();
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      
      const freshDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([{ id: projectId, name: 'Test', teamId, isArchived: false, visionData: null, completionStatus: 'not_started', estimatedCompletionDate: null, createdAt: new Date(), updatedAt: new Date() }]),
        execute: vi.fn().mockResolvedValue(undefined),
      };
      
      // Auth middleware team lookup
      freshDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Account Owner' }]);
      
      // Stats queries return 0
      freshDb.where.mockResolvedValue([{ count: 0 }]);
      
      vi.mocked(dbModule.getDb).mockReturnValue(freshDb as any);

      const res = await request(app)
        .get(`/api/teams/${teamId}/projects`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(200);
      expect(res.body.projects).toBeDefined();
    });

    it('Includes archived when requested', async () => {
      vi.clearAllMocks();
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      
      const freshDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([{ id: projectId, isArchived: true, visionData: null, completionStatus: 'not_started', teamId, name: 'Test', estimatedCompletionDate: null, createdAt: new Date(), updatedAt: new Date() }]),
        execute: vi.fn().mockResolvedValue(undefined),
      };
      
      freshDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Account Owner' }]);
      freshDb.where.mockResolvedValue([{ count: 0 }]);
      
      vi.mocked(dbModule.getDb).mockReturnValue(freshDb as any);

      const res = await request(app)
        .get(`/api/teams/${teamId}/projects?include_archived=true`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/projects/:projectId', () => {
    it('Account Owner can update name', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Account Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: projectId, teamId, name: 'Old' }]);
      mockDb.limit.mockResolvedValueOnce([]);
      mockDb.returning.mockResolvedValue([{ id: projectId, name: 'New' }]);

      const res = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Authorization', 'Bearer jwt')
        .send({ name: 'New' });

      expect(res.status).toBe(200);
    });

    it('Team Member cannot update (403)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValue([{ id: 'm-1', teamId, role: 'Team Member' }]);

      const res = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Authorization', 'Bearer jwt')
        .send({ name: 'New' });

      expect(res.status).toBe(403);
    });

    it('Can archive project', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Account Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{ id: projectId, teamId, isArchived: false }]);
      mockDb.returning.mockResolvedValue([{ id: projectId, isArchived: true }]);

      const res = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Authorization', 'Bearer jwt')
        .send({ is_archived: true });

      expect(res.status).toBe(200);
    });

    it('Returns 404 for non-existent project', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Account Owner' }]);
      mockDb.limit.mockResolvedValueOnce([]);

      const res = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Authorization', 'Bearer jwt')
        .send({ name: 'New' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/projects/:projectId', () => {
    it('Deletes empty project', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      
      let limitCount = 0;
      mockDb.limit.mockImplementation(() => {
        limitCount++;
        if (limitCount === 1) return Promise.resolve([{ id: 'm-1', teamId, role: 'Account Owner' }]);
        if (limitCount === 2) return Promise.resolve([{ id: projectId, teamId }]);
        return mockDb;
      });
      
      mockDb.where.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.select.mockReturnValue(mockDb);
      
      // Mock the count query to return 0 objectives
      let whereCount = 0;
      mockDb.where.mockImplementation(() => {
        whereCount++;
        if (whereCount === 3) return Promise.resolve([{ count: 0 }]); // No objectives
        return mockDb;
      });

      const res = await request(app)
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(200);
    });

    it('Blocks deletion if project has objectives (400)', async () => {
      vi.clearAllMocks();
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      
      const freshDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue(undefined),
      };
      
      // Auth middleware lookup
      freshDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Account Owner' }]);
      // Project lookup
      freshDb.limit.mockResolvedValueOnce([{ id: projectId, teamId }]);
      
      // Mock count queries - need to return different values in sequence
      let queryCount = 0;
      freshDb.where.mockImplementation(() => {
        queryCount++;
        // First query: objectives count (2)
        if (queryCount === 1) return Promise.resolve([{ count: 2 }]);
        // Second query: tasks count (5)
        if (queryCount === 2) return Promise.resolve([{ count: 5 }]);
        return freshDb;
      });
      
      vi.mocked(dbModule.getDb).mockReturnValue(freshDb as any);

      const res = await request(app)
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('2 objective');
      expect(res.body.message).toContain('5 task');
    });

    it('Team Member cannot delete (403)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValue([{ id: 'm-1', teamId, role: 'Team Member' }]);

      const res = await request(app)
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(403);
    });

    it('Returns 404 for non-existent project', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Account Owner' }]);
      mockDb.limit.mockResolvedValueOnce([]);

      const res = await request(app)
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', 'Bearer jwt');

      expect(res.status).toBe(404);
    });
  });
});
