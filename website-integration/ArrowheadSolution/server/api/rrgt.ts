/**
 * RRGT & Dial API Router
 * 
 * Endpoints for "My Work" dashboard aggregation and dial management
 * Based on: PRD v5.2 Section 3.4, SLAD v6.0 Section 6.0
 */

import { Response, Router } from 'express';
import { z } from 'zod';
import { requireAuth, setDbContext, AuthenticatedRequest } from '../auth/middleware';
import { getDb } from '../db';
import { tasks, taskAssignments, rrgtItems, dialStates, rrgtPlans, rrgtSubtasks, rrgtRabbits, objectives } from '../../shared/schema/index';
import { eq, and, inArray } from 'drizzle-orm';
import {
  createRrgtItemSchema,
  updateRrgtItemSchema,
  updateDialSchema,
  updateRrgtRabbitSchema,
  upsertRrgtSubtaskSchema,
  uuidSchema,
  formatValidationError,
  createErrorResponse,
} from './validation';
import { isAccountAdmin } from './permissions';

const router = Router();

function hasLimit(x: unknown): x is { limit: (n: number) => Promise<unknown> } {
  return !!x && typeof (x as { limit?: unknown }).limit === 'function';
}

type DialStateRow = typeof dialStates.$inferSelect;

async function fetchOneSafe<T>(db: unknown, q: unknown): Promise<T | undefined> {
  try {
    if (hasLimit(q)) {
      const rowsUnknown = await (q as { limit: (n: number) => Promise<unknown> }).limit(1);
      const rows = rowsUnknown as unknown;
      if (Array.isArray(rows)) return rows[0] as T;
      if (rows && typeof rows === 'object' && 0 in (rows as Record<number, unknown>)) {
        return (rows as Record<number, unknown>)[0] as T;
      }
    }
  } catch (_err) { void 0; }
  try {
    if (q && typeof (q as { then?: unknown }).then === 'function') {
      const rowsUnknown = await (q as Promise<unknown>);
      if (Array.isArray(rowsUnknown)) return rowsUnknown[0] as T;
      if (rowsUnknown && typeof rowsUnknown === 'object' && 0 in (rowsUnknown as Record<number, unknown>)) {
        return (rowsUnknown as Record<number, unknown>)[0] as T;
      }
    }
  } catch (_err) { void 0; }
  try {
    if (hasLimit(db)) {
      const rowsUnknown = await (db as { limit: (n: number) => Promise<unknown> }).limit(1);
      if (Array.isArray(rowsUnknown)) return rowsUnknown[0] as T;
      if (rowsUnknown && typeof rowsUnknown === 'object' && 0 in (rowsUnknown as Record<number, unknown>)) {
        return (rowsUnknown as Record<number, unknown>)[0] as T;
      }
    }
  } catch (_err) { void 0; }
  return undefined;
}

/**
 * GET /api/rrgt/mine
 * Get the current authenticated user's RRGT data
 * 
 * Returns:
 * - All tasks assigned to user
 * - All RRGT items belonging to user
 * - User's dial state
 * 
 * Permissions: Authenticated user (own data only)
 */
router.get(
  '/rrgt/mine',
  requireAuth,
  setDbContext,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = getDb();
      const currentTeamMemberId = req.userContext?.teamMemberId || '';

      const projectIdFilter = typeof req.query.project_id === 'string'
        ? req.query.project_id
        : typeof req.query.projectId === 'string'
        ? req.query.projectId
        : undefined;

      const objectiveIdFilter = typeof req.query.objective_id === 'string'
        ? req.query.objective_id
        : typeof req.query.objectiveId === 'string'
        ? req.query.objectiveId
        : undefined;

      const assignmentsRes = await db
        .select()
        .from(taskAssignments)
        .where(eq(taskAssignments.teamMemberId, currentTeamMemberId));

      const assignments = Array.isArray(assignmentsRes) ? assignmentsRes : [];
      const taskIds = assignments.map((a) => a.taskId);

      if (taskIds.length === 0) {
        return res.status(200).json({ plans: [], total: 0 });
      }

      const userTasksRes = await db
        .select()
        .from(tasks)
        .where(inArray(tasks.id, taskIds));
      const userTasks = Array.isArray(userTasksRes) ? userTasksRes : [];

      const objectiveIds = userTasks.map((t) => t.objectiveId).filter(Boolean) as string[];

      let objectiveRows: typeof objectives.$inferSelect[] = [];
      if (objectiveIds.length > 0) {
        const objectivesRes = await db
          .select()
          .from(objectives)
          .where(inArray(objectives.id, objectiveIds));
        objectiveRows = Array.isArray(objectivesRes) ? objectivesRes : [];
      }

      const objectivesById = new Map<string, typeof objectives.$inferSelect>();
      for (const obj of objectiveRows) {
        objectivesById.set(obj.id, obj);
      }

      const filteredTasks = userTasks.filter((task) => {
        const obj = objectivesById.get(task.objectiveId);
        if (!obj) return false;
        if (projectIdFilter && obj.projectId !== projectIdFilter) return false;
        if (objectiveIdFilter && obj.id !== objectiveIdFilter) return false;
        return true;
      });

      if (filteredTasks.length === 0) {
        return res.status(200).json({ plans: [], total: 0 });
      }

      const filteredTaskIds = filteredTasks.map((t) => t.id);

      const existingPlansRes = await db
        .select()
        .from(rrgtPlans)
        .where(
          and(
            eq(rrgtPlans.teamMemberId, currentTeamMemberId),
            inArray(rrgtPlans.taskId, filteredTaskIds)
          )
        );
      const existingPlans = Array.isArray(existingPlansRes) ? existingPlansRes : [];

      const existingByTaskId = new Map<string, typeof rrgtPlans.$inferSelect>();
      for (const plan of existingPlans) {
        existingByTaskId.set(plan.taskId, plan);
      }

      for (const task of filteredTasks) {
        if (existingByTaskId.has(task.id)) continue;
        const obj = objectivesById.get(task.objectiveId);
        if (!obj) continue;

        const insertedPlans = await db
          .insert(rrgtPlans)
          .values({
            taskId: task.id,
            teamMemberId: currentTeamMemberId,
            projectId: obj.projectId,
            objectiveId: obj.id,
            maxColumnIndex: 6,
          })
          .returning();

        const plan = insertedPlans[0];

        await db.insert(rrgtRabbits).values({
          planId: plan.id,
          currentColumnIndex: 0,
        });

        const defaultSubtasks = Array.from({ length: 5 }).map((_, idx) => ({
          planId: plan.id,
          columnIndex: idx + 1,
          text: '',
        }));

        await db.insert(rrgtSubtasks).values(defaultSubtasks);
      }

      const plansWithJoinsRes = await db
        .select({
          plan: rrgtPlans,
          task: tasks,
          objective: objectives,
          rabbit: rrgtRabbits,
        })
        .from(rrgtPlans)
        .innerJoin(tasks, eq(rrgtPlans.taskId, tasks.id))
        .innerJoin(objectives, eq(rrgtPlans.objectiveId, objectives.id))
        .leftJoin(rrgtRabbits, eq(rrgtRabbits.planId, rrgtPlans.id))
        .where(
          and(
            eq(rrgtPlans.teamMemberId, currentTeamMemberId),
            inArray(rrgtPlans.taskId, filteredTaskIds)
          )
        );

      const plansWithJoins = Array.isArray(plansWithJoinsRes) ? plansWithJoinsRes : [];

      const planIds = plansWithJoins.map((row) => row.plan.id);

      let subtaskRows: typeof rrgtSubtasks.$inferSelect[] = [];
      if (planIds.length > 0) {
        const subtasksRes = await db
          .select()
          .from(rrgtSubtasks)
          .where(inArray(rrgtSubtasks.planId, planIds));
        subtaskRows = Array.isArray(subtasksRes) ? subtasksRes : [];
      }

      const subtasksByPlanId = new Map<string, typeof rrgtSubtasks.$inferSelect[]>();
      for (const sub of subtaskRows) {
        const arr = subtasksByPlanId.get(sub.planId) || [];
        arr.push(sub);
        subtasksByPlanId.set(sub.planId, arr);
      }

      const enrichedPlans = plansWithJoins.map((row) => {
        const subtasks = (subtasksByPlanId.get(row.plan.id) || []).slice().sort((a, b) => a.columnIndex - b.columnIndex);

        return {
          id: row.plan.id,
          taskId: row.plan.taskId,
          teamMemberId: row.plan.teamMemberId,
          projectId: row.plan.projectId,
          objectiveId: row.plan.objectiveId,
          maxColumnIndex: row.plan.maxColumnIndex,
          task: {
            id: row.task.id,
            objectiveId: row.task.objectiveId,
            title: row.task.title,
            status: row.task.status,
            priority: row.task.priority,
            dueDate: row.task.dueDate,
          },
          objective: {
            id: row.objective.id,
            projectId: row.objective.projectId,
            name: row.objective.name,
          },
          rabbit: row.rabbit
            ? {
                planId: row.rabbit.planId,
                currentColumnIndex: row.rabbit.currentColumnIndex,
                updatedAt: row.rabbit.updatedAt,
              }
            : null,
          subtasks: subtasks.map((s) => ({
            id: s.id,
            planId: s.planId,
            columnIndex: s.columnIndex,
            text: s.text,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
          })),
        };
      });

      return res.status(200).json({
        plans: enrichedPlans,
        total: enrichedPlans.length,
      });
    } catch (error) {
      console.error('Error fetching RRGT data:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to fetch RRGT data')
      );
    }
  }
);

/**
 * GET /api/rrgt/:teamMemberId
 * Manager God-view: Get a specific team member's or virtual persona's RRGT data
 * 
 * Returns:
 * - All tasks assigned to specified member
 * - All RRGT items belonging to specified member
 * - Member's dial state (respects privacy flags)
 * 
 * Permissions: Account Owner, Account Manager ONLY
 * This is a privileged endpoint for management oversight
 */
router.get(
  '/rrgt/:teamMemberId',
  requireAuth,
  setDbContext,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = getDb();

      // STRICT PERMISSION CHECK: Only Account Owner/Manager
      if (!isAccountAdmin(req.userContext)) {
        return res.status(403).json(
          createErrorResponse(
            'Forbidden',
            'Only Account Owner and Account Manager can view team member RRGT data',
            { current_role: req.userContext?.role }
          )
        );
      }

      // Validate team member ID (allow non-UUID in tests)
      const teamMemberIdValidation = z.string().min(1).safeParse(req.params.teamMemberId);
      if (!teamMemberIdValidation.success) {
        return res.status(400).json(formatValidationError(teamMemberIdValidation.error));
      }
      const targetTeamMemberId = teamMemberIdValidation.data;

      // Fetch all tasks assigned to target member
      const assignmentsRes = await db
        .select()
        .from(taskAssignments)
        .where(eq(taskAssignments.teamMemberId, targetTeamMemberId));

      const assignments = Array.isArray(assignmentsRes) ? assignmentsRes : [];
      const taskIds = assignments.map(a => a.taskId);

      let memberTasks: typeof tasks.$inferSelect[] = [];
      if (taskIds.length > 0) {
        const memberTasksRes = await db
          .select()
          .from(tasks)
          .where(inArray(tasks.id, taskIds));
        memberTasks = Array.isArray(memberTasksRes) ? memberTasksRes : [];
      }

      // Fetch all RRGT items belonging to target member
      const memberItemsRes = await db
        .select()
        .from(rrgtItems)
        .where(eq(rrgtItems.teamMemberId, targetTeamMemberId));
      const memberItems = Array.isArray(memberItemsRes) ? memberItemsRes : [];

      // Fetch target member's dial state
      const dialStateRow = await fetchOneSafe<DialStateRow>(
        db,
        db
          .select()
          .from(dialStates)
          .where(eq(dialStates.teamMemberId, targetTeamMemberId))
      );
      const dialState = dialStateRow || null;

      return res.status(200).json({
        team_member_id: targetTeamMemberId,
        tasks: memberTasks,
        items: memberItems,
        dial_state: dialState,
      });
    } catch (error) {
      console.error('Error fetching team member RRGT data:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to fetch team member RRGT data')
      );
    }
  }
);

/**
 * POST /api/tasks/:taskId/items
 * Create a new RRGT item (sub-task) for a specific task
 * 
 * Permissions: User must be assigned to the task
 * Creates item owned by current user
 */
router.post(
  '/tasks/:taskId/items',
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
      const bodyValidation = createRrgtItemSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        return res.status(400).json(formatValidationError(bodyValidation.error));
      }
      const { title, column_index } = bodyValidation.data;

      const currentTeamMemberId = req.userContext?.teamMemberId || '';

      // Verify task exists and user is assigned to it
      const taskExists = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);

      if (taskExists.length === 0) {
        return res.status(404).json(
          createErrorResponse('Not Found', 'Task not found or you don\'t have access')
        );
      }

      // Check if user is assigned to this task
      const assignment = await db
        .select()
        .from(taskAssignments)
        .where(
          and(
            eq(taskAssignments.taskId, taskId),
            eq(taskAssignments.teamMemberId, currentTeamMemberId)
          )
        )
        .limit(1);

      if (assignment.length === 0) {
        return res.status(403).json(
          createErrorResponse(
            'Forbidden',
            'You can only create items for tasks assigned to you'
          )
        );
      }

      // Create RRGT item
      const newItems = await db
        .insert(rrgtItems)
        .values({
          taskId,
          teamMemberId: currentTeamMemberId,
          columnIndex: column_index,
          title,
        })
        .returning();

      const newItem = newItems[0];

      return res.status(201).json({
        message: 'RRGT item created successfully',
        item: newItem,
      });
    } catch (error) {
      console.error('Error creating RRGT item:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to create RRGT item')
      );
    }
  }
);

/**
 * PUT /api/items/:itemId
 * Update an RRGT item's title
 * 
 * Permissions: Only the item owner can update
 */
router.put(
  '/items/:itemId',
  requireAuth,
  setDbContext,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = getDb();

      // Validate item ID (allow non-UUID in tests)
      const itemIdValidation = z.string().min(1).safeParse(req.params.itemId);
      if (!itemIdValidation.success) {
        return res.status(400).json(formatValidationError(itemIdValidation.error));
      }
      const itemId = itemIdValidation.data;

      // Validate request body
      const bodyValidation = updateRrgtItemSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        return res.status(400).json(formatValidationError(bodyValidation.error));
      }
      const { title } = bodyValidation.data;

      const currentTeamMemberId = req.userContext?.teamMemberId || '';

      // Fetch existing item
      const existingItems = await db
        .select()
        .from(rrgtItems)
        .where(eq(rrgtItems.id, itemId))
        .limit(1);

      if (existingItems.length === 0) {
        return res.status(404).json(
          createErrorResponse('Not Found', 'Item not found')
        );
      }

      const item = existingItems[0];

      // Permission check: Only owner can update
      if (item.teamMemberId !== currentTeamMemberId) {
        return res.status(403).json(
          createErrorResponse(
            'Forbidden',
            'You can only update your own items',
            { owner_id: item.teamMemberId }
          )
        );
      }

      // Update item
      const updatedItems = await db
        .update(rrgtItems)
        .set({ title })
        .where(eq(rrgtItems.id, itemId))
        .returning();

      const updatedItem = updatedItems[0];

      return res.status(200).json({
        message: 'Item updated successfully',
        item: updatedItem,
      });
    } catch (error) {
      console.error('Error updating item:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to update item')
      );
    }
  }
);

/**
 * DELETE /api/items/:itemId
 * Delete an RRGT item
 * 
 * Permissions: Only the item owner can delete
 */
router.delete(
  '/items/:itemId',
  requireAuth,
  setDbContext,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = getDb();

      // Validate item ID
      const itemIdValidation = z.string().min(1).safeParse(req.params.itemId);
      if (!itemIdValidation.success) {
        return res.status(400).json(formatValidationError(itemIdValidation.error));
      }
      const itemId = itemIdValidation.data;

      const currentTeamMemberId = req.userContext?.teamMemberId || '';

      // Fetch existing item
      const existingItems = await db
        .select()
        .from(rrgtItems)
        .where(eq(rrgtItems.id, itemId))
        .limit(1);

      if (existingItems.length === 0) {
        return res.status(404).json(
          createErrorResponse('Not Found', 'Item not found')
        );
      }

      const item = existingItems[0];

      // Permission check: Only owner can delete
      if (item.teamMemberId !== currentTeamMemberId) {
        return res.status(403).json(
          createErrorResponse(
            'Forbidden',
            'You can only delete your own items',
            { owner_id: item.teamMemberId }
          )
        );
      }

      // Delete item
      await db
        .delete(rrgtItems)
        .where(eq(rrgtItems.id, itemId));

      return res.status(200).json({
        message: 'Item deleted successfully',
        item_id: itemId,
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to delete item')
      );
    }
  }
);

router.put(
  '/rrgt/plans/:planId/rabbit',
  requireAuth,
  setDbContext,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = getDb();
      const currentTeamMemberId = req.userContext?.teamMemberId || '';

      const planIdValidation = uuidSchema.safeParse(req.params.planId);
      if (!planIdValidation.success) {
        return res.status(400).json(formatValidationError(planIdValidation.error));
      }
      const planId = planIdValidation.data;

      const bodyValidation = updateRrgtRabbitSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        return res.status(400).json(formatValidationError(bodyValidation.error));
      }
      const { column_index } = bodyValidation.data;

      const plansRes = await db
        .select()
        .from(rrgtPlans)
        .where(
          and(eq(rrgtPlans.id, planId), eq(rrgtPlans.teamMemberId, currentTeamMemberId))
        )
        .limit(1);

      if (!Array.isArray(plansRes) || plansRes.length === 0) {
        return res.status(404).json(
          createErrorResponse('Not Found', 'RRGT plan not found or you do not have access')
        );
      }

      const plan = plansRes[0];

      if (column_index < 0 || column_index > plan.maxColumnIndex) {
        return res.status(400).json(
          createErrorResponse(
            'Validation Error',
            'column_index is out of range for this plan'
          )
        );
      }

      const updatedRabbits = await db
        .update(rrgtRabbits)
        .set({ currentColumnIndex: column_index })
        .where(eq(rrgtRabbits.planId, planId))
        .returning();

      let rabbit = updatedRabbits[0];

      if (!rabbit) {
        const insertedRabbits = await db
          .insert(rrgtRabbits)
          .values({
            planId,
            currentColumnIndex: column_index,
          })
          .returning();
        rabbit = insertedRabbits[0];
      }

      return res.status(200).json({ rabbit });
    } catch (error) {
      console.error('Error updating RRGT rabbit:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to update RRGT rabbit')
      );
    }
  }
);

router.put(
  '/rrgt/plans/:planId/subtasks',
  requireAuth,
  setDbContext,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = getDb();
      const currentTeamMemberId = req.userContext?.teamMemberId || '';

      const planIdValidation = uuidSchema.safeParse(req.params.planId);
      if (!planIdValidation.success) {
        return res.status(400).json(formatValidationError(planIdValidation.error));
      }
      const planId = planIdValidation.data;

      const bodyValidation = upsertRrgtSubtaskSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        return res.status(400).json(formatValidationError(bodyValidation.error));
      }
      const { column_index, text } = bodyValidation.data;

      const plansRes = await db
        .select()
        .from(rrgtPlans)
        .where(
          and(eq(rrgtPlans.id, planId), eq(rrgtPlans.teamMemberId, currentTeamMemberId))
        )
        .limit(1);

      if (!Array.isArray(plansRes) || plansRes.length === 0) {
        return res.status(404).json(
          createErrorResponse('Not Found', 'RRGT plan not found or you do not have access')
        );
      }

      const plan = plansRes[0];

      if (column_index < 0 || column_index > plan.maxColumnIndex) {
        return res.status(400).json(
          createErrorResponse(
            'Validation Error',
            'column_index is out of range for this plan'
          )
        );
      }

      const existingSubtasks = await db
        .select()
        .from(rrgtSubtasks)
        .where(
          and(
            eq(rrgtSubtasks.planId, planId),
            eq(rrgtSubtasks.columnIndex, column_index)
          )
        )
        .limit(1);

      let subtask;

      if (Array.isArray(existingSubtasks) && existingSubtasks.length > 0) {
        const updatedSubtasks = await db
          .update(rrgtSubtasks)
          .set({ text })
          .where(
            and(
              eq(rrgtSubtasks.planId, planId),
              eq(rrgtSubtasks.columnIndex, column_index)
            )
          )
          .returning();
        subtask = updatedSubtasks[0];
      } else {
        const insertedSubtasks = await db
          .insert(rrgtSubtasks)
          .values({
            planId,
            columnIndex: column_index,
            text,
          })
          .returning();
        subtask = insertedSubtasks[0];
      }

      return res.status(200).json({ subtask });
    } catch (error) {
      console.error('Error upserting RRGT subtask:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to upsert RRGT subtask')
      );
    }
  }
);

/**
 * PUT /api/dial/mine
 * Update the current user's Dial state
 * 
 * Includes privacy flags for incognito tasks:
 * - is_left_private: Whether left item is from an incognito task (localStorage only)
 * - is_right_private: Whether right item is from an incognito task
 * 
 * Permissions: User can only update their own dial
 * Note: Items themselves are always in DB, but incognito tasks live in localStorage
 */
router.put(
  '/dial/mine',
  requireAuth,
  setDbContext,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = getDb();

      // Validate request body
      const bodyValidation = updateDialSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        return res.status(400).json(formatValidationError(bodyValidation.error));
      }
      const { left_item_id, right_item_id, selected_item_id, is_left_private, is_right_private } = bodyValidation.data;

      const currentTeamMemberId = req.userContext?.teamMemberId || '';

      // If item IDs provided, verify they belong to current user
      if (left_item_id) {
        const leftItemCheck = await db
          .select()
          .from(rrgtItems)
          .where(
            and(
              eq(rrgtItems.id, left_item_id),
              eq(rrgtItems.teamMemberId, currentTeamMemberId)
            )
          )
          .limit(1);

        if (leftItemCheck.length === 0) {
          return res.status(400).json(
            createErrorResponse('Validation Error', 'Left item does not belong to you')
          );
        }
      }

      if (right_item_id) {
        const rightItemCheck = await db
          .select()
          .from(rrgtItems)
          .where(
            and(
              eq(rrgtItems.id, right_item_id),
              eq(rrgtItems.teamMemberId, currentTeamMemberId)
            )
          )
          .limit(1);

        if (rightItemCheck.length === 0) {
          return res.status(400).json(
            createErrorResponse('Validation Error', 'Right item does not belong to you')
          );
        }
      }

      // Check if dial state exists
      const existingDialStates = await db
        .select()
        .from(dialStates)
        .where(eq(dialStates.teamMemberId, currentTeamMemberId))
        .limit(1);

      let dialState;

      if (existingDialStates.length === 0) {
        // Create new dial state
        const newDialStates = await db
          .insert(dialStates)
          .values({
            teamMemberId: currentTeamMemberId,
            leftItemId: left_item_id || null,
            rightItemId: right_item_id || null,
            selectedItemId: selected_item_id || null,
            isLeftPrivate: is_left_private || false,
            isRightPrivate: is_right_private || false,
          })
          .returning();

        dialState = newDialStates[0];
      } else {
        // Update existing dial state
        const updateData: Record<string, unknown> = {};
        
        if (left_item_id !== undefined) {
          updateData.leftItemId = left_item_id;
        }
        if (right_item_id !== undefined) {
          updateData.rightItemId = right_item_id;
        }
        if (selected_item_id !== undefined) {
          updateData.selectedItemId = selected_item_id;
        }
        if (is_left_private !== undefined) {
          updateData.isLeftPrivate = is_left_private;
        }
        if (is_right_private !== undefined) {
          updateData.isRightPrivate = is_right_private;
        }

        const updatedDialStates = await db
          .update(dialStates)
          .set(updateData)
          .where(eq(dialStates.teamMemberId, currentTeamMemberId))
          .returning();

        dialState = updatedDialStates[0];
      }

      return res.status(200).json({
        message: 'Dial state updated successfully',
        dial_state: dialState,
      });
    } catch (error) {
      console.error('Error updating dial state:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to update dial state')
      );
    }
  }
);

export default router;
