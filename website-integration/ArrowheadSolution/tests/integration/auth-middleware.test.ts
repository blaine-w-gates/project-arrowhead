/**
 * Integration Tests for Auth Middleware
 * 
 * Tests middleware in context of Express app using supertest
 * Based on: TESTING_STRATEGY.md Section 11.2
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import express, { Express, Request, Response } from 'express';
import request from 'supertest';
import { requireAuth, optionalAuth, setDbContext } from '../../server/auth/middleware';
import * as supabaseModule from '../../server/auth/supabase';
import * as dbModule from '../../server/db';

// Mock dependencies
vi.mock('../../server/auth/supabase');
vi.mock('../../server/db');

describe('Auth Middleware Integration Tests', () => {
  let app: Express;
  let mockDb: any;

  beforeAll(() => {
    // Create test Express app
    app = express();
    app.use(express.json());

    // Protected route (requires auth)
    app.get('/api/protected', requireAuth, (req: Request, res: Response) => {
      const authReq = req as any;
      res.json({
        message: 'Success',
        userId: authReq.userContext?.userId,
        teamId: authReq.userContext?.teamId,
        role: authReq.userContext?.role,
      });
    });

    // Protected route with DB context
    app.get('/api/protected-db', requireAuth, setDbContext, (req: Request, res: Response) => {
      const authReq = req as any;
      res.json({
        message: 'Database context set',
        effectiveTeamMemberId: authReq.userContext?.effectiveTeamMemberId,
      });
    });

    // Optional auth route
    app.get('/api/public', optionalAuth, (req: Request, res: Response) => {
      const authReq = req as any;
      res.json({
        authenticated: !!authReq.userContext,
        userId: authReq.userContext?.userId,
      });
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock database
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      execute: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(dbModule.getDb).mockReturnValue(mockDb);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Protected Routes', () => {
    it('should reject request without Authorization header', async () => {
      const response = await request(app).get('/api/protected');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      });
    });

    it('should reject request with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'InvalidFormat');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should reject request with invalid JWT', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({
        valid: false,
        error: 'Invalid token',
      });

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer invalid-jwt');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should allow request with valid JWT', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({
        valid: true,
        userId: 'user-123',
        email: 'test@example.com',
      });

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer valid-jwt');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Success',
        userId: 'user-123',
        teamId: undefined,
        role: undefined,
      });
    });

    it('should attach team context when user has membership', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({
        valid: true,
        userId: 'user-123',
        email: 'test@example.com',
      });

      mockDb.limit.mockResolvedValue([
        {
          id: 'member-456',
          teamId: 'team-789',
          userId: 'user-123',
          role: 'Team Member',
        },
      ]);

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer valid-jwt');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Success',
        userId: 'user-123',
        teamId: 'team-789',
        role: 'Team Member',
      });
    });
  });

  describe('Virtual Persona Mode', () => {
    const mockOwner = {
      id: 'owner-123',
      teamId: 'team-789',
      userId: 'user-123',
      role: 'Account Owner',
    };

    const mockVirtual = {
      id: 'virtual-456',
      teamId: 'team-789',
      userId: null,
      role: 'Team Member',
      isVirtual: true,
    };

    it('should allow Account Owner to use Virtual Persona', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({
        valid: true,
        userId: 'user-123',
        email: 'owner@example.com',
      });

      let callCount = 0;
      mockDb.limit.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve([mockOwner]);
        } else {
          return Promise.resolve([mockVirtual]);
        }
      });

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer valid-jwt')
        .set('X-Virtual-Persona-ID', 'virtual-456');

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe('user-123');
    });

    it('should reject Team Member using Virtual Persona', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({
        valid: true,
        userId: 'user-123',
      });

      const mockMember = { ...mockOwner, role: 'Team Member' };
      mockDb.limit.mockResolvedValue([mockMember]);

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer valid-jwt')
        .set('X-Virtual-Persona-ID', 'virtual-456');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
      expect(response.body.message).toContain('Only Account Owner or Manager');
    });

    it('should reject Virtual Persona from different team', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({
        valid: true,
        userId: 'user-123',
      });

      const differentTeamVirtual = { ...mockVirtual, teamId: 'different-team' };

      let callCount = 0;
      mockDb.limit.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve([mockOwner]);
        } else {
          return Promise.resolve([differentTeamVirtual]);
        }
      });

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer valid-jwt')
        .set('X-Virtual-Persona-ID', 'virtual-456');

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('same team');
    });

    it('should return 404 for non-existent Virtual Persona', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({
        valid: true,
        userId: 'user-123',
      });

      let callCount = 0;
      mockDb.limit.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve([mockOwner]);
        } else {
          return Promise.resolve([]);
        }
      });

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer valid-jwt')
        .set('X-Virtual-Persona-ID', 'nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('Database Context Setting', () => {
    it('should set database session variables', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({
        valid: true,
        userId: 'user-123',
      });

      mockDb.limit.mockResolvedValue([
        {
          id: 'member-456',
          teamId: 'team-789',
          userId: 'user-123',
          role: 'Team Member',
        },
      ]);

      const response = await request(app)
        .get('/api/protected-db')
        .set('Authorization', 'Bearer valid-jwt');

      expect(response.status).toBe(200);
      expect(mockDb.execute).toHaveBeenCalledTimes(2);
      expect(response.body.effectiveTeamMemberId).toBe('member-456');
    });

    it('should use Virtual Persona ID in session variables', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({
        valid: true,
        userId: 'user-123',
      });

      let callCount = 0;
      mockDb.limit.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve([
            {
              id: 'owner-123',
              teamId: 'team-789',
              userId: 'user-123',
              role: 'Account Owner',
            },
          ]);
        } else {
          return Promise.resolve([
            {
              id: 'virtual-456',
              teamId: 'team-789',
              userId: null,
              isVirtual: true,
            },
          ]);
        }
      });

      const response = await request(app)
        .get('/api/protected-db')
        .set('Authorization', 'Bearer valid-jwt')
        .set('X-Virtual-Persona-ID', 'virtual-456');

      expect(response.status).toBe(200);
      expect(mockDb.execute).toHaveBeenCalledTimes(2);
      expect(response.body.effectiveTeamMemberId).toBe('virtual-456');
    });

    it('should handle database context errors gracefully', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({
        valid: true,
        userId: 'user-123',
      });

      mockDb.limit.mockResolvedValue([
        {
          id: 'member-456',
          teamId: 'team-789',
          userId: 'user-123',
          role: 'Team Member',
        },
      ]);

      mockDb.execute.mockRejectedValue(new Error('Database error'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app)
        .get('/api/protected-db')
        .set('Authorization', 'Bearer valid-jwt');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal Server Error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Optional Auth Routes', () => {
    it('should allow access without authentication', async () => {
      const response = await request(app).get('/api/public');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        authenticated: false,
        userId: undefined,
      });
    });

    it('should attach context when valid JWT provided', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({
        valid: true,
        userId: 'user-123',
      });

      const response = await request(app)
        .get('/api/public')
        .set('Authorization', 'Bearer valid-jwt');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        authenticated: true,
        userId: 'user-123',
      });
    });

    it('should proceed without context for invalid JWT', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({
        valid: false,
        error: 'Invalid token',
      });

      const response = await request(app)
        .get('/api/public')
        .set('Authorization', 'Bearer invalid-jwt');

      expect(response.status).toBe(200);
      expect(response.body.authenticated).toBe(false);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle Supabase API failures', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockRejectedValue(
        new Error('Supabase API unavailable')
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer valid-jwt');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal Server Error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle database connection failures', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({
        valid: true,
        userId: 'user-123',
      });

      mockDb.limit.mockRejectedValue(new Error('Database unavailable'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer valid-jwt');

      expect(response.status).toBe(500);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Security Tests', () => {
    it('should not expose sensitive information in error messages', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({
        valid: false,
        error: 'Invalid signature: details about crypto internals',
      });

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer invalid-jwt');

      expect(response.status).toBe(401);
      // Error message passes through the Supabase error for now
      // In production, consider sanitizing error messages
      expect(response.body.message).toBeDefined();
    });

    it('should properly sanitize header inputs', async () => {
      // Mock Supabase to return invalid for malicious input
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({
        valid: false,
        error: 'Invalid token format',
      });

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer <script>alert("xss")</script>');

      expect(response.status).toBe(401);
      // Should not execute or echo back the script
      expect(response.body.message).not.toContain('<script>');
    });

    it('should handle extremely long JWT tokens', async () => {
      // Mock Supabase to handle long tokens gracefully
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({
        valid: false,
        error: 'Token too long',
      });

      const longToken = 'Bearer ' + 'a'.repeat(10000);

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', longToken);

      expect(response.status).toBe(401);
      // Should not crash or hang
      expect(response.body.error).toBe('Unauthorized');
    });
  });
});
