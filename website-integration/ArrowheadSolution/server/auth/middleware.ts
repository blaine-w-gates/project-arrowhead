/**
 * Supabase Auth Middleware for Team MVP
 * 
 * Validates Supabase JWT and attaches team context to requests
 * Supports Virtual Persona mode for Manager God-view
 * 
 * Based on: SLAD v6.0 Final, Sections 4.0 & 7.0
 */

import { Request, Response, NextFunction } from 'express';
import { verifySupabaseJwt } from './supabase';
import { getDb } from '../db';
import { teamMembers } from '../../shared/schema/teams';
import { eq, sql } from 'drizzle-orm';

/**
 * User context attached to Express request
 * Contains authenticated user and their team membership info
 */
export interface UserContext {
  /** Supabase auth.users ID */
  userId: string;
  /** User's email */
  email?: string;
  /** Primary team member ID (for users with multiple teams, this is first found) */
  teamMemberId?: string;
  /** Primary team ID */
  teamId?: string;
  /** Role in the team */
  role?: string;
  /** Virtual Persona mode: Manager is acting as this team member ID */
  virtualPersonaId?: string;
  /** Effective team member ID (virtualPersonaId if set, otherwise teamMemberId) */
  effectiveTeamMemberId?: string;
}

/**
 * Extended Express Request with user context
 */
export interface AuthenticatedRequest extends Request {
  userContext?: UserContext;
}

/**
 * Supabase Auth Middleware
 * 
 * Validates JWT from Authorization header and attaches user context
 * 
 * Usage:
 * ```typescript
 * app.use('/api/teams', requireAuth, teamsRouter);
 * ```
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract JWT from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Missing or invalid Authorization header' 
      });
      return;
    }

    const jwt = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT with Supabase
    const verification = await verifySupabaseJwt(jwt);
    if (!verification.valid || !verification.userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: verification.error || 'Invalid JWT token',
      });
      return;
    }

    // Create base user context
    const userContext: UserContext = {
      userId: verification.userId,
      email: verification.email,
    };

    // Look up team membership in database
    const db = getDb();
    const membershipRecords = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, verification.userId))
      .limit(1);

    if (membershipRecords.length > 0) {
      const membership = membershipRecords[0];
      userContext.teamMemberId = membership.id;
      userContext.teamId = membership.teamId;
      userContext.role = membership.role;
      userContext.effectiveTeamMemberId = membership.id;
    }

    // Check for Virtual Persona header (Manager God-view)
    const virtualPersonaHeader = req.headers['x-virtual-persona-id'] as string | undefined;
    if (virtualPersonaHeader) {
      // Verify user is a Manager (Account Owner or Account Manager)
      if (userContext.role === 'Account Owner' || userContext.role === 'Account Manager') {
        // Verify the virtual persona exists and belongs to same team
        const virtualPersonaRecords = await db
          .select()
          .from(teamMembers)
          .where(eq(teamMembers.id, virtualPersonaHeader))
          .limit(1);

        if (virtualPersonaRecords.length > 0) {
          const virtualPersona = virtualPersonaRecords[0];
          
          // Ensure virtual persona is in the same team
          if (virtualPersona.teamId === userContext.teamId) {
            userContext.virtualPersonaId = virtualPersonaHeader;
            userContext.effectiveTeamMemberId = virtualPersonaHeader;
          } else {
            res.status(403).json({
              error: 'Forbidden',
              message: 'Virtual persona must be in the same team',
            });
            return;
          }
        } else {
          res.status(404).json({
            error: 'Not Found',
            message: 'Virtual persona not found',
          });
          return;
        }
      } else {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Only Account Owner or Manager can use Virtual Persona mode',
        });
        return;
      }
    }

    // Attach context to request
    req.userContext = userContext;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
}

/**
 * Optional Auth Middleware
 * 
 * Attaches user context if JWT is present, but doesn't require it
 * Useful for endpoints that have different behavior for authenticated vs anonymous users
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No auth provided, continue without context
      next();
      return;
    }

    const jwt = authHeader.substring(7);

    // Verify JWT with Supabase
    const verification = await verifySupabaseJwt(jwt);
    if (!verification.valid || !verification.userId) {
      // Invalid JWT, but that's OK for optional auth - just continue without context
      next();
      return;
    }

    // Create base user context
    const userContext: UserContext = {
      userId: verification.userId,
      email: verification.email,
    };

    // Look up team membership in database
    const db = getDb();
    const membershipRecords = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, verification.userId))
      .limit(1);

    if (membershipRecords.length > 0) {
      const membership = membershipRecords[0];
      userContext.teamMemberId = membership.id;
      userContext.teamId = membership.teamId;
      userContext.role = membership.role;
      userContext.effectiveTeamMemberId = membership.id;
    }

    // Attach context to request
    req.userContext = userContext;

    next();
  } catch {
    // Silently continue without authentication on any error
    next();
  }
}

/**
 * Database Session Variable Setter
 * 
 * Sets PostgreSQL session variable for RLS policies
 * Must be called before database queries that rely on RLS
 * 
 * Usage in route handler:
 * ```typescript
 * await setDatabaseSessionContext(req);
 * const results = await db.select()...
 * ```
 */
export async function setDatabaseSessionContext(req: AuthenticatedRequest): Promise<void> {
  const db = getDb();
  const effectiveId = req.userContext?.effectiveTeamMemberId;

  if (effectiveId) {
    // Set session variable for RLS policies to use
    await db.execute(
      sql`SET LOCAL app.current_team_member_id = ${effectiveId}`
    );
  }

  // Also set the auth.uid for policies that check it
  if (req.userContext?.userId) {
    await db.execute(
      sql`SET LOCAL request.jwt.claim.sub = ${req.userContext.userId}`
    );
  }
}

/**
 * Middleware that sets database session context automatically
 * 
 * Use after requireAuth for routes that need RLS policies
 * 
 * Usage:
 * ```typescript
 * app.use('/api/teams', requireAuth, setDbContext, teamsRouter);
 * ```
 */
export async function setDbContext(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await setDatabaseSessionContext(req);
    next();
  } catch (error) {
    console.error('Database context setting error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to set database context',
    });
  }
}
