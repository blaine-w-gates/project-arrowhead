/**
 * Authentication API Router
 * 
 * Endpoints for user profile and authentication-related data
 */

import { Response, Router } from 'express';
import { requireAuth, setDbContext, AuthenticatedRequest } from '../auth/middleware';
import { getDb } from '../db';
import { teamMembers, teams } from '../../shared/schema/index';
import { eq } from 'drizzle-orm';
import { createErrorResponse } from './validation';

const router = Router();

/**
 * GET /api/auth/profile
 * Get authenticated user's profile and team information
 * 
 * Returns essential profile data needed by frontend:
 * - userId: Supabase auth user ID
 * - email: User's email
 * - teamMemberId: Team member record ID
 * - teamId: Team ID
 * - teamName: Team name
 * - role: User's role (Account Owner, etc.)
 * - name: User's display name
 * - isVirtual: Whether this is a virtual persona
 * 
 * Permissions: Authenticated user only
 */
router.get(
  '/auth/profile',
  requireAuth,
  setDbContext,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = getDb();
      const userId = req.userContext?.userId;
      const teamMemberId = req.userContext?.teamMemberId;
      const teamId = req.userContext?.teamId;

      if (!userId || !teamMemberId || !teamId) {
        return res.status(401).json(
          createErrorResponse('Unauthorized', 'Invalid or missing authentication context')
        );
      }

      // Fetch team member details
      const memberRecords = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.id, teamMemberId))
        .limit(1);

      if (memberRecords.length === 0) {
        return res.status(404).json(
          createErrorResponse('Not Found', 'Team member not found')
        );
      }

      const member = memberRecords[0];

      // Fetch team details
      const teamRecords = await db
        .select()
        .from(teams)
        .where(eq(teams.id, teamId))
        .limit(1);

      const team = teamRecords.length > 0 ? teamRecords[0] : null;

      return res.status(200).json({
        userId,
        email: member.email || '',
        teamMemberId: member.id,
        teamId: member.teamId,
        teamName: team?.name || '',
        role: member.role,
        name: member.name,
        isVirtual: member.isVirtual,
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to fetch profile')
      );
    }
  }
);

export default router;
