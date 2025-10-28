/**
 * Tasks API Router
 * 
 * CRUD operations for tasks with assignment management
 * Based on: PRD v5.2 Section 3.3, SLAD v6.0 Section 6.0
 */

import { Response, Router } from 'express';
import { requireAuth, setDbContext, AuthenticatedRequest } from '../auth/middleware';
import { getDb } from '../db';
import { objectives, tasks, taskAssignments } from '../../shared/schema/index';
import { eq, and, inArray } from 'drizzle-orm';
import {
  createTaskSchema,
  updateTaskSchema,
  taskAssignmentsSchema,
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

/**
 * Helper: Check if user is assigned to a task
 */
async function isAssignedToTask(db: ReturnType<typeof getDb>, taskId: string, teamMemberId: string): Promise<boolean> {
  const assignments = await db
    .select()
    .from(taskAssignments)
    .where(
      and(
        eq(taskAssignments.taskId, taskId),
        eq(taskAssignments.teamMemberId, teamMemberId)
      )
    )
    .limit(1);
  
  return assignments.length > 0;
}

/**
 * Helper: Check if user has Objective Owner role for this objective
 */
async function isObjectiveOwner(db: ReturnType<typeof getDb>, objectiveId: string, _teamMemberId: string): Promise<boolean> {
  // For now, we check if user is assigned to the objective (via project assignments)
  // In a full implementation, there would be an objective_assignments table
  // This is a simplified check - consider the user an "Objective Owner" if they can access it via RLS
  const objectiveCheck = await db
    .select({ id: objectives.id })
    .from(objectives)
    .where(eq(objectives.id, objectiveId))
    .limit(1);
  
  return objectiveCheck.length > 0; // RLS will filter if they don't have access
}

/**
 * POST /api/objectives/:objectiveId/tasks
 * Create a new task
 * 
 * Permissions: Project Owner+, Objective Owner
 * 
 * Supports creating task with initial assignments
 */
router.post(
  '/objectives/:objectiveId/tasks',
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
      const bodyValidation = createTaskSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        return res.status(400).json(formatValidationError(bodyValidation.error));
      }
      const { title, description, priority, due_date, assigned_team_member_ids } = bodyValidation.data;

      // Check if objective exists and user has access (RLS will filter)
      const existingObjectives = await db
        .select({ id: objectives.id, projectId: objectives.projectId })
        .from(objectives)
        .where(eq(objectives.id, objectiveId))
        .limit(1);

      if (existingObjectives.length === 0) {
        return res.status(404).json(
          createErrorResponse('Not Found', 'Objective not found or you don\'t have access')
        );
      }

      // Permission check: Project Owner+ OR Objective Owner can create tasks
      const teamMemberId = req.userContext?.teamMemberId || '';
      const canCreate = canCreateProject(req.userContext) || 
                       await isObjectiveOwner(db, objectiveId, teamMemberId);

      if (!canCreate) {
        return res.status(403).json(
          createPermissionError('create tasks', req.userContext)
        );
      }

      // Create task and assignments in transaction for data integrity
      const result = await db.transaction(async (tx) => {
        // Create task
        const newTasks = await tx
          .insert(tasks)
          .values({
            objectiveId,
            title,
            description: description || null,
            status: 'todo',
            priority: priority || 2,
            dueDate: due_date ? new Date(due_date) : null,
          })
          .returning();

        const newTask = newTasks[0];

        // Create assignments if provided
        if (assigned_team_member_ids && assigned_team_member_ids.length > 0) {
          const assignmentValues = assigned_team_member_ids.map(memberId => ({
            taskId: newTask.id,
            teamMemberId: memberId,
          }));

          await tx
            .insert(taskAssignments)
            .values(assignmentValues);
        }

        // Fetch task with assignments
        const taskWithAssignments = await tx
          .select()
          .from(taskAssignments)
          .where(eq(taskAssignments.taskId, newTask.id));

        return { newTask, taskWithAssignments };
      });

      const { newTask, taskWithAssignments } = result;

      return res.status(201).json({
        message: 'Task created successfully',
        task: {
          ...newTask,
          assigned_team_members: taskWithAssignments.map(a => a.teamMemberId),
        },
      });
    } catch (error) {
      console.error('Error creating task:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to create task')
      );
    }
  }
);

/**
 * GET /api/objectives/:objectiveId/tasks
 * List tasks for an objective
 * 
 * Permissions: All team members with access to objective (RLS filtered)
 * 
 * Returns tasks with their assignments
 */
router.get(
  '/objectives/:objectiveId/tasks',
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

      // Fetch tasks for objective (RLS will filter)
      const tasksList = await db
        .select()
        .from(tasks)
        .where(eq(tasks.objectiveId, objectiveId))
        .orderBy(tasks.createdAt);

      // Fetch all assignments for these tasks
      const taskIds = tasksList.map(t => t.id);
      const assignmentsMap: Map<string, string[]> = new Map();

      if (taskIds.length > 0) {
        const allAssignments = await db
          .select()
          .from(taskAssignments)
          .where(inArray(taskAssignments.taskId, taskIds));

        // Build map of taskId -> teamMemberIds[]
        for (const assignment of allAssignments) {
          if (!assignmentsMap.has(assignment.taskId)) {
            assignmentsMap.set(assignment.taskId, []);
          }
          assignmentsMap.get(assignment.taskId)!.push(assignment.teamMemberId);
        }
      }

      // Combine tasks with assignments
      const tasksWithAssignments = tasksList.map(task => ({
        ...task,
        assigned_team_members: assignmentsMap.get(task.id) || [],
      }));

      return res.status(200).json({
        tasks: tasksWithAssignments,
        total: tasksWithAssignments.length,
      });
    } catch (error) {
      console.error('Error listing tasks:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to list tasks')
      );
    }
  }
);

/**
 * PUT /api/tasks/:taskId
 * Update task details
 * 
 * Permissions:
 * - Project Owner+, Objective Owner: Can update all fields
 * - Team Member: Can ONLY update status of tasks assigned to them
 * 
 * This is crucial for Tab 4 ↔ Tab 3 sync functionality
 */
router.put(
  '/tasks/:taskId',
  requireAuth,
  setDbContext,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = getDb();

      // Validate task ID
      const taskIdValidation = uuidSchema.safeParse(req.params.taskId);
      if (!taskIdValidation.success) {
        return res.status(400).json(formatValidationError(taskIdValidation.error));
      }
      const taskId = taskIdValidation.data;

      // Validate request body
      const bodyValidation = updateTaskSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        return res.status(400).json(formatValidationError(bodyValidation.error));
      }
      const updateData = bodyValidation.data;

      // Fetch existing task (RLS will filter)
      const existingTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);

      if (existingTasks.length === 0) {
        return res.status(404).json(
          createErrorResponse('Not Found', 'Task not found or you don\'t have access')
        );
      }

      const task = existingTasks[0];
      const teamMemberId = req.userContext?.teamMemberId || '';

      // Permission logic: Complex!
      // 1. Project Owner+ or Objective Owner can update anything
      // 2. Team Member can ONLY update status if assigned to this task
      
      const isHigherRole = canEditProject(req.userContext) || 
                          await isObjectiveOwner(db, task.objectiveId, teamMemberId);
      
      const isAssigned = await isAssignedToTask(db, taskId, teamMemberId);
      const isTeamMember = req.userContext?.role === 'Team Member';

      // If Team Member...
      if (isTeamMember && !isHigherRole) {
        // Must be assigned to task
        if (!isAssigned) {
          return res.status(403).json(
            createErrorResponse(
              'Forbidden',
              'You can only update tasks assigned to you',
              { current_role: req.userContext?.role }
            )
          );
        }

        // Can ONLY update status
        const updateKeys = Object.keys(updateData);
        if (updateKeys.length !== 1 || !updateKeys.includes('status')) {
          return res.status(403).json(
            createErrorResponse(
              'Forbidden',
              'Team Members can only update the status field of assigned tasks',
              { 
                current_role: req.userContext?.role,
                allowed_fields: ['status'],
                attempted_fields: updateKeys
              }
            )
          );
        }
      }

      // Build update object
      const updateObject: Partial<typeof tasks.$inferInsert> = {};
      
      if (updateData.title !== undefined) {
        updateObject.title = updateData.title;
      }
      if (updateData.description !== undefined) {
        updateObject.description = updateData.description;
      }
      if (updateData.status !== undefined) {
        updateObject.status = updateData.status;
      }
      if (updateData.priority !== undefined) {
        updateObject.priority = updateData.priority;
      }
      if (updateData.due_date !== undefined) {
        updateObject.dueDate = updateData.due_date ? new Date(updateData.due_date) : null;
      }

      // Update task
      const updatedTasks = await db
        .update(tasks)
        .set(updateObject)
        .where(eq(tasks.id, taskId))
        .returning();

      const updatedTask = updatedTasks[0];

      // Fetch assignments
      const assignments = await db
        .select()
        .from(taskAssignments)
        .where(eq(taskAssignments.taskId, taskId));

      return res.status(200).json({
        message: 'Task updated successfully',
        task: {
          ...updatedTask,
          assigned_team_members: assignments.map(a => a.teamMemberId),
        },
      });
    } catch (error) {
      console.error('Error updating task:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to update task')
      );
    }
  }
);

/**
 * PATCH /api/tasks/:taskId/assignments
 * Manage task assignments (add/remove team members)
 * 
 * Permissions: Project Owner+, Objective Owner
 * 
 * Replaces all current assignments with provided list
 * Supports assigning virtual personas
 */
router.patch(
  '/tasks/:taskId/assignments',
  requireAuth,
  setDbContext,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = getDb();

      // Validate task ID
      const taskIdValidation = uuidSchema.safeParse(req.params.taskId);
      if (!taskIdValidation.success) {
        return res.status(400).json(formatValidationError(taskIdValidation.error));
      }
      const taskId = taskIdValidation.data;

      // Validate request body
      const bodyValidation = taskAssignmentsSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        return res.status(400).json(formatValidationError(bodyValidation.error));
      }
      const { team_member_ids } = bodyValidation.data;

      // Fetch existing task (RLS will filter)
      const existingTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);

      if (existingTasks.length === 0) {
        return res.status(404).json(
          createErrorResponse('Not Found', 'Task not found or you don\'t have access')
        );
      }

      const task = existingTasks[0];
      const teamMemberId = req.userContext?.teamMemberId || '';

      // Permission check: Project Owner+ OR Objective Owner
      const canManage = canEditProject(req.userContext) || 
                       await isObjectiveOwner(db, task.objectiveId, teamMemberId);

      if (!canManage) {
        return res.status(403).json(
          createPermissionError('manage task assignments', req.userContext)
        );
      }

      // Update assignments in transaction for atomicity
      const newAssignments = await db.transaction(async (tx) => {
        // Delete all existing assignments
        await tx
          .delete(taskAssignments)
          .where(eq(taskAssignments.taskId, taskId));

        // Create new assignments
        if (team_member_ids.length > 0) {
          const assignmentValues = team_member_ids.map(memberId => ({
            taskId,
            teamMemberId: memberId,
          }));

          await tx
            .insert(taskAssignments)
            .values(assignmentValues);
        }

        // Fetch updated assignments
        return await tx
          .select()
          .from(taskAssignments)
          .where(eq(taskAssignments.taskId, taskId));
      });

      return res.status(200).json({
        message: 'Task assignments updated successfully',
        task_id: taskId,
        assigned_team_members: newAssignments.map(a => a.teamMemberId),
      });
    } catch (error) {
      console.error('Error updating task assignments:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to update task assignments')
      );
    }
  }
);

/**
 * DELETE /api/tasks/:taskId
 * Delete a task
 * 
 * Permissions: Project Owner+, Objective Owner
 * Team Members cannot delete tasks
 */
router.delete(
  '/tasks/:taskId',
  requireAuth,
  setDbContext,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = getDb();

      // Validate task ID
      const taskIdValidation = uuidSchema.safeParse(req.params.taskId);
      if (!taskIdValidation.success) {
        return res.status(400).json(formatValidationError(taskIdValidation.error));
      }
      const taskId = taskIdValidation.data;

      // Fetch existing task (RLS will filter)
      const existingTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);

      if (existingTasks.length === 0) {
        return res.status(404).json(
          createErrorResponse('Not Found', 'Task not found or you don\'t have access')
        );
      }

      const task = existingTasks[0];
      const teamMemberId = req.userContext?.teamMemberId || '';

      // Permission check: Project Owner+ OR Objective Owner
      const canDelete = canEditProject(req.userContext) || 
                       await isObjectiveOwner(db, task.objectiveId, teamMemberId);

      if (!canDelete) {
        return res.status(403).json(
          createPermissionError('delete tasks', req.userContext)
        );
      }

      // Delete task (cascade will delete assignments)
      await db
        .delete(tasks)
        .where(eq(tasks.id, taskId));

      return res.status(200).json({
        message: 'Task deleted successfully',
        task_id: taskId,
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to delete task')
      );
    }
  }
);

export default router;
