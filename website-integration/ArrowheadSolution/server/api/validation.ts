/**
 * API Validation Schemas & Utilities
 * 
 * Zod schemas for request validation across all API endpoints
 * Based on: PRD v5.2 Final, SLAD v6.0 Final
 */

import { z } from 'zod';

/**
 * Project Vision JSONB Schema (5 questions)
 * Per PRD v5.2 Section 3.1 - Project Vision Module
 */
export const projectVisionSchema = z.object({
  q1_purpose: z.string().min(1, 'Purpose is required').max(500, 'Purpose too long'),
  q2_achieve: z.string().min(1, 'Achievement goal is required').max(500, 'Achievement goal too long'),
  q3_market: z.string().min(1, 'Market description is required').max(500, 'Market description too long'),
  q4_customers: z.string().min(1, 'Customer description is required').max(500, 'Customer description too long'),
  q5_win: z.string().min(1, 'Win condition is required').max(500, 'Win condition too long'),
}).strict();

/**
 * Create Project Request Schema
 * Per PRD v5.2: name max 60 chars, unique per team, optional vision
 */
export const createProjectSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(60, 'Project name must be 60 characters or less')
    .trim(),
  vision: projectVisionSchema.optional(),
  estimated_completion_date: z.string().datetime().optional(),
}).strict();

/**
 * Update Project Request Schema
 * Partial updates allowed for: name, vision, completion_status, estimated_completion_date
 */
export const updateProjectSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(60, 'Project name must be 60 characters or less')
    .trim()
    .optional(),
  vision: projectVisionSchema.nullable().optional(),
  completion_status: z.boolean().optional(),
  estimated_completion_date: z.string().datetime().nullable().optional(),
  is_archived: z.boolean().optional(),
}).strict();

/**
 * Query Parameters for GET /api/teams/:teamId/projects
 */
export const listProjectsQuerySchema = z.object({
  include_archived: z.enum(['true', 'false']).optional().default('false'),
});

/**
 * UUID Parameter Validation
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Standard API Error Response
 */
export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}

/**
 * Validation Error Response
 */
export interface ValidationError extends ApiError {
  error: 'Validation Error';
  details: z.ZodIssue[];
}

/**
 * Helper: Format Zod validation errors
 */
export function formatValidationError(error: z.ZodError): ValidationError {
  return {
    error: 'Validation Error',
    message: 'Request validation failed',
    details: error.errors,
  };
}

/**
 * Helper: Create standard error response
 */
export function createErrorResponse(
  error: string,
  message: string,
  details?: unknown
): ApiError {
  return { error, message, details };
}

// ========================================
// OBJECTIVES VALIDATION SCHEMAS
// ========================================

/**
 * Brainstorm Module JSONB Schema (Steps 1-5)
 * Per PRD v5.2 Section 3.2 - Brainstorm Module (5I Framework)
 */
export const brainstormDataSchema = z.object({
  step1_imitate: z.string().optional(),
  step2_ideate: z.string().optional(),
  step3_ignore: z.string().optional(),
  step4_integrate: z.string().optional(),
  step5_interfere: z.string().optional(),
}).strict();

/**
 * Choose Module JSONB Schema (Steps 6-10)
 * Per PRD v5.2 Section 3.2 - Choose Module
 */
export const chooseDataSchema = z.object({
  step1_scenarios: z.string().optional(),
  step2_compare: z.string().optional(),
  step3_important: z.string().optional(),
  step4_evaluate: z.string().optional(),
  step5_support: z.string().optional(),
}).strict();

/**
 * Objectives Module JSONB Schema (Steps 11-17)
 * Per PRD v5.2 Section 3.2 - Objectives Module
 */
export const objectivesDataSchema = z.object({
  step1_objective: z.string().optional(),
  step2_delegate: z.string().optional(),
  step3_resources: z.string().optional(),
  step4_obstacles: z.string().optional(),
  step5_milestones: z.string().optional(),
  step6_accountability: z.string().optional(),
  step7_review: z.string().optional(),
}).strict();

/**
 * Create Objective Request Schema
 * Supports Yes/No branching logic per PRD v5.2
 */
export const createObjectiveSchema = z.object({
  name: z.string()
    .min(1, 'Objective name is required')
    .max(100, 'Objective name must be 100 characters or less')
    .trim(),
  start_with_brainstorm: z.boolean().optional().default(true), // Yes/No branching
  target_completion_date: z.string().datetime().optional(),
}).strict();

/**
 * Update Objective Request Schema
 * Partial updates for journey state and metadata
 */
export const updateObjectiveSchema = z.object({
  name: z.string()
    .min(1, 'Objective name is required')
    .max(100, 'Objective name must be 100 characters or less')
    .trim()
    .optional(),
  current_step: z.number().int().min(1).max(17).optional(),
  journey_status: z.enum(['draft', 'complete']).optional(),
  brainstorm_data: brainstormDataSchema.nullable().optional(),
  choose_data: chooseDataSchema.nullable().optional(),
  objectives_data: objectivesDataSchema.nullable().optional(),
  target_completion_date: z.string().datetime().nullable().optional(),
  is_archived: z.boolean().optional(),
}).strict();

/**
 * Query Parameters for GET /api/projects/:projectId/objectives
 */
export const listObjectivesQuerySchema = z.object({
  include_archived: z.enum(['true', 'false']).optional().default('false'),
  journey_status: z.enum(['draft', 'complete', 'all']).optional().default('all'),
});

// ========================================
// TASKS VALIDATION SCHEMAS
// ========================================

/**
 * Create Task Request Schema
 * Per PRD v5.2 Section 3.3 - Scoreboard/Tasks
 */
export const createTaskSchema = z.object({
  title: z.string()
    .min(1, 'Task title is required')
    .max(200, 'Task title must be 200 characters or less')
    .trim(),
  description: z.string().max(2000, 'Description too long').optional(),
  priority: z.number().int().min(1).max(3).optional().default(2), // 1=high, 2=medium, 3=low
  due_date: z.string().datetime().optional(),
  assigned_team_member_ids: z.array(z.string().uuid()).optional().default([]),
}).strict();

/**
 * Update Task Request Schema
 * Partial updates for task details
 */
export const updateTaskSchema = z.object({
  title: z.string()
    .min(1, 'Task title is required')
    .max(200, 'Task title must be 200 characters or less')
    .trim()
    .optional(),
  description: z.string().max(2000, 'Description too long').nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'complete']).optional(),
  priority: z.number().int().min(1).max(3).optional(),
  due_date: z.string().datetime().nullable().optional(),
}).strict();

/**
 * Task Assignments Request Schema
 * For PATCH /api/tasks/:taskId/assignments
 */
export const taskAssignmentsSchema = z.object({
  team_member_ids: z.array(z.string().uuid())
    .min(0, 'Team member IDs array required')
    .max(20, 'Too many assignees'),
}).strict();

// ========================================
// TOUCHBASES VALIDATION SCHEMAS
// ========================================

/**
 * Touchbase Responses JSONB Schema (7 questions)
 * Per PRD v5.2 Section 3.3 - Touchbase Module
 */
export const touchbaseResponsesSchema = z.object({
  q1_working_on: z.string().optional(),
  q2_help_needed: z.string().optional(),
  q3_blockers: z.string().optional(),
  q4_wins: z.string().optional(),
  q5_priorities: z.string().optional(),
  q6_resource_needs: z.string().optional(),
  q7_timeline_change: z.string().optional(),
}).strict();

/**
 * Create Touchbase Request Schema
 */
export const createTouchbaseSchema = z.object({
  team_member_id: z.string().uuid('Invalid team member ID'),
  touchbase_date: z.string().datetime('Invalid date format'),
  responses: touchbaseResponsesSchema,
}).strict();

/**
 * Update Touchbase Request Schema
 * Only responses can be updated (within 24hr window)
 */
export const updateTouchbaseSchema = z.object({
  responses: touchbaseResponsesSchema,
}).strict();

/**
 * Query Parameters for GET /api/objectives/:objectiveId/touchbases
 */
export const listTouchbasesQuerySchema = z.object({
  member_id: z.string().uuid().optional(),
});
