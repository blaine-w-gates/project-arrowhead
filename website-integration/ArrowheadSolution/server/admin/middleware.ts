import type { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { adminAuditLog } from '@shared/schema';

/**
 * Extended Request type with admin user
 */
export interface AdminRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    isActive: boolean;
  };
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  adminId: number,
  action: string,
  resource: string,
  resourceId?: string,
  changes?: any,
  req?: Request
) {
  try {
    await db.insert(adminAuditLog).values({
      adminId,
      action,
      resource,
      resourceId: resourceId?.toString(),
      changes: changes ? JSON.stringify(changes) : null,
      ipAddress: req?.ip || req?.socket?.remoteAddress || null,
      userAgent: req?.get('user-agent') || null,
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break the main operation
  }
}

/**
 * Middleware to automatically log admin actions
 */
export function auditMiddleware(resource: string) {
  return async (req: AdminRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next();
    }

    // Determine action from HTTP method
    const actionMap: Record<string, string> = {
      GET: 'view',
      POST: 'create',
      PUT: 'update',
      PATCH: 'update',
      DELETE: 'delete',
    };

    const action = actionMap[req.method] || 'unknown';

    // Capture original send function
    const originalSend = res.send;

    // Override send to capture response
    res.send = function (this: Response, body: any) {
      // Get resource ID from params or body
      const resourceId = req.params.id || req.body?.id;

      // Log the action
      createAuditLog(
        req.user!.id,
        action,
        resource,
        resourceId,
        req.body,
        req
      ).catch((err) => console.error('Audit log error:', err));

      // Call original send
      return originalSend.call(this, body);
    } as any;

    next();
  };
}

/**
 * Rate limiting middleware for login attempts
 */
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimitLogin(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  let attempts = loginAttempts.get(ip);

  // Reset if past the window
  if (attempts && now > attempts.resetAt) {
    loginAttempts.delete(ip);
    attempts = undefined;
  }

  if (!attempts) {
    attempts = { count: 1, resetAt: now + 15 * 60 * 1000 }; // 15 minute window
    loginAttempts.set(ip, attempts);
    return next();
  }

  attempts.count++;

  if (attempts.count > 5) {
    return res.status(429).json({
      error: 'Too many login attempts',
      message: 'Please try again in 15 minutes',
    });
  }

  next();
}

/**
 * Clean up old rate limit entries (run periodically)
 */
export function cleanupRateLimits() {
  const now = Date.now();
  const ipsToDelete: string[] = [];
  
  loginAttempts.forEach((attempts, ip) => {
    if (now > attempts.resetAt) {
      ipsToDelete.push(ip);
    }
  });
  
  ipsToDelete.forEach(ip => loginAttempts.delete(ip));
}

// Clean up every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);
