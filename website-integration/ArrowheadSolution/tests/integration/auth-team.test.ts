import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';

import authRouter from '../../server/api/auth';
import * as supabaseModule from '../../server/auth/supabase';
import * as dbModule from '../../server/db';

vi.mock('../../server/auth/supabase');
vi.mock('../../server/db');

describe('Auth Initialize Team API', () => {
  let app: Express;
  let mockDb: any;
  let mockSupabaseAdmin: any;

  const userId = 'user-1';
  const teamId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', authRouter);
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

    mockSupabaseAdmin = {
      auth: {
        admin: {
          getUserById: vi.fn(),
        },
      },
    };
    vi.mocked(supabaseModule.supabaseAdmin).auth = mockSupabaseAdmin.auth as never;

    vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({
      valid: true,
      userId,
      email: 'owner@example.com',
    } as any);
  });

  it('returns 400 when teamName or userName is missing (API-01)', async () => {
    const res = await request(app)
      .post('/api/auth/initialize-team')
      .set('Authorization', 'Bearer jwt')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
  });

  it('creates team and owner member for new user (API-02)', async () => {
    // requireAuth test shortcut: first limit() call returns membership row
    mockDb.limit
      .mockResolvedValueOnce([{ id: 'm-auth', teamId, role: 'Account Owner' }])
      // initialize-team existingMembers query returns empty
      .mockResolvedValueOnce([]);

    mockSupabaseAdmin.auth.admin.getUserById.mockResolvedValue({
      data: { user: { id: userId, email: 'owner@example.com' } },
      error: null,
    });

    const trialEndsAt = new Date();

    mockDb.returning
      // First returning() is for teams insert
      .mockResolvedValueOnce([
        {
          id: teamId,
          name: 'My Team',
          subscriptionStatus: 'trialing',
          trialEndsAt,
        },
      ])
      // Second returning() is for teamMembers insert
      .mockResolvedValueOnce([
        {
          id: 'member-1',
          name: 'Owner Name',
          role: 'Account Owner',
        },
      ]);

    const res = await request(app)
      .post('/api/auth/initialize-team')
      .set('Authorization', 'Bearer jwt')
      .send({ teamName: 'My Team', userName: 'Owner Name' });

    expect(res.status).toBe(201);
    expect(res.body.team).toBeDefined();
    expect(res.body.team.name).toBe('My Team');
    expect(res.body.member.name).toBe('Owner Name');

    // Verify values passed into inserts match business rules
    expect(mockDb.values).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        name: 'My Team',
        subscriptionStatus: 'trialing',
      }),
    );

    expect(mockDb.values).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        name: 'Owner Name',
        email: 'owner@example.com',
        role: 'Account Owner',
        isVirtual: false,
        inviteStatus: 'active',
      }),
    );
  });

  it('is idempotent when membership already exists (API-03)', async () => {
    const now = new Date();

    mockDb.limit
      // requireAuth membership lookup
      .mockResolvedValueOnce([{ id: 'm-1', teamId, role: 'Account Owner' }])
      // initialize-team existingMembers query
      .mockResolvedValueOnce([
        { id: 'm-1', teamId, name: 'Existing Owner', role: 'Account Owner' },
      ])
      // existing team lookup
      .mockResolvedValueOnce([
        {
          id: teamId,
          name: 'Existing Team',
          subscriptionStatus: 'trialing',
          trialEndsAt: now,
        },
      ]);

    const res = await request(app)
      .post('/api/auth/initialize-team')
      .set('Authorization', 'Bearer jwt')
      .send({ teamName: 'Ignored Team', userName: 'Ignored User' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Team already initialized');
    expect(res.body.member.id).toBe('m-1');
    expect(res.body.team.id).toBe(teamId);

    // In idempotent path, no new inserts should be issued
    expect(mockDb.insert).not.toHaveBeenCalled();
  });
});
