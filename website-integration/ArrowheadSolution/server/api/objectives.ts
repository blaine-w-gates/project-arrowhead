/**
 * Objectives API Router
 * 
 * CRUD operations for objectives with journey state management and locking
 * Based on: PRD v5.2 Section 3.2, SLAD v6.0 Section 6.0
 */

import { Response, Router } from 'express';
import { requireAuth, setDbContext, AuthenticatedRequest } from '../auth/middleware';
import { getDb } from '../db';
import { projects, objectives } from '../../shared/schema/index';
import { eq, and } from 'drizzle-orm';
import {
  createObjectiveSchema,
  updateObjectiveSchema,
  listObjectivesQuerySchema,
  uuidSchema,
  formatValidationError,
  createErrorResponse,
} from './validation';
import {
  canCreateProject, // Project Owner+ can create objectives
  canEditProject,   // Project Owner+ can edit objectives
  createPermissionError,
} from './permissions';

const router = Router();

// In-memory lock store (in production, use Redis or database table)
// Structure: { objectiveId: { userId: string, expiresAt: Date } }
const objectiveLocks: Map<string, { userId: string, teamMemberId: string, expiresAt: Date }> = new Map();

// Lock expiry time: 5 minutes
const LOCK_DURATION_MS = 5 * 60 * 1000;

/**
 * Helper: Check if objective is locked by another user
 */
function isLocked(objectiveId: string, teamMemberId: string): boolean {
  const lock = objectiveLocks.get(objectiveId);
  if (!lock) return false;
  
  // Check if lock expired
  if (lock.expiresAt < new Date()) {
    objectiveLocks.delete(objectiveId);
    return false;
  }
  
  // Locked by another user
  return lock.teamMemberId !== teamMemberId;
}

/**
 * Helper: Get lock info
 */
function getLock(objectiveId: string): { userId: string, teamMemberId: string, expiresAt: Date } | null {
  const lock = objectiveLocks.get(objectiveId);
  if (!lock) return null;
  
  // Check if expired
  if (lock.expiresAt < new Date()) {
    objectiveLocks.delete(objectiveId);
    return null;
  }
  
  return lock;
}

/**
 * POST /api/projects/:projectId/objectives
 * Create a new objective
 * 
 * Yes/No Branching Logic (PRD v5.2 Section 3.2):
 * - Yes (start_with_brainstorm: true): Starts at step 1 (Brainstorm)
 * - No (start_with_brainstorm: false): Starts at step 11 (Objectives module)
 * 
 * Permissions: Account Owner, Account Manager, Project Owner
 */
router.post(
  '/projects/:projectId/objectives',
  requireAuth,
  setDbContext,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = getDb();

      // Validate project ID
      const projectIdValidation = uuidSchema.safeParse(req.params.projectId);
      if (!projectIdValidation.success) {
        return res.status(400).json(formatValidationError(projectIdValidation.error));
      }
      const projectId = projectIdValidation.data;

      // Check permissions (Project Owner+)
      if (!canCreateProject(req.userContext)) {
        return res.status(403).json(createPermissionError('create objectives', req.userContext));
      }

      // Validate request body
      const bodyValidation = createObjectiveSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        return res.status(400).json(formatValidationError(bodyValidation.error));
      }
      const { name, start_with_brainstorm, target_completion_date } = bodyValidation.data;

      // Verify project exists and user has access (RLS will filter)
      const existingProjects = await db
        .select({ id: projects.id, teamId: projects.teamId })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (existingProjects.length === 0) {
        return res.status(404).json(
          createErrorResponse('Not Found', 'Project not found or you don\'t have access')
        );
      }

      // Yes/No Branching Logic
      const initialStep = start_with_brainstorm ? 1 : 11;

      // Create objective
      const newObjectives = await db
        .insert(objectives)
        .values({
          projectId,
          name,
          currentStep: initialStep,
          journeyStatus: 'draft',
          brainstormData: null,
          chooseData: null,
          objectivesData: null,
          targetCompletionDate: target_completion_date ? new Date(target_completion_date) : null,
          allTasksComplete: false,
          isArchived: false,
        })
        .returning();

      const newObjective = newObjectives[0];

      return res.status(201).json({
        message: 'Objective created successfully',
        objective: newObjective,
        started_with_brainstorm: start_with_brainstorm,
      });
    } catch (error) {
      console.error('Error creating objective:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to create objective')
      );
    }
  }
);

/**
 * GET /api/projects/:projectId/objectives
 * List objectives for a project
 * 
 * Query params:
 * - include_archived: 'true' | 'false' (default: 'false')
 * - journey_status: 'draft' | 'complete' | 'all' (default: 'all')
 * 
 * Permissions: All team members (RLS filtered by project assignments)
 */
router.get(
  '/projects/:projectId/objectives',
  requireAuth,
  setDbContext,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = getDb();

      // Validate project ID
      const projectIdValidation = uuidSchema.safeParse(req.params.projectId);
      if (!projectIdValidation.success) {
        return res.status(400).json(formatValidationError(projectIdValidation.error));
      }
      const projectId = projectIdValidation.data;

      // Validate query parameters
      const queryValidation = listObjectivesQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        return res.status(400).json(formatValidationError(queryValidation.error));
      }
      const { include_archived, journey_status } = queryValidation.data;

      // Verify project exists and user has access
      const existingProjects = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (existingProjects.length === 0) {
        return res.status(404).json(
          createErrorResponse('Not Found', 'Project not found or you don\'t have access')
        );
      }

      // Build query conditions
      const conditions = [eq(objectives.projectId, projectId)];
      
      if (include_archived === 'false') {
        conditions.push(eq(objectives.isArchived, false));
      }
      
      if (journey_status !== 'all') {
        conditions.push(eq(objectives.journeyStatus, journey_status));
      }

      // Fetch objectives (RLS will filter by assignments)
      const objectivesList = await db
        .select()
        .from(objectives)
        .where(and(...conditions))
        .orderBy(objectives.createdAt);

      // Add lock status to each objective
      const objectivesWithLocks = objectivesList.map(objective => {
        const lock = getLock(objective.id);
        return {
          ...objective,
          is_locked: !!lock,
          locked_by_current_user: lock?.teamMemberId === req.userContext?.teamMemberId,
          lock_expires_at: lock?.expiresAt,
        };
      });

      return res.status(200).json({
        objectives: objectivesWithLocks,
        total: objectivesWithLocks.length,
      });
    } catch (error) {
      console.error('Error listing objectives:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to list objectives')
      );
    }
  }
);

/**
 * GET /api/objectives/:objectiveId/resume
 * Fetch draft objective state to resume journey
 * 
 * Returns current step and all journey data
 * 
 * Permissions: Project Owner+ or assigned team members
 */
router.get(
  '/objectives/:objectiveId/resume',
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

      // Fetch objective (RLS will filter)
      const existingObjectives = await db
        .select()
        .from(objectives)
        .where(eq(objectives.id, objectiveId))
        .limit(1);

      if (existingObjectives.length === 0) {
        return res.status(404).json(
          createErrorResponse('Not Found', 'Objective not found or you don\'t have access')
        );
      }

      const objective = existingObjectives[0];

      // Check if locked by another user
      const lock = getLock(objectiveId);
      const isLockedByOther = lock && lock.teamMemberId !== req.userContext?.teamMemberId;

      return res.status(200).json({
        objective: {
          id: objective.id,
          name: objective.name,
          current_step: objective.currentStep,
          journey_status: objective.journeyStatus,
          brainstorm_data: objective.brainstormData,
          choose_data: objective.chooseData,
          objectives_data: objective.objectivesData,
          target_completion_date: objective.targetCompletionDate,
        },
        is_locked: isLockedByOther,
        locked_by_current_user: lock?.teamMemberId === req.userContext?.teamMemberId,
        lock_expires_at: lock?.expiresAt,
      });
    } catch (error) {
      console.error('Error resuming objective:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to resume objective')
      );
    }
  }
);

/**
 * PUT /api/objectives/:objectiveId
 * Update objective (name, journey data, step, status)
 * 
 * Supports partial updates for journey state management
 * 
 * Permissions: Account Owner, Account Manager, Project Owner
 */
router.put(
  '/objectives/:objectiveId',
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

      // Check permissions
      if (!canEditProject(req.userContext)) {
        return res.status(403).json(createPermissionError('edit objectives', req.userContext));
      }

      // Check if locked by another user
      if (isLocked(objectiveId, req.userContext?.teamMemberId || '')) {
        const lock = getLock(objectiveId);
        return res.status(423).json(
          createErrorResponse(
            'Locked',
            'This objective is currently being edited by another user',
            { locked_until: lock?.expiresAt }
          )
        );
      }

      // Validate request body
      const bodyValidation = updateObjectiveSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        return res.status(400).json(formatValidationError(bodyValidation.error));
      }
      const updateData = bodyValidation.data;

      // Fetch existing objective (RLS will filter)
      const existingObjectives = await db
        .select()
        .from(objectives)
        .where(eq(objectives.id, objectiveId))
        .limit(1);

      if (existingObjectives.length === 0) {
        return res.status(404).json(
          createErrorResponse('Not Found', 'Objective not found or you don\'t have access')
        );
      }

      // Build update object
      const updateObject: Partial<typeof objectives.$inferInsert> = {};
      
      if (updateData.name !== undefined) {
        updateObject.name = updateData.name;
      }
      if (updateData.current_step !== undefined) {
        updateObject.currentStep = updateData.current_step;
      }
      if (updateData.journey_status !== undefined) {
        updateObject.journeyStatus = updateData.journey_status;
      }
      if (updateData.brainstorm_data !== undefined) {
        updateObject.brainstormData = updateData.brainstorm_data;
      }
      if (updateData.choose_data !== undefined) {
        updateObject.chooseData = updateData.choose_data;
      }
      if (updateData.objectives_data !== undefined) {
        updateObject.objectivesData = updateData.objectives_data;
      }
      if (updateData.target_completion_date !== undefined) {
        updateObject.targetCompletionDate = updateData.target_completion_date 
          ? new Date(updateData.target_completion_date) 
          : null;
      }
      if (updateData.is_archived !== undefined) {
        updateObject.isArchived = updateData.is_archived;
      }

      // Update objective
      const updatedObjectives = await db
        .update(objectives)
        .set(updateObject)
        .where(eq(objectives.id, objectiveId))
        .returning();

      const updatedObjective = updatedObjectives[0];

      return res.status(200).json({
        message: 'Objective updated successfully',
        objective: updatedObjective,
      });
    } catch (error) {
      console.error('Error updating objective:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to update objective')
      );
    }
  }
);

/**
 * POST /api/objectives/:objectiveId/lock
 * Acquire edit lock on objective
 * 
 * Prevents concurrent editing
 * Lock expires after 5 minutes
 * 
 * Permissions: All team members with access to objective
 */
router.post(
  '/objectives/:objectiveId/lock',
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

      const userId = req.userContext?.userId || '';
      const teamMemberId = req.userContext?.teamMemberId || '';

      // Check if already locked by another user
      const existingLock = getLock(objectiveId);
      if (existingLock && existingLock.teamMemberId !== teamMemberId) {
        return res.status(423).json(
          createErrorResponse(
            'Locked',
            'This objective is already locked by another user',
            { 
              locked_by: existingLock.userId,
              expires_at: existingLock.expiresAt 
            }
          )
        );
      }

      // Acquire or renew lock
      const expiresAt = new Date(Date.now() + LOCK_DURATION_MS);
      objectiveLocks.set(objectiveId, {
        userId,
        teamMemberId,
        expiresAt,
      });

      return res.status(200).json({
        message: 'Lock acquired successfully',
        lock: {
          objective_id: objectiveId,
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
 * DELETE /api/objectives/:objectiveId/lock
 * Release edit lock on objective
 * 
 * Only the lock owner can release their own lock
 * 
 * Permissions: Lock owner
 */
router.delete(
  '/objectives/:objectiveId/lock',
  requireAuth,
  setDbContext,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Validate objective ID
      const objectiveIdValidation = uuidSchema.safeParse(req.params.objectiveId);
      if (!objectiveIdValidation.success) {
        return res.status(400).json(formatValidationError(objectiveIdValidation.error));
      }
      const objectiveId = objectiveIdValidation.data;

      const teamMemberId = req.userContext?.teamMemberId || '';

      // Check if lock exists
      const existingLock = getLock(objectiveId);
      if (!existingLock) {
        return res.status(404).json(
          createErrorResponse('Not Found', 'No lock found for this objective')
        );
      }

      // Check if user owns the lock
      if (existingLock.teamMemberId !== teamMemberId) {
        return res.status(403).json(
          createErrorResponse('Forbidden', 'You can only release your own locks')
        );
      }

      // Release lock
      objectiveLocks.delete(objectiveId);

      return res.status(200).json({
        message: 'Lock released successfully',
        objective_id: objectiveId,
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
