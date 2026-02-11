/**
 * Authentication API Router
 * 
 * Endpoints for user profile and authentication-related data
 */

import { Response, Router } from 'express';
import { requireAuth, setDbContext, AuthenticatedRequest } from '../auth/middleware';
import { getDb } from '../db';
import { supabaseAdmin } from '../auth/supabase';
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

      // Calculate trial days left if on trial
      let daysLeftInTrial: number | null = null;
      if (team?.subscriptionStatus === 'trialing' && team?.trialEndsAt) {
        const now = new Date();
        const trialEnd = new Date(team.trialEndsAt);
        const diffTime = trialEnd.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        daysLeftInTrial = Math.max(0, diffDays);
      }

      return res.status(200).json({
        userId,
        email: member.email || '',
        teamMemberId: member.id,
        teamId: member.teamId,
        teamName: team?.name || '',
        role: member.role,
        name: member.name,
        isVirtual: member.isVirtual,
        // Subscription info for trial logic
        subscriptionStatus: team?.subscriptionStatus || 'inactive',
        trialEndsAt: team?.trialEndsAt || null,
        daysLeftInTrial,
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to fetch profile')
      );
    }
  }
);

/**
 * POST /api/auth/initialize-team
 * Initialize a new team for a newly signed-up user
 * 
 * Called after successful Supabase signup to create:
 * - Team record with 14-day trial
 * - Team member record for the owner
 * 
 * Permissions: Authenticated user only (must not already have a team)
 */
router.post(
  '/auth/initialize-team',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = getDb();
      const userId = req.userContext?.userId;

      if (!userId) {
        return res.status(401).json(
          createErrorResponse('Unauthorized', 'User ID is required')
        );
      }

      // Validate request body
      const { teamName, userName } = req.body;
      if (!teamName || !userName) {
        return res.status(400).json(
          createErrorResponse('Validation Error', 'Team name and user name are required')
        );
      }

      // Check if user already has a team
      const existingMembers = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.userId, userId))
        .limit(1);

      // If a membership already exists, treat this as idempotent success
      if (existingMembers.length > 0) {
        const existingMember = existingMembers[0];

        const existingTeamRecords = await db
          .select()
          .from(teams)
          .where(eq(teams.id, existingMember.teamId))
          .limit(1);

        const existingTeam = existingTeamRecords[0] ?? null;

        return res.status(200).json({
          message: 'Team already initialized',
          team: existingTeam
            ? {
              id: existingTeam.id,
              name: existingTeam.name,
              subscriptionStatus: existingTeam.subscriptionStatus,
              trialEndsAt: existingTeam.trialEndsAt,
            }
            : null,
          member: {
            id: existingMember.id,
            name: existingMember.name,
            role: existingMember.role,
          },
        });
      }

      // Calculate trial end date (14 days from now)
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      // Create team with trial status
      const newTeams = await db
        .insert(teams)
        .values({
          name: teamName,
          subscriptionStatus: 'trialing',
          trialEndsAt,
        })
        .returning();

      const newTeam = newTeams[0];

      // Get user email from Supabase
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
      const userEmail = userData?.user?.email || '';

      // Create team member record as Account Owner
      const newMembers = await db
        .insert(teamMembers)
        .values({
          teamId: newTeam.id,
          userId,
          name: userName,
          email: userEmail,
          role: 'Account Owner',
          isVirtual: false,
          inviteStatus: 'active',
        })
        .returning();

      const newMember = newMembers[0];

      return res.status(201).json({
        message: 'Team initialized successfully',
        team: {
          id: newTeam.id,
          name: newTeam.name,
          subscriptionStatus: newTeam.subscriptionStatus,
          trialEndsAt: newTeam.trialEndsAt,
        },
        member: {
          id: newMember.id,
          name: newMember.name,
          role: newMember.role,
        },
      });
    } catch (error) {
      console.error('Error initializing team:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to initialize team')
      );
    }
  }
);

export default router;
