/**
 * Centralized Error Handling Utilities
 * Provides consistent error handling patterns across the application
 */

import { Response } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger';
import { captureError } from './sentry';

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  message: string;
  code?: string;
  details?: unknown;
  statusCode: number;
}

/**
 * Application error class with additional context
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Send error response with consistent format
 */
export function sendErrorResponse(
  res: Response,
  error: unknown,
  context?: Record<string, unknown>
): void {
  const errorResponse = formatError(error);
  
  // Log error with context
  logger.error('Request error', {
    ...errorResponse,
    ...context
  });

  // Capture in Sentry for 500+ errors
  if (errorResponse.statusCode >= 500 && error instanceof Error) {
    captureError(error, context);
  }

  const responseBody: any = {
    message: errorResponse.message
  };
  
  if (errorResponse.code) {
    responseBody.code = errorResponse.code;
  }
  
  if (errorResponse.details && process.env.NODE_ENV !== 'production') {
    responseBody.details = errorResponse.details;
  }
  
  res.status(errorResponse.statusCode).json(responseBody);
}

/**
 * Format any error into standard ErrorResponse
 */
export function formatError(error: unknown): ErrorResponse {
  // AppError - our custom errors
  if (error instanceof AppError) {
    return {
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
      details: error.details
    };
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    return {
      message: 'Validation failed',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: error.errors
    };
  }

  // Standard Error
  if (error instanceof Error) {
    // Check for common error patterns
    if (error.message.includes('not found') || error.message.includes('Not found')) {
      return {
        message: error.message,
        statusCode: 404,
        code: 'NOT_FOUND'
      };
    }

    if (error.message.includes('unauthorized') || error.message.includes('Unauthorized')) {
      return {
        message: error.message,
        statusCode: 401,
        code: 'UNAUTHORIZED'
      };
    }

    if (error.message.includes('forbidden') || error.message.includes('Forbidden')) {
      return {
        message: error.message,
        statusCode: 403,
        code: 'FORBIDDEN'
      };
    }

    // Default to 500 for unhandled errors
    return {
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message,
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    };
  }

  // Unknown error type
  return {
    message: 'An unexpected error occurred',
    statusCode: 500,
    code: 'UNKNOWN_ERROR'
  };
}

/**
 * Async route handler wrapper to catch errors
 * Usage: app.get('/route', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(
  fn: (req: any, res: Response, next: any) => Promise<any>
) {
  return (req: any, res: Response, next: any) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      sendErrorResponse(res, error, {
        method: req.method,
        url: req.url,
        params: req.params,
        query: req.query
      });
    });
  };
}

/**
 * Common error factories
 */
export const Errors = {
  notFound: (resource: string) => 
    new AppError(`${resource} not found`, 404, 'NOT_FOUND'),
  
  badRequest: (message: string, details?: unknown) => 
    new AppError(message, 400, 'BAD_REQUEST', details),
  
  unauthorized: (message = 'Unauthorized') => 
    new AppError(message, 401, 'UNAUTHORIZED'),
  
  forbidden: (message = 'Forbidden') => 
    new AppError(message, 403, 'FORBIDDEN'),
  
  conflict: (message: string) => 
    new AppError(message, 409, 'CONFLICT'),
  
  internal: (message = 'Internal server error') => 
    new AppError(message, 500, 'INTERNAL_ERROR'),
  
  validation: (details: unknown) => 
    new AppError('Validation failed', 400, 'VALIDATION_ERROR', details)
};

/**
 * Database error handler
 */
export function handleDbError(error: unknown, operation: string): never {
  logger.error(`Database error during ${operation}`, { error });
  
  if (error instanceof Error) {
    // Check for common DB errors
    if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
      throw new AppError('Resource already exists', 409, 'DUPLICATE_RESOURCE');
    }
    
    if (error.message.includes('foreign key constraint')) {
      throw new AppError('Referenced resource not found', 400, 'INVALID_REFERENCE');
    }
  }
  
  throw new AppError(`Database operation failed: ${operation}`, 500, 'DATABASE_ERROR');
}

/**
 * Validation helper
 */
export function validateRequired(data: Record<string, unknown>, fields: string[]): void {
  const missing = fields.filter(field => !data[field]);
  
  if (missing.length > 0) {
    throw Errors.validation({
      missing,
      message: `Missing required fields: ${missing.join(', ')}`
    });
  }
}
