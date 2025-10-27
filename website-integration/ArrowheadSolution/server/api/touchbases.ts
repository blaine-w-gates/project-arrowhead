/**
 * Touchbases API Router
 * 
 * CRUD operations for touchbases with 24hr edit window and privacy enforcement
 * Based on: PRD v5.2 Section 3.3, SLAD v6.0 Sections 3.0, 5.0
 */

import { Response, Router } from 'express';
import { requireAuth, setDbContext, AuthenticatedRequest } from '../auth/middleware';
import { getDb } from '../db';
import { objectives, touchbases } from '../../shared/schema/index';
import { eq, and } from 'drizzle-orm';
import {
  createTouchbaseSchema,
  updateTouchbaseSchema,
  listTouchbasesQuerySchema,
  uuidSchema,
  formatValidationError,
  createErrorResponse,
} from './validation';
import {
  canCreateProject,
  canEditProject,
  createPermissionError,
} from './permissions';

const router = Router();

// In-memory lock store (production: use Redis)
const touchbaseLocks: Map<string, { userId: string, teamMemberId: string, expiresAt: Date }> = new Map();
const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Helper: Check if touchbase is locked by another user
 */
function isLocked(touchbaseId: string, teamMemberId: string): boolean {
  const lock = touchbaseLocks.get(touchbaseId);
  if (!lock) return false;
  
  if (lock.expiresAt < new Date()) {
    touchbaseLocks.delete(touchbaseId);
    return false;
  }
  
  return lock.teamMemberId !== teamMemberId;
}

/**
 * Helper: Get lock info
 */
function getLock(touchbaseId: string): { userId: string, teamMemberId: string, expiresAt: Date } | null {
  const lock = touchbaseLocks.get(touchbaseId);
  if (!lock) return null;
  
  if (lock.expiresAt < new Date()) {
    touchbaseLocks.delete(touchbaseId);
    return null;
  }
  
  return lock;
}

/**
 * Helper: Check if user has privacy access to touchbase
 * Privacy Rule: Only creator, participant, Account Owner, Account Manager can view
 */
function hasPrivacyAccess(
  touchbase: { createdBy: string; teamMemberId: string },
  currentTeamMemberId: string,
  role: string | undefined
): boolean {
  // Account Owner and Account Manager always have access
  if (role === 'Account Owner' || role === 'Account Manager') {
    return true;
  }
  
  // Creator has access
  if (touchbase.createdBy === currentTeamMemberId) {
    return true;
  }
  
  // Participant (subject of touchbase) has access
  if (touchbase.teamMemberId === currentTeamMemberId) {
    return true;
  }
  
  return false;
}

/**
 * Helper: Check if touchbase is within 24-hour edit window
 */
function isWithin24Hours(createdAt: Date): boolean {
  const now = new Date();
  const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceCreation < 24;
}

/**
 * POST /api/objectives/:objectiveId/touchbases
 * Create a new touchbase
 * 
 * Permissions: Objective Owner+ (can create for self or virtual persona)
 * Created touchbase has editable=true for 24 hours
 */
router.post(
  '/objectives/:objectiveId/touchbases',
  requireAuth,
  setDbContext,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = getDb();

      // Validate objective ID
      const objectiveIdValidation = uuidSchema.safeParse(req.params.objectiveId);
      if (!objectiveIdValidation.success) {
        return res.status(400).json(formatValidationError(objectiveIdValidation.error));
      }
      const objectiveId = objectiveIdValidation.data;

      // Validate request body
      const bodyValidation = createTouchbaseSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        return res.status(400).json(formatValidationError(bodyValidation.error));
      }
      const { team_member_id, touchbase_date, responses } = bodyValidation.data;

      // Check permissions (Objective Owner+ can create touchbases)
      if (!canCreateProject(req.userContext)) {
        return res.status(403).json(createPermissionError('create touchbases', req.userContext));
      }

      // Verify objective exists and user has access
      const existingObjectives = await db
        .select({ id: objectives.id })
        .from(objectives)
        .where(eq(objectives.id, objectiveId))
        .limit(1);

      if (existingObjectives.length === 0) {
        return res.status(404).json(
          createErrorResponse('Not Found', 'Objective not found or you don\'t have access')
        );
      }

      // Create touchbase
      const createdBy = req.userContext?.teamMemberId || '';
      const newTouchbases = await db
        .insert(touchbases)
        .values({
          objectiveId,
          teamMemberId: team_member_id,
          createdBy,
          touchbaseDate: new Date(touchbase_date),
          responses,
          editable: true, // Initially editable for 24 hours
        })
        .returning();

      const newTouchbase = newTouchbases[0];

      return res.status(201).json({
        message: 'Touchbase created successfully',
        touchbase: newTouchbase,
      });
    } catch (error) {
      console.error('Error creating touchbase:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to create touchbase')
      );
    }
  }
);

/**
 * GET /api/objectives/:objectiveId/touchbases
 * List touchbases for an objective
 * 
 * Query params:
 * - member_id: Filter by team member (optional)
 * 
 * Permissions: All team members (RLS filtered by project assignments)
 * Privacy: Returns only touchbases user has access to
 */
router.get(
  '/objectives/:objectiveId/touchbases',
  requireAuth,
  setDbContext,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = getDb();

      // Validate objective ID
      const objectiveIdValidation = uuidSchema.safeParse(req.params.objectiveId);
      if (!objectiveIdValidation.success) {
        return res.status(400).json(formatValidationError(objectiveIdValidation.error));
      }
      const objectiveId = objectiveIdValidation.data;

      // Validate query parameters
      const queryValidation = listTouchbasesQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        return res.status(400).json(formatValidationError(queryValidation.error));
      }
      const { member_id } = queryValidation.data;

      // Verify objective exists and user has access
      const existingObjectives = await db
        .select({ id: objectives.id })
        .from(objectives)
        .where(eq(objectives.id, objectiveId))
        .limit(1);

      if (existingObjectives.length === 0) {
        return res.status(404).json(
          createErrorResponse('Not Found', 'Objective not found or you don\'t have access')
        );
      }

      // Build query conditions
      const conditions = [eq(touchbases.objectiveId, objectiveId)];
      
      if (member_id) {
        conditions.push(eq(touchbases.teamMemberId, member_id));
      }

      // Fetch all touchbases for objective
      const touchbasesList = await db
        .select()
        .from(touchbases)
        .where(and(...conditions))
        .orderBy(touchbases.touchbaseDate);

      // Apply privacy filtering
      const currentTeamMemberId = req.userContext?.teamMemberId || '';
      const userRole = req.userContext?.role;

      const filteredTouchbases = touchbasesList.filter(tb =>
        hasPrivacyAccess(tb, currentTeamMemberId, userRole)
      );

      // Update editable flag based on 24hr window
      const touchbasesWithEditStatus = filteredTouchbases.map(tb => ({
        ...tb,
        editable: isWithin24Hours(tb.createdAt),
      }));

      return res.status(200).json({
        touchbases: touchbasesWithEditStatus,
        total: touchbasesWithEditStatus.length,
      });
    } catch (error) {
      console.error('Error listing touchbases:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to list touchbases')
      );
    }
  }
);

/**
 * PUT /api/touchbases/:touchbaseId
 * Update touchbase responses
 * 
 * Permissions: Only creator can update
 * Business Rule: Only allowed within 24-hour window
 * Lock Check: Blocks if locked by another user
 */
router.put(
  '/touchbases/:touchbaseId',
  requireAuth,
  setDbContext,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = getDb();

      // Validate touchbase ID
      const touchbaseIdValidation = uuidSchema.safeParse(req.params.touchbaseId);
      if (!touchbaseIdValidation.success) {
        return res.status(400).json(formatValidationError(touchbaseIdValidation.error));
      }
      const touchbaseId = touchbaseIdValidation.data;

      // Check if locked by another user
      const currentTeamMemberId = req.userContext?.teamMemberId || '';
      if (isLocked(touchbaseId, currentTeamMemberId)) {
        const lock = getLock(touchbaseId);
        return res.status(423).json(
          createErrorResponse(
            'Locked',
            'This touchbase is currently being edited by another user',
            { locked_until: lock?.expiresAt }
          )
        );
      }

      // Validate request body
      const bodyValidation = updateTouchbaseSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        return res.status(400).json(formatValidationError(bodyValidation.error));
      }
      const { responses } = bodyValidation.data;

      // Fetch existing touchbase
      const existingTouchbases = await db
        .select()
        .from(touchbases)
        .where(eq(touchbases.id, touchbaseId))
        .limit(1);

      if (existingTouchbases.length === 0) {
        return res.status(404).json(
          createErrorResponse('Not Found', 'Touchbase not found or you don\'t have access')
        );
      }

      const touchbase = existingTouchbases[0];

      // Privacy check: Only creator can update
      if (touchbase.createdBy !== currentTeamMemberId) {
        return res.status(403).json(
          createErrorResponse(
            'Forbidden',
            'Only the creator can update this touchbase',
            { creator_id: touchbase.createdBy }
          )
        );
      }

      // 24-hour window check
      if (!isWithin24Hours(touchbase.createdAt)) {
        return res.status(403).json(
          createErrorResponse(
            'Forbidden',
            'Touchbase can only be edited within 24 hours of creation',
            {
              created_at: touchbase.createdAt,
              hours_since_creation: (new Date().getTime() - touchbase.createdAt.getTime()) / (1000 * 60 * 60),
            }
          )
        );
      }

      // Update touchbase
      const updatedTouchbases = await db
        .update(touchbases)
        .set({ responses })
        .where(eq(touchbases.id, touchbaseId))
        .returning();

      const updatedTouchbase = updatedTouchbases[0];

      return res.status(200).json({
        message: 'Touchbase updated successfully',
        touchbase: updatedTouchbase,
      });
    } catch (error) {
      console.error('Error updating touchbase:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to update touchbase')
      );
    }
  }
);

/**
 * DELETE /api/touchbases/:touchbaseId
 * Delete a touchbase
 * 
 * Permissions: Objective Owner+ (Account Owner, Account Manager, Project Owner)
 */
router.delete(
  '/touchbases/:touchbaseId',
  requireAuth,
  setDbContext,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = getDb();

      // Validate touchbase ID
      const touchbaseIdValidation = uuidSchema.safeParse(req.params.touchbaseId);
      if (!touchbaseIdValidation.success) {
        return res.status(400).json(formatValidationError(touchbaseIdValidation.error));
      }
      const touchbaseId = touchbaseIdValidation.data;

      // Check permissions
      if (!canEditProject(req.userContext)) {
        return res.status(403).json(createPermissionError('delete touchbases', req.userContext));
      }

      // Fetch existing touchbase
      const existingTouchbases = await db
        .select()
        .from(touchbases)
        .where(eq(touchbases.id, touchbaseId))
        .limit(1);

      if (existingTouchbases.length === 0) {
        return res.status(404).json(
          createErrorResponse('Not Found', 'Touchbase not found or you don\'t have access')
        );
      }

      // Delete touchbase
      await db
        .delete(touchbases)
        .where(eq(touchbases.id, touchbaseId));

      return res.status(200).json({
        message: 'Touchbase deleted successfully',
        touchbase_id: touchbaseId,
      });
    } catch (error) {
      console.error('Error deleting touchbase:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to delete touchbase')
      );
    }
  }
);

/**
 * POST /api/touchbases/:touchbaseId/lock
 * Acquire edit lock on touchbase
 * 
 * Prevents concurrent editing
 * Lock expires after 5 minutes
 * 
 * Permissions: Creator only (within 24hr window)
 */
router.post(
  '/touchbases/:touchbaseId/lock',
  requireAuth,
  setDbContext,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = getDb();

      // Validate touchbase ID
      const touchbaseIdValidation = uuidSchema.safeParse(req.params.touchbaseId);
      if (!touchbaseIdValidation.success) {
        return res.status(400).json(formatValidationError(touchbaseIdValidation.error));
      }
      const touchbaseId = touchbaseIdValidation.data;

      // Verify touchbase exists and user has access
      const existingTouchbases = await db
        .select()
        .from(touchbases)
        .where(eq(touchbases.id, touchbaseId))
        .limit(1);

      if (existingTouchbases.length === 0) {
        return res.status(404).json(
          createErrorResponse('Not Found', 'Touchbase not found or you don\'t have access')
        );
      }

      const touchbase = existingTouchbases[0];
      const currentTeamMemberId = req.userContext?.teamMemberId || '';

      // Only creator can lock
      if (touchbase.createdBy !== currentTeamMemberId) {
        return res.status(403).json(
          createErrorResponse('Forbidden', 'Only the creator can lock this touchbase')
        );
      }

      // Check if already locked by another user
      const existingLock = getLock(touchbaseId);
      if (existingLock && existingLock.teamMemberId !== currentTeamMemberId) {
        return res.status(423).json(
          createErrorResponse(
            'Locked',
            'This touchbase is already locked by another user',
            { 
              locked_by: existingLock.userId,
              expires_at: existingLock.expiresAt 
            }
          )
        );
      }

      // Acquire or renew lock
      const userId = req.userContext?.userId || '';
      const expiresAt = new Date(Date.now() + LOCK_DURATION_MS);
      touchbaseLocks.set(touchbaseId, {
        userId,
        teamMemberId: currentTeamMemberId,
        expiresAt,
      });

      return res.status(200).json({
        message: 'Lock acquired successfully',
        lock: {
          touchbase_id: touchbaseId,
          expires_at: expiresAt,
          duration_ms: LOCK_DURATION_MS,
        },
      });
    } catch (error) {
      console.error('Error acquiring lock:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to acquire lock')
      );
    }
  }
);

/**
 * DELETE /api/touchbases/:touchbaseId/lock
 * Release edit lock on touchbase
 * 
 * Only the lock owner can release their own lock
 * 
 * Permissions: Lock owner
 */
router.delete(
  '/touchbases/:touchbaseId/lock',
  requireAuth,
  setDbContext,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Validate touchbase ID
      const touchbaseIdValidation = uuidSchema.safeParse(req.params.touchbaseId);
      if (!touchbaseIdValidation.success) {
        return res.status(400).json(formatValidationError(touchbaseIdValidation.error));
      }
      const touchbaseId = touchbaseIdValidation.data;

      const currentTeamMemberId = req.userContext?.teamMemberId || '';

      // Check if lock exists
      const existingLock = getLock(touchbaseId);
      if (!existingLock) {
        return res.status(404).json(
          createErrorResponse('Not Found', 'No lock found for this touchbase')
        );
      }

      // Check if user owns the lock
      if (existingLock.teamMemberId !== currentTeamMemberId) {
        return res.status(403).json(
          createErrorResponse('Forbidden', 'You can only release your own locks')
        );
      }

      // Release lock
      touchbaseLocks.delete(touchbaseId);

      return res.status(200).json({
        message: 'Lock released successfully',
        touchbase_id: touchbaseId,
      });
    } catch (error) {
      console.error('Error releasing lock:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to release lock')
      );
    }
  }
);

export default router;
