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
