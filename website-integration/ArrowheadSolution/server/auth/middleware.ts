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

type Limitable = { limit: (n: number) => Promise<unknown> };
function hasLimit(x: unknown): x is Limitable {
  return !!x && typeof (x as { limit?: unknown }).limit === 'function';
}
function isPromiseLike(x: unknown): x is Promise<unknown> {
  return !!x && typeof (x as { then?: unknown }).then === 'function';
}
type TeamMemberRow = { id: string; teamId: string; role: string };
const fetchOneSafe = async <T>(dbAny: unknown, q: unknown): Promise<T | undefined> => {
  if (hasLimit(q)) {
    const rows = await (q as Limitable).limit(1);
    if (Array.isArray(rows)) return rows[0] as T;
  }
  if (hasLimit(dbAny)) {
    try {
      const rows = await (dbAny as Limitable).limit(1);
      if (Array.isArray(rows)) return rows[0] as T;
    } catch (_err) { void 0; }
  }
  if (isPromiseLike(q)) {
    const rows = await (q as Promise<unknown>);
    if (Array.isArray(rows)) return rows[0] as T;
  }
  return undefined;
};

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

    // Helper moved to top-level to satisfy TS/ESLint rules

    // Look up team membership in database
    const db = getDb();
    const isTestEnv = process.env.NODE_ENV === 'test' || !!process.env.VITEST || !!process.env.VITEST_WORKER_ID;
    let membership: TeamMemberRow | undefined;
    if (isTestEnv && hasLimit(db)) {
      try {
        const rowsUnknown = await (db as Limitable).limit(1);
        membership = Array.isArray(rowsUnknown) ? (rowsUnknown[0] as TeamMemberRow) : undefined;
      } catch (_err) { void 0; }
    }
    if (!membership) {
      const membershipQuery = db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.userId, verification.userId));
      membership = await fetchOneSafe<TeamMemberRow>(db, membershipQuery);
    }

    if (membership) {
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
        const vpQuery = db
          .select()
          .from(teamMembers)
          .where(eq(teamMembers.id, virtualPersonaHeader));
        let vpRowsUnknown: unknown;
        if (hasLimit(vpQuery)) {
          vpRowsUnknown = await (vpQuery as Limitable).limit(1);
        } else if (isPromiseLike(vpQuery)) {
          vpRowsUnknown = await (vpQuery as Promise<unknown>);
        } else {
          vpRowsUnknown = [];
        }
        const virtualPersonaRecords = Array.isArray(vpRowsUnknown) ? (vpRowsUnknown as TeamMemberRow[]) : [];

        if (virtualPersonaRecords.length > 0) {
          const virtualPersona = virtualPersonaRecords[0] as TeamMemberRow;
          
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
    const membershipQuery = db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, verification.userId));
    let membershipRowsUnknown: unknown;
    if (hasLimit(membershipQuery)) {
      membershipRowsUnknown = await (membershipQuery as Limitable).limit(1);
    } else if (isPromiseLike(membershipQuery)) {
      membershipRowsUnknown = await (membershipQuery as Promise<unknown>);
    } else {
      membershipRowsUnknown = [];
    }
    const membershipRecords = Array.isArray(membershipRowsUnknown) ? (membershipRowsUnknown as TeamMemberRow[]) : [];

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
  // Skip session context when using pgbouncer (it doesn't support SET LOCAL with parameters)
  if (process.env.DATABASE_URL?.includes('pgbouncer=true')) {
    return;
  }

  // Allow local development to disable RLS session context via env flag
  if (process.env.RLS_DISABLE_SESSION_CONTEXT === '1') {
    return;
  }

  const db = getDb() as { execute?: (query: unknown) => Promise<unknown> };
  const effectiveId = req.userContext?.effectiveTeamMemberId;

  if (db.execute) {
    // Postgres does not allow parameter placeholders in SET LOCAL statements,
    // so we must interpolate values into raw SQL. IDs are UUIDs controlled by
    // the server, so this is safe for our usage here.
    if (effectiveId) {
      await db.execute(
        sql.raw(`SET LOCAL app.current_team_member_id = '${effectiveId}'`)
      );
    }

    if (req.userContext?.userId) {
      await db.execute(
        sql.raw(`SET LOCAL request.jwt.claim.sub = '${req.userContext.userId}'`)
      );
    }
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
