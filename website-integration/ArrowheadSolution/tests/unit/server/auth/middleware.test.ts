/**
 * Unit Tests for Supabase Auth Middleware
 * 
 * Tests requireAuth, optionalAuth, setDbContext, and Virtual Persona logic
 * Based on: TESTING_STRATEGY.md Section 11.2 & Phase 2 Task 1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  requireAuth,
  optionalAuth,
  setDbContext,
  setDatabaseSessionContext,
  AuthenticatedRequest,
  UserContext,
} from '../../../../server/auth/middleware';
import * as supabaseModule from '../../../../server/auth/supabase';
import * as dbModule from '../../../../server/db';
import { sql } from 'drizzle-orm';

// Mock dependencies
vi.mock('../../../../server/auth/supabase');
vi.mock('../../../../server/db');

describe('requireAuth Middleware', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock request
    mockReq = {
      headers: {},
      userContext: undefined,
    };

    // Create mock response with chainable methods
    jsonSpy = vi.fn();
    statusSpy = vi.fn(() => ({ json: jsonSpy }));
    mockRes = {
      status: statusSpy as unknown as Response['status'],
      json: jsonSpy,
    };

    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('JWT Validation', () => {
    it('should reject requests without Authorization header', async () => {
      await requireAuth(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject requests with malformed Authorization header', async () => {
      mockReq.headers = { authorization: 'InvalidFormat' };

      await requireAuth(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid JWT', async () => {
      mockReq.headers = { authorization: 'Bearer invalid-jwt-token' };

      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({
        valid: false,
        error: 'Invalid token signature',
      });

      await requireAuth(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid token signature',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should accept valid JWT and proceed to next middleware', async () => {
      mockReq.headers = { authorization: 'Bearer valid-jwt-token' };

      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({
        valid: true,
        userId: 'user-123',
        email: 'test@example.com',
      });

      // Mock database returning no team membership
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(dbModule.getDb).mockReturnValue(mockDb as any);

      await requireAuth(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.userContext).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
      });
      expect(mockNext).toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalled();
    });
  });

  describe('Team Membership Lookup', () => {
    beforeEach(() => {
      mockReq.headers = { authorization: 'Bearer valid-jwt-token' };
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({
        valid: true,
        userId: 'user-123',
        email: 'test@example.com',
      });
    });

    it('should attach team context when user has team membership', async () => {
      const mockMembership = {
        id: 'member-456',
        teamId: 'team-789',
        userId: 'user-123',
        role: 'Team Member',
        name: 'Test User',
        email: 'test@example.com',
        isVirtual: false,
      };

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockMembership]),
      };
      vi.mocked(dbModule.getDb).mockReturnValue(mockDb as any);

      await requireAuth(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.userContext).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        teamMemberId: 'member-456',
        teamId: 'team-789',
        role: 'Team Member',
        effectiveTeamMemberId: 'member-456',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle user with no team membership', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(dbModule.getDb).mockReturnValue(mockDb as any);

      await requireAuth(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.userContext).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
      });
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Virtual Persona Mode', () => {
    const mockOwnerMembership = {
      id: 'owner-123',
      teamId: 'team-789',
      userId: 'user-123',
      role: 'Account Owner',
      name: 'Owner User',
      email: 'owner@example.com',
      isVirtual: false,
    };

    const mockVirtualPersona = {
      id: 'virtual-456',
      teamId: 'team-789',
      userId: null,
      role: 'Team Member',
      name: 'Virtual Persona',
      email: null,
      isVirtual: true,
    };

    beforeEach(() => {
      mockReq.headers = { authorization: 'Bearer valid-jwt-token' };
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({
        valid: true,
        userId: 'user-123',
        email: 'owner@example.com',
      });
    });

    it('should allow Account Owner to use Virtual Persona', async () => {
      mockReq.headers = {
        authorization: 'Bearer valid-jwt-token',
        'x-virtual-persona-id': 'virtual-456',
      };

      let callCount = 0;
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve([mockOwnerMembership]);
          } else {
            return Promise.resolve([mockVirtualPersona]);
          }
        }),
      };
      vi.mocked(dbModule.getDb).mockReturnValue(mockDb as any);

      await requireAuth(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.userContext?.virtualPersonaId).toBe('virtual-456');
      expect(mockReq.userContext?.effectiveTeamMemberId).toBe('virtual-456');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow Account Manager to use Virtual Persona', async () => {
      mockReq.headers = {
        authorization: 'Bearer valid-jwt-token',
        'x-virtual-persona-id': 'virtual-456',
      };

      const managerMembership = { ...mockOwnerMembership, role: 'Account Manager' };

      let callCount = 0;
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve([managerMembership]);
          } else {
            return Promise.resolve([mockVirtualPersona]);
          }
        }),
      };
      vi.mocked(dbModule.getDb).mockReturnValue(mockDb as any);

      await requireAuth(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.userContext?.virtualPersonaId).toBe('virtual-456');
      expect(mockReq.userContext?.effectiveTeamMemberId).toBe('virtual-456');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject Team Member trying to use Virtual Persona', async () => {
      mockReq.headers = {
        authorization: 'Bearer valid-jwt-token',
        'x-virtual-persona-id': 'virtual-456',
      };

      const memberMembership = { ...mockOwnerMembership, role: 'Team Member' };

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([memberMembership]),
      };
      vi.mocked(dbModule.getDb).mockReturnValue(mockDb as any);

      await requireAuth(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Only Account Owner or Manager can use Virtual Persona mode',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject Virtual Persona from different team', async () => {
      mockReq.headers = {
        authorization: 'Bearer valid-jwt-token',
        'x-virtual-persona-id': 'virtual-456',
      };

      const differentTeamPersona = { ...mockVirtualPersona, teamId: 'different-team' };

      let callCount = 0;
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve([mockOwnerMembership]);
          } else {
            return Promise.resolve([differentTeamPersona]);
          }
        }),
      };
      vi.mocked(dbModule.getDb).mockReturnValue(mockDb as any);

      await requireAuth(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Virtual persona must be in the same team',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 404 when Virtual Persona not found', async () => {
      mockReq.headers = {
        authorization: 'Bearer valid-jwt-token',
        'x-virtual-persona-id': 'nonexistent-persona',
      };

      let callCount = 0;
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve([mockOwnerMembership]);
          } else {
            return Promise.resolve([]);
          }
        }),
      };
      vi.mocked(dbModule.getDb).mockReturnValue(mockDb as any);

      await requireAuth(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'Virtual persona not found',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockReq.headers = { authorization: 'Bearer valid-jwt-token' };

      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({
        valid: true,
        userId: 'user-123',
      });

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockRejectedValue(new Error('Database connection failed')),
      };
      vi.mocked(dbModule.getDb).mockReturnValue(mockDb as any);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await requireAuth(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Authentication failed',
      });
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle Supabase verification errors', async () => {
      mockReq.headers = { authorization: 'Bearer valid-jwt-token' };

      vi.mocked(supabaseModule.verifySupabaseJwt).mockRejectedValue(
        new Error('Supabase API error')
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await requireAuth(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

describe('optionalAuth Middleware', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = { headers: {} };
    mockRes = {
      status: vi.fn(() => ({ json: vi.fn() })) as any,
    };
    mockNext = vi.fn();
  });

  it('should proceed without context when no Authorization header', async () => {
    await optionalAuth(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

    expect(mockReq.userContext).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should attach context for valid JWT', async () => {
    mockReq.headers = { authorization: 'Bearer valid-jwt' };

    vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({
      valid: true,
      userId: 'user-123',
      email: 'test@example.com',
    });

    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(dbModule.getDb).mockReturnValue(mockDb as any);

    await optionalAuth(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

    expect(mockReq.userContext?.userId).toBe('user-123');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should proceed without context for invalid JWT', async () => {
    mockReq.headers = { authorization: 'Bearer invalid-jwt' };

    vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({
      valid: false,
      error: 'Invalid token',
    });

    await optionalAuth(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    // Should not throw error for optional auth
  });
});

describe('setDatabaseSessionContext', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockDb: any;
  let executeSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    executeSpy = vi.fn().mockResolvedValue(undefined);
    mockDb = {
      execute: executeSpy,
    };
    vi.mocked(dbModule.getDb).mockReturnValue(mockDb);
  });

  it('should set session variables for authenticated user', async () => {
    mockReq = {
      userContext: {
        userId: 'user-123',
        teamMemberId: 'member-456',
        effectiveTeamMemberId: 'member-456',
      } as UserContext,
    };

    await setDatabaseSessionContext(mockReq as AuthenticatedRequest);

    expect(executeSpy).toHaveBeenCalledTimes(2);
    // Check that sql template was used (can't easily check exact SQL due to template)
    expect(executeSpy).toHaveBeenCalled();
  });

  it('should use Virtual Persona ID when set', async () => {
    mockReq = {
      userContext: {
        userId: 'user-123',
        teamMemberId: 'member-456',
        virtualPersonaId: 'virtual-789',
        effectiveTeamMemberId: 'virtual-789',
      } as UserContext,
    };

    await setDatabaseSessionContext(mockReq as AuthenticatedRequest);

    expect(executeSpy).toHaveBeenCalledTimes(2);
  });

  it('should handle missing userContext gracefully', async () => {
    mockReq = {};

    await setDatabaseSessionContext(mockReq as AuthenticatedRequest);

    // Should not call execute if no context
    expect(executeSpy).not.toHaveBeenCalled();
  });
});

describe('setDbContext Middleware', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonSpy = vi.fn();
    statusSpy = vi.fn(() => ({ json: jsonSpy }));
    mockRes = {
      status: statusSpy as unknown as Response['status'],
    };
    mockNext = vi.fn();
  });

  it('should set database context and proceed', async () => {
    mockReq = {
      userContext: {
        userId: 'user-123',
        effectiveTeamMemberId: 'member-456',
      } as UserContext,
    };

    const mockDb = {
      execute: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(dbModule.getDb).mockReturnValue(mockDb as any);

    await setDbContext(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(statusSpy).not.toHaveBeenCalled();
  });

  it('should handle database errors', async () => {
    mockReq = {
      userContext: {
        userId: 'user-123',
        effectiveTeamMemberId: 'member-456',
      } as UserContext,
    };

    const mockDb = {
      execute: vi.fn().mockRejectedValue(new Error('DB error')),
    };
    vi.mocked(dbModule.getDb).mockReturnValue(mockDb as any);

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await setDbContext(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      message: 'Failed to set database context',
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });
});
