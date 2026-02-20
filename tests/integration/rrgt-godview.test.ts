/**
 * RRGT God View Integration Tests
 * Tests the GET /api/rrgt/:teamMemberId endpoint (Manager God-view)
 *
 * Validates:
 * - Account Owner/Manager can fetch team member RRGT data
 * - Team Member (non-admin) gets 403
 * - Returns enriched plans matching /mine shape
 * - Returns ownerName for attribution
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import rrgtRouter from '../../server/api/rrgt';
import * as supabaseModule from '../../server/auth/supabase';
import * as dbModule from '../../server/db';

vi.mock('../../server/auth/supabase');
vi.mock('../../server/db');

describe('RRGT God View (GET /api/rrgt/:teamMemberId)', () => {
    let app: Express;
    let mockDb: any;

    const teamId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const ownerId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const targetMemberId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    const taskId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
    const planId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
    const objectiveId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

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
            innerJoin: vi.fn().mockReturnThis(),
            leftJoin: vi.fn().mockReturnThis(),
        };
        // First .where() is consumed by requireAuth middleware
        mockDb.where.mockReturnValueOnce(mockDb);

        vi.mocked(dbModule.getDb).mockReturnValue(mockDb as never);
    });

    it('Account Owner can fetch team member RRGT data', async () => {
        vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
        mockDb.limit.mockResolvedValueOnce([{ id: ownerId, teamId, role: 'Account Owner' }]); // Auth

        // 1. Member name lookup
        mockDb.where.mockReturnValueOnce(mockDb);
        mockDb.limit.mockResolvedValueOnce([{ name: 'Alice Smith' }]);

        // 2. Task assignments for target member
        mockDb.where.mockResolvedValueOnce([{ taskId, teamMemberId: targetMemberId }]);

        // 3. Plans with joins (enriched)
        mockDb.where.mockResolvedValueOnce([{
            plan: { id: planId, taskId, teamMemberId: targetMemberId, objectiveId, maxColumnIndex: 6, projectId: 'proj-1' },
            task: { id: taskId, objectiveId, title: 'Member Task', status: 'not_started', priority: 1, dueDate: null },
            objective: { id: objectiveId, projectId: 'proj-1', name: 'Team Objective' },
            rabbit: { planId, currentColumnIndex: 2, updatedAt: null },
        }]);

        // 4. Subtasks for plan
        mockDb.where.mockResolvedValueOnce([
            { id: 'sub-1', planId, columnIndex: 1, text: 'Step 1', createdAt: null, updatedAt: null },
            { id: 'sub-2', planId, columnIndex: 2, text: 'Step 2', createdAt: null, updatedAt: null },
        ]);

        const res = await request(app)
            .get(`/api/rrgt/${targetMemberId}`)
            .set('Authorization', 'Bearer jwt');

        expect(res.status).toBe(200);
        expect(res.body.ownerName).toBe('Alice Smith');
        expect(res.body.plans).toHaveLength(1);

        const plan = res.body.plans[0];
        expect(plan.id).toBe(planId);
        expect(plan.task.title).toBe('Member Task');
        expect(plan.objective.name).toBe('Team Objective');
        expect(plan.rabbit.currentColumnIndex).toBe(2);
        expect(plan.subtasks).toHaveLength(2);
    });

    it('Account Manager can also fetch data (manager role)', async () => {
        vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-2' });
        mockDb.limit.mockResolvedValueOnce([{ id: ownerId, teamId, role: 'Account Manager' }]); // Auth

        // Member name lookup
        mockDb.where.mockReturnValueOnce(mockDb);
        mockDb.limit.mockResolvedValueOnce([{ name: 'Bob Jones' }]);

        // No assignments
        mockDb.where.mockResolvedValueOnce([]);

        const res = await request(app)
            .get(`/api/rrgt/${targetMemberId}`)
            .set('Authorization', 'Bearer jwt');

        expect(res.status).toBe(200);
        expect(res.body.plans).toHaveLength(0);
        expect(res.body.total).toBe(0);
        expect(res.body.ownerName).toBe('Bob Jones');
    });

    it('Team Member (non-admin) gets 403', async () => {
        vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-3' });
        mockDb.limit.mockResolvedValueOnce([{ id: targetMemberId, teamId, role: 'Team Member' }]); // Auth

        const res = await request(app)
            .get(`/api/rrgt/${targetMemberId}`)
            .set('Authorization', 'Bearer jwt');

        expect(res.status).toBe(403);
        expect(res.body.message).toContain('Account Owner');
    });

    it('Returns empty plans when member has no task assignments', async () => {
        vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
        mockDb.limit.mockResolvedValueOnce([{ id: ownerId, teamId, role: 'Account Owner' }]); // Auth

        // Member name lookup
        mockDb.where.mockReturnValueOnce(mockDb);
        mockDb.limit.mockResolvedValueOnce([{ name: 'New Hire' }]);

        // No assignments
        mockDb.where.mockResolvedValueOnce([]);

        const res = await request(app)
            .get(`/api/rrgt/${targetMemberId}`)
            .set('Authorization', 'Bearer jwt');

        expect(res.status).toBe(200);
        expect(res.body.plans).toEqual([]);
        expect(res.body.total).toBe(0);
        expect(res.body.ownerName).toBe('New Hire');
    });

    it('Returns "Unknown" if member ID not found in team_members table', async () => {
        vi.mocked(supabaseModule.verifySupabaseJwt).mockResolvedValue({ valid: true, userId: 'user-1' });
        mockDb.limit.mockResolvedValueOnce([{ id: ownerId, teamId, role: 'Account Owner' }]); // Auth

        // Member name lookup returns empty
        mockDb.where.mockReturnValueOnce(mockDb);
        mockDb.limit.mockResolvedValueOnce([]);

        // No assignments
        mockDb.where.mockResolvedValueOnce([]);

        const res = await request(app)
            .get(`/api/rrgt/${targetMemberId}`)
            .set('Authorization', 'Bearer jwt');

        expect(res.status).toBe(200);
        expect(res.body.ownerName).toBe('Unknown');
    });
});
