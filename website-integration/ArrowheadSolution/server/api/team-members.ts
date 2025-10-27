/**
 * Team Members API Router
 * 
 * Endpoints for team member management and invitations
 * Based on: PRD v5.2 Section 3.1, SLAD v6.0 Sections 6.0, 7.0
 */

import { Response, Router } from 'express';
import { requireAuth, setDbContext, AuthenticatedRequest } from '../auth/middleware';
import { getDb } from '../db';
import { supabaseAdmin } from '../auth/supabase';
import { teamMembers } from '../../shared/schema/index';
import { eq } from 'drizzle-orm';
import {
  inviteTeamMemberSchema,
  uuidSchema,
  formatValidationError,
  createErrorResponse,
} from './validation';

const router = Router();

/**
 * POST /api/team-members/:memberId/invite
 * Send invitation email to virtual team member
 * 
 * Business Rules:
 * - Only Account Owner/Manager can invite
 * - Can only invite virtual members (is_virtual = true, user_id = NULL)
 * - Email must be globally unique (not in auth.users or team_members)
 * - Calls Supabase inviteUserByEmail
 * - Updates member status to 'invite_pending'
 * 
 * Permissions: Account Owner, Account Manager ONLY
 */
router.post(
  '/team-members/:memberId/invite',
  requireAuth,
  setDbContext,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = getDb();

      // STRICT PERMISSION CHECK: Only Account Owner/Manager can invite
      const userRole = req.userContext?.role;
      if (userRole !== 'Account Owner' && userRole !== 'Account Manager') {
        return res.status(403).json(
          createErrorResponse(
            'Forbidden',
            'Only Account Owner and Account Manager can send invitations',
            { current_role: userRole }
          )
        );
      }

      // Validate member ID
      const memberIdValidation = uuidSchema.safeParse(req.params.memberId);
      if (!memberIdValidation.success) {
        return res.status(400).json(formatValidationError(memberIdValidation.error));
      }
      const memberId = memberIdValidation.data;

      // Validate request body
      const bodyValidation = inviteTeamMemberSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        return res.status(400).json(formatValidationError(bodyValidation.error));
      }
      const { email } = bodyValidation.data;

      // Fetch team member
      const members = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.id, memberId))
        .limit(1);

      if (members.length === 0) {
        return res.status(404).json(
          createErrorResponse('Not Found', 'Team member not found')
        );
      }

      const member = members[0];

      // Verify member is virtual
      if (!member.isVirtual) {
        return res.status(400).json(
          createErrorResponse(
            'Invalid Request',
            'Cannot invite real team member - only virtual members can be invited',
            { is_virtual: member.isVirtual }
          )
        );
      }

      // Verify member has not been linked to a user yet
      if (member.userId) {
        return res.status(400).json(
          createErrorResponse(
            'Invalid Request',
            'This virtual member has already been linked to a user',
            { user_id: member.userId }
          )
        );
      }

      // Check if email is already in team_members table
      const existingMembersWithEmail = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.email, email))
        .limit(1);

      if (existingMembersWithEmail.length > 0) {
        return res.status(400).json(
          createErrorResponse(
            'Validation Error',
            'This email is already associated with another team member',
            { email }
          )
        );
      }

      // Check if email exists in Supabase auth.users
      const { data: existingUsers, error: userCheckError } = await supabaseAdmin.auth.admin.listUsers();

      if (userCheckError) {
        console.error('Error checking existing users:', userCheckError);
        return res.status(500).json(
          createErrorResponse('Internal Server Error', 'Failed to verify email uniqueness')
        );
      }

      const emailExists = existingUsers.users.some(user => user.email?.toLowerCase() === email.toLowerCase());
      if (emailExists) {
        return res.status(400).json(
          createErrorResponse(
            'Validation Error',
            'This email is already registered in the system',
            { email }
          )
        );
      }

      // Send invitation via Supabase
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          team_member_id: memberId,
          invited_by: req.userContext?.userId,
        },
      });

      if (inviteError) {
        console.error('Supabase invite error:', inviteError);
        return res.status(500).json(
          createErrorResponse(
            'Internal Server Error',
            'Failed to send invitation email',
            { error: inviteError.message }
          )
        );
      }

      // Update team_members record
      const updatedMembers = await db
        .update(teamMembers)
        .set({
          email,
          inviteStatus: 'invite_pending',
        })
        .where(eq(teamMembers.id, memberId))
        .returning();

      const updatedMember = updatedMembers[0];

      return res.status(200).json({
        message: 'Invitation sent successfully',
        member: {
          id: updatedMember.id,
          name: updatedMember.name,
          email: updatedMember.email,
          invite_status: updatedMember.inviteStatus,
        },
        invite_data: {
          sent_to: email,
          invited_user_id: inviteData.user?.id,
        },
      });
    } catch (error) {
      console.error('Error sending invitation:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to send invitation')
      );
    }
  }
);

export default router;
