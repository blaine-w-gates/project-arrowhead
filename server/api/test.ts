/**
 * Test Utilities API Router
 * 
 * Endpoints for E2E test cleanup and setup
 * 
 * ⚠️ SECURITY: These endpoints are protected by E2E_TEST_SECRET
 * and are NOT available in production (returns 404)
 */

import { Response, Router, Request } from 'express';
import { getDb } from '../db';
import { supabaseAdmin } from '../auth/supabase';
import { teamMembers, teams } from '../../shared/schema/index';
import { eq } from 'drizzle-orm';
import { createErrorResponse } from './validation';

const router = Router();

/**
 * POST /api/test/cleanup
 * Delete test data created during E2E tests
 * 
 * Security:
 * - Requires x-e2e-secret header matching E2E_TEST_SECRET
 * - Returns 404 in production environment
 * - Logs all cleanup operations
 * 
 * Request Body:
 * - email: Test user email (e.g., e2e-test-12345@arrowhead.test)
 * 
 * Cleanup Actions:
 * 1. Find team member by email
 * 2. Find associated team
 * 3. Delete all team members (cascades to projects, objectives, etc.)
 * 4. Delete team
 * 5. Optionally delete auth user (if Supabase Admin available)
 * 
 * Permissions: Test environment only, requires E2E_TEST_SECRET
 */
router.post(
  '/test/cleanup',
  async (req: Request, res: Response) => {
    try {
      // Production safety: return 404 in production
      if (process.env.NODE_ENV === 'production') {
        return res.status(404).json(
          createErrorResponse('Not Found', 'Endpoint not available')
        );
      }

      // Security: check E2E_TEST_SECRET header
      const secret = req.headers['x-e2e-secret'];
      const expectedSecret = process.env.E2E_TEST_SECRET;

      if (!expectedSecret) {
        console.warn('⚠️ E2E_TEST_SECRET not configured - cleanup endpoint disabled');
        return res.status(503).json(
          createErrorResponse('Service Unavailable', 'E2E_TEST_SECRET not configured')
        );
      }

      if (secret !== expectedSecret) {
        console.warn('❌ Invalid E2E secret provided:', secret);
        return res.status(403).json(
          createErrorResponse('Forbidden', 'Invalid or missing x-e2e-secret header')
        );
      }

      // Validate request body
      const { email } = req.body;
      if (!email || typeof email !== 'string') {
        return res.status(400).json(
          createErrorResponse('Validation Error', 'email is required')
        );
      }

      console.log(`🧹 Starting cleanup for email: ${email}`);

      const db = getDb();

      // Step 1: Find team member by email
      const members = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.email, email))
        .limit(1);

      if (members.length === 0) {
        console.log(`ℹ️ No team member found for email: ${email}`);
        return res.status(200).json({
          success: true,
          message: 'No data to clean up',
          deleted: {
            teamMembers: 0,
            teams: 0,
            authUsers: 0,
          },
        });
      }

      const member = members[0];
      const teamId = member.teamId;
      const userId = member.userId;

      console.log(`📋 Found team member: ${member.id}, team: ${teamId}, user: ${userId}`);

      // Step 2: Delete all team members for this team
      const deletedMembers = await db
        .delete(teamMembers)
        .where(eq(teamMembers.teamId, teamId))
        .returning();

      console.log(`✅ Deleted ${deletedMembers.length} team member(s)`);

      // Step 3: Delete team (cascades to projects, objectives, tasks, etc.)
      const deletedTeams = await db
        .delete(teams)
        .where(eq(teams.id, teamId))
        .returning();

      console.log(`✅ Deleted ${deletedTeams.length} team(s)`);

      // Step 4: Attempt to delete auth user from Supabase (optional)
      let authUserDeleted = 0;
      if (userId) {
        try {
          const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
          if (error) {
            console.warn(`⚠️ Could not delete auth user ${userId}:`, error.message);
          } else {
            console.log(`✅ Deleted auth user: ${userId}`);
            authUserDeleted = 1;
          }
        } catch (error) {
          console.warn(`⚠️ Exception deleting auth user ${userId}:`, error);
          // Non-fatal: we can tolerate orphaned auth users
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Cleanup completed',
        deleted: {
          teamMembers: deletedMembers.length,
          teams: deletedTeams.length,
          authUsers: authUserDeleted,
        },
        details: {
          email,
          teamId,
          userId: userId || null,
        },
      });
    } catch (error) {
      console.error('❌ Cleanup error:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Cleanup failed')
      );
    }
  }
);

/**
 * GET /api/test/health
 * Simple health check for test infrastructure
 * Returns 404 in production
 */
router.get(
  '/test/health',
  async (_req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json(
        createErrorResponse('Not Found', 'Endpoint not available')
      );
    }

    return res.status(200).json({
      status: 'ok',
      environment: process.env.NODE_ENV || 'development',
      e2eSecretConfigured: !!process.env.E2E_TEST_SECRET,
    });
  }
);

export default router;
