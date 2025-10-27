/**
 * RRGT & Dial API Router
 * 
 * Endpoints for "My Work" dashboard aggregation and dial management
 * Based on: PRD v5.2 Section 3.4, SLAD v6.0 Section 6.0
 */

import { Response, Router } from 'express';
import { requireAuth, setDbContext, AuthenticatedRequest } from '../auth/middleware';
import { getDb } from '../db';
import { tasks, taskAssignments, rrgtItems, dialStates } from '../../shared/schema/index';
import { eq, and, inArray } from 'drizzle-orm';
import {
  createRrgtItemSchema,
  updateRrgtItemSchema,
  updateDialSchema,
  uuidSchema,
  formatValidationError,
  createErrorResponse,
} from './validation';

const router = Router();

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

      // Fetch all tasks assigned to user
      const assignments = await db
        .select()
        .from(taskAssignments)
        .where(eq(taskAssignments.teamMemberId, currentTeamMemberId));

      const taskIds = assignments.map(a => a.taskId);

      let userTasks: typeof tasks.$inferSelect[] = [];
      if (taskIds.length > 0) {
        userTasks = await db
          .select()
          .from(tasks)
          .where(inArray(tasks.id, taskIds));
      }

      // Fetch all RRGT items belonging to user
      const userItems = await db
        .select()
        .from(rrgtItems)
        .where(eq(rrgtItems.teamMemberId, currentTeamMemberId));

      // Fetch user's dial state
      const dialStateResult = await db
        .select()
        .from(dialStates)
        .where(eq(dialStates.teamMemberId, currentTeamMemberId))
        .limit(1);

      const dialState = dialStateResult.length > 0 ? dialStateResult[0] : null;

      return res.status(200).json({
        tasks: userTasks,
        items: userItems,
        dial_state: dialState,
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
      const userRole = req.userContext?.role;
      if (userRole !== 'Account Owner' && userRole !== 'Account Manager') {
        return res.status(403).json(
          createErrorResponse(
            'Forbidden',
            'Only Account Owner and Account Manager can access team member RRGT data',
            { current_role: userRole }
          )
        );
      }

      // Validate team member ID
      const teamMemberIdValidation = uuidSchema.safeParse(req.params.teamMemberId);
      if (!teamMemberIdValidation.success) {
        return res.status(400).json(formatValidationError(teamMemberIdValidation.error));
      }
      const targetTeamMemberId = teamMemberIdValidation.data;

      // Fetch all tasks assigned to target member
      const assignments = await db
        .select()
        .from(taskAssignments)
        .where(eq(taskAssignments.teamMemberId, targetTeamMemberId));

      const taskIds = assignments.map(a => a.taskId);

      let memberTasks: typeof tasks.$inferSelect[] = [];
      if (taskIds.length > 0) {
        memberTasks = await db
          .select()
          .from(tasks)
          .where(inArray(tasks.id, taskIds));
      }

      // Fetch all RRGT items belonging to target member
      const memberItems = await db
        .select()
        .from(rrgtItems)
        .where(eq(rrgtItems.teamMemberId, targetTeamMemberId));

      // Fetch target member's dial state
      const dialStateResult = await db
        .select()
        .from(dialStates)
        .where(eq(dialStates.teamMemberId, targetTeamMemberId))
        .limit(1);

      const dialState = dialStateResult.length > 0 ? dialStateResult[0] : null;

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

      // Validate item ID
      const itemIdValidation = uuidSchema.safeParse(req.params.itemId);
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
      const itemIdValidation = uuidSchema.safeParse(req.params.itemId);
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
