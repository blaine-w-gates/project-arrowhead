/**
 * Team Members API Integration Tests
 * Comprehensive coverage for invitation endpoint
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import teamMembersRouter from '../../server/api/team-members';
import * as supabaseModule from '../../server/auth/supabase';
import * as dbModule from '../../server/db';

vi.mock('../../server/auth/supabase');
vi.mock('../../server/db');

describe('Team Members API - Invitations', () => {
  let app: Express;
  let mockDb: ReturnType<typeof vi.fn>;
  let mockSupabaseAdmin: ReturnType<typeof vi.fn>;

  const teamId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const memberId1 = 'm-1';
  const memberId2 = 'm-2';
  const virtualMemberId = 'v-1';

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', teamMembersRouter);
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

    // Mock Supabase admin
    mockSupabaseAdmin = {
      auth: {
        admin: {
          inviteUserByEmail: vi.fn(),
          listUsers: vi.fn(),
        },
      },
    };
    vi.mocked(supabaseModule.supabaseAdmin).auth = mockSupabaseAdmin.auth as never;
  });

  describe('POST /api/team-members/:memberId/invite', () => {
    it('Account Owner successfully sends invitation', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Account Owner' }]); // Auth
      
      // Virtual member check
      mockDb.limit.mockResolvedValueOnce([{
        id: virtualMemberId,
        name: 'John Doe (Virtual)',
        isVirtual: true,
        userId: null,
        email: null,
        inviteStatus: 'not_invited',
      }]);

      // Email uniqueness check in team_members
      mockDb.limit.mockResolvedValueOnce([]);

      // Mock Supabase listUsers (no existing users)
      mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });

      // Mock Supabase inviteUserByEmail
      mockSupabaseAdmin.auth.admin.inviteUserByEmail.mockResolvedValue({
        data: { user: { id: 'new-user-id', email: 'john@example.com' } },
        error: null,
      });

      // Update member
      mockDb.returning.mockResolvedValue([{
        id: virtualMemberId,
        name: 'John Doe (Virtual)',
        email: 'john@example.com',
        inviteStatus: 'invite_pending',
      }]);

      const res = await request(app)
        .post(`/api/team-members/${virtualMemberId}/invite`)
        .set('Authorization', 'Bearer jwt')
        .send({ email: 'john@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.member.email).toBe('john@example.com');
      expect(res.body.member.invite_status).toBe('invite_pending');
      expect(mockSupabaseAdmin.auth.admin.inviteUserByEmail).toHaveBeenCalledWith(
        'john@example.com',
        expect.objectContaining({
          data: expect.objectContaining({
            team_member_id: virtualMemberId,
          }),
        })
      );
    });

    it('Account Manager successfully sends invitation', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-2' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId2, teamId, role: 'Account Manager' }]);
      mockDb.limit.mockResolvedValueOnce([{
        id: virtualMemberId,
        isVirtual: true,
        userId: null,
      }]);
      mockDb.limit.mockResolvedValueOnce([]);
      mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({ data: { users: [] }, error: null });
      mockSupabaseAdmin.auth.admin.inviteUserByEmail.mockResolvedValue({
        data: { user: { id: 'new-user-id' } },
        error: null,
      });
      mockDb.returning.mockResolvedValue([{
        id: virtualMemberId,
        email: 'jane@example.com',
        inviteStatus: 'invite_pending',
      }]);

      const res = await request(app)
        .post(`/api/team-members/${virtualMemberId}/invite`)
        .set('Authorization', 'Bearer jwt')
        .send({ email: 'jane@example.com' });

      expect(res.status).toBe(200);
    });

    it('Rejects Project Owner sending invitation (403)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValue([{ id: memberId1, teamId, role: 'Project Owner' }]);

      const res = await request(app)
        .post(`/api/team-members/${virtualMemberId}/invite`)
        .set('Authorization', 'Bearer jwt')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Only Account Owner and Account Manager');
    });

    it('Rejects Team Member sending invitation (403)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-2' });
      mockDb.limit.mockResolvedValue([{ id: memberId2, teamId, role: 'Team Member' }]);

      const res = await request(app)
        .post(`/api/team-members/${virtualMemberId}/invite`)
        .set('Authorization', 'Bearer jwt')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(403);
    });

    it('Rejects inviting non-virtual member (400)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Account Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{
        id: memberId2,
        isVirtual: false, // Real member
        userId: 'existing-user-id',
      }]);

      const res = await request(app)
        .post(`/api/team-members/${memberId2}/invite`)
        .set('Authorization', 'Bearer jwt')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('only virtual members can be invited');
    });

    it('Rejects inviting already-linked virtual member (400)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Account Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{
        id: virtualMemberId,
        isVirtual: true,
        userId: 'linked-user-id', // Already linked
      }]);

      const res = await request(app)
        .post(`/api/team-members/${virtualMemberId}/invite`)
        .set('Authorization', 'Bearer jwt')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already been linked to a user');
    });

    it('Rejects duplicate email in team_members (400)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Account Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{
        id: virtualMemberId,
        isVirtual: true,
        userId: null,
      }]);
      
      // Email already exists in team_members
      mockDb.limit.mockResolvedValueOnce([{
        id: 'other-member-id',
        email: 'duplicate@example.com',
      }]);

      const res = await request(app)
        .post(`/api/team-members/${virtualMemberId}/invite`)
        .set('Authorization', 'Bearer jwt')
        .send({ email: 'duplicate@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already associated with another team member');
    });

    it('Rejects duplicate email in auth.users (400)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Account Owner' }]);
      mockDb.limit.mockResolvedValueOnce([{
        id: virtualMemberId,
        isVirtual: true,
        userId: null,
      }]);
      mockDb.limit.mockResolvedValueOnce([]); // No duplicate in team_members

      // Email exists in auth.users
      mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({
        data: {
          users: [
            { id: 'existing-user', email: 'existing@example.com' },
          ],
        },
        error: null,
      });

      const res = await request(app)
        .post(`/api/team-members/${virtualMemberId}/invite`)
        .set('Authorization', 'Bearer jwt')
        .send({ email: 'existing@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already registered in the system');
    });

    it('Returns 404 for non-existent member', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValueOnce([{ id: memberId1, teamId, role: 'Account Owner' }]);
      mockDb.limit.mockResolvedValueOnce([]); // Member not found

      const res = await request(app)
        .post(`/api/team-members/${virtualMemberId}/invite`)
        .set('Authorization', 'Bearer jwt')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(404);
    });

    it('Rejects invalid email format (400)', async () => {
      vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
      mockDb.limit.mockResolvedValue([{ id: memberId1, teamId, role: 'Account Owner' }]);

      const res = await request(app)
        .post(`/api/team-members/${virtualMemberId}/invite`)
        .set('Authorization', 'Bearer jwt')
        .send({ email: 'invalid-email' });

      expect(res.status).toBe(400);
    });
  });
});
