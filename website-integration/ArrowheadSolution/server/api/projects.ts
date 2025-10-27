/**
 * Projects API Router
 * 
 * CRUD operations for projects with role-based permissions and RLS
 * Based on: PRD v5.2 Final Section 3.1, SLAD v6.0 Section 6.0
 */

import express, { Request, Response, Router } from 'express';
import { requireAuth, setDbContext, AuthenticatedRequest } from '../auth/middleware';
import { getDb } from '../db';
import { projects, objectives, tasks } from '../../shared/schema/index';
import { eq, and, count, sql } from 'drizzle-orm';
import {
  createProjectSchema,
  updateProjectSchema,
  listProjectsQuerySchema,
  uuidSchema,
  formatValidationError,
  createErrorResponse,
} from './validation';
import {
  canCreateProject,
  canEditProject,
  canDeleteProject,
  createPermissionError,
} from './permissions';

const router = Router();

/**
 * POST /api/teams/:teamId/projects
 * Create a new project
 * 
 * Permissions: Account Owner, Account Manager, Project Owner
 * Per PRD v5.2 Section 6.2 Permission Matrix
 */
router.post(
  '/teams/:teamId/projects',
  requireAuth,
  setDbContext,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = getDb();

      // Validate team ID
      const teamIdValidation = uuidSchema.safeParse(req.params.teamId);
      if (!teamIdValidation.success) {
        return res.status(400).json(formatValidationError(teamIdValidation.error));
      }
      const teamId = teamIdValidation.data;

      // Check user's team matches
      if (req.userContext?.teamId !== teamId) {
        return res.status(403).json(
          createErrorResponse('Forbidden', 'You can only create projects in your own team')
        );
      }

      // Check permissions
      if (!canCreateProject(req.userContext)) {
        return res.status(403).json(createPermissionError('create projects', req.userContext));
      }

      // Validate request body
      const bodyValidation = createProjectSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        return res.status(400).json(formatValidationError(bodyValidation.error));
      }
      const { name, vision, estimated_completion_date } = bodyValidation.data;

      // Check name uniqueness within team
      const existingProjects = await db
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.teamId, teamId),
            eq(projects.name, name)
          )
        )
        .limit(1);

      if (existingProjects.length > 0) {
        return res.status(409).json(
          createErrorResponse('Conflict', 'A project with this name already exists in your team')
        );
      }

      // Create project
      const newProjects = await db
        .insert(projects)
        .values({
          teamId,
          name,
          visionData: vision || null,
          estimatedCompletionDate: estimated_completion_date ? new Date(estimated_completion_date) : null,
          completionStatus: 'not_started',
          isArchived: false,
        })
        .returning();

      const newProject = newProjects[0];

      return res.status(201).json({
        message: 'Project created successfully',
        project: newProject,
      });
    } catch (error) {
      console.error('Error creating project:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to create project')
      );
    }
  }
);

/**
 * GET /api/teams/:teamId/projects
 * List projects for a team
 * 
 * Query params:
 * - include_archived: 'true' | 'false' (default: 'false')
 * 
 * Permissions: All team members (filtered by RLS + project assignments)
 */
router.get(
  '/teams/:teamId/projects',
  requireAuth,
  setDbContext,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = getDb();

      // Validate team ID
      const teamIdValidation = uuidSchema.safeParse(req.params.teamId);
      if (!teamIdValidation.success) {
        return res.status(400).json(formatValidationError(teamIdValidation.error));
      }
      const teamId = teamIdValidation.data;

      // Check user's team matches
      if (req.userContext?.teamId !== teamId) {
        return res.status(403).json(
          createErrorResponse('Forbidden', 'You can only view projects in your own team')
        );
      }

      // Validate query parameters
      const queryValidation = listProjectsQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        return res.status(400).json(formatValidationError(queryValidation.error));
      }
      const { include_archived } = queryValidation.data;

      // Build query conditions
      const conditions = [eq(projects.teamId, teamId)];
      
      if (include_archived === 'false') {
        conditions.push(eq(projects.isArchived, false));
      }

      // Fetch projects (RLS will filter by assignments automatically)
      const projectsList = await db
        .select({
          id: projects.id,
          teamId: projects.teamId,
          name: projects.name,
          visionData: projects.visionData,
          completionStatus: projects.completionStatus,
          estimatedCompletionDate: projects.estimatedCompletionDate,
          isArchived: projects.isArchived,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
        })
        .from(projects)
        .where(and(...conditions))
        .orderBy(projects.createdAt);

      // Calculate stats for each project
      const projectsWithStats = await Promise.all(
        projectsList.map(async (project) => {
          // Count objectives
          const objectiveCounts = await db
            .select({ count: count() })
            .from(objectives)
            .where(eq(objectives.projectId, project.id));
          
          const objectivesCount = objectiveCounts[0]?.count || 0;

          // Count tasks (join through objectives)
          const taskCounts = await db
            .select({ count: count() })
            .from(tasks)
            .innerJoin(objectives, eq(tasks.objectiveId, objectives.id))
            .where(eq(objectives.projectId, project.id));
          
          const tasksCount = taskCounts[0]?.count || 0;

          return {
            ...project,
            stats: {
              objectives_count: objectivesCount,
              tasks_count: tasksCount,
            },
          };
        })
      );

      return res.status(200).json({
        projects: projectsWithStats,
        total: projectsWithStats.length,
      });
    } catch (error) {
      console.error('Error listing projects:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to list projects')
      );
    }
  }
);

/**
 * PUT /api/projects/:projectId
 * Update a project
 * 
 * Supports partial updates:
 * - name: string (max 60 chars, unique per team)
 * - vision: JSONB (5 questions) | null
 * - completion_status: boolean
 * - estimated_completion_date: datetime | null
 * - is_archived: boolean
 * 
 * Permissions: Account Owner, Account Manager, Project Owner
 */
router.put(
  '/projects/:projectId',
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

      // Check permissions
      if (!canEditProject(req.userContext)) {
        return res.status(403).json(createPermissionError('edit projects', req.userContext));
      }

      // Validate request body
      const bodyValidation = updateProjectSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        return res.status(400).json(formatValidationError(bodyValidation.error));
      }
      const updateData = bodyValidation.data;

      // Fetch existing project (RLS will filter)
      const existingProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (existingProjects.length === 0) {
        return res.status(404).json(
          createErrorResponse('Not Found', 'Project not found or you don\'t have access')
        );
      }

      const existingProject = existingProjects[0];

      // Check name uniqueness if name is being changed
      if (updateData.name && updateData.name !== existingProject.name) {
        const duplicateProjects = await db
          .select({ id: projects.id })
          .from(projects)
          .where(
            and(
              eq(projects.teamId, existingProject.teamId),
              eq(projects.name, updateData.name)
            )
          )
          .limit(1);

        if (duplicateProjects.length > 0) {
          return res.status(409).json(
            createErrorResponse('Conflict', 'A project with this name already exists in your team')
          );
        }
      }

      // Build update object
      const updateObject: Partial<typeof projects.$inferInsert> = {};
      
      if (updateData.name !== undefined) {
        updateObject.name = updateData.name;
      }
      if (updateData.vision !== undefined) {
        updateObject.visionData = updateData.vision;
      }
      if (updateData.completion_status !== undefined) {
        // Convert boolean to CompletionStatus enum
        updateObject.completionStatus = updateData.completion_status ? 'completed' : 'not_started';
      }
      if (updateData.estimated_completion_date !== undefined) {
        updateObject.estimatedCompletionDate = updateData.estimated_completion_date 
          ? new Date(updateData.estimated_completion_date) 
          : null;
      }
      if (updateData.is_archived !== undefined) {
        updateObject.isArchived = updateData.is_archived;
      }

      // Update project
      const updatedProjects = await db
        .update(projects)
        .set(updateObject)
        .where(eq(projects.id, projectId))
        .returning();

      const updatedProject = updatedProjects[0];

      return res.status(200).json({
        message: 'Project updated successfully',
        project: updatedProject,
      });
    } catch (error) {
      console.error('Error updating project:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to update project')
      );
    }
  }
);

/**
 * DELETE /api/projects/:projectId
 * Delete a project
 * 
 * Business Rule (PRD v5.2 Section 3.1):
 * - Only empty projects can be deleted
 * - Block if project has objectives or tasks
 * - Show warning to archive first
 * 
 * Permissions: Account Owner, Account Manager, Project Owner
 */
router.delete(
  '/projects/:projectId',
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

      // Check permissions
      if (!canDeleteProject(req.userContext)) {
        return res.status(403).json(createPermissionError('delete projects', req.userContext));
      }

      // Fetch existing project (RLS will filter)
      const existingProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (existingProjects.length === 0) {
        return res.status(404).json(
          createErrorResponse('Not Found', 'Project not found or you don\'t have access')
        );
      }

      // Check if project has objectives
      const objectiveCounts = await db
        .select({ count: count() })
        .from(objectives)
        .where(eq(objectives.projectId, projectId));
      
      const objectivesCount = objectiveCounts[0]?.count || 0;

      if (objectivesCount > 0) {
        // Count tasks too for better error message
        const taskCounts = await db
          .select({ count: count() })
          .from(tasks)
          .innerJoin(objectives, eq(tasks.objectiveId, objectives.id))
          .where(eq(objectives.projectId, projectId));
        
        const tasksCount = taskCounts[0]?.count || 0;

        return res.status(400).json(
          createErrorResponse(
            'Bad Request',
            `This project has ${objectivesCount} objective(s) and ${tasksCount} task(s). Archive it first or delete the objectives/tasks.`,
            {
              objectives_count: objectivesCount,
              tasks_count: tasksCount,
            }
          )
        );
      }

      // Project is empty, safe to delete
      await db
        .delete(projects)
        .where(eq(projects.id, projectId));

      return res.status(200).json({
        message: 'Project deleted successfully',
        project_id: projectId,
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      return res.status(500).json(
        createErrorResponse('Internal Server Error', 'Failed to delete project')
      );
    }
  }
);

export default router;
