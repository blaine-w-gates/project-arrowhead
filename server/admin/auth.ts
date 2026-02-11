/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import type { Express } from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { db } from '../db';
import { adminUsers } from '@shared/schema';
import { eq } from 'drizzle-orm';

const PgSession = connectPgSimple(session);

/**
 * Configure Passport.js authentication strategies
 */
export function configureAuth(app: Express) {
  // Behind IDE/browser preview proxy we are on HTTP. Ensure cookies work.
  app.set('trust proxy', 1);

  // Session middleware configuration
  const sessionStore = new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: 'session', // PostgreSQL session table
    createTableIfMissing: true,
  });

  const secureCookies = process.env.NODE_ENV === 'production' && process.env.FORCE_INSECURE_COOKIES !== '1';
  app.use(
    session({
      store: sessionStore,
      secret: process.env.ADMIN_SESSION_SECRET || 'changeme-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: secureCookies,
        httpOnly: true,
        maxAge: 30 * 60 * 1000, // 30 minutes
        sameSite: 'lax',
      },
      name: 'admin.sid', // Custom session cookie name
    })
  );

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport Local Strategy for admin authentication
  passport.use(
    'admin-local',
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          // Find admin user by email
          const result = await db
            .select()
            .from(adminUsers)
            .where(eq(adminUsers.email, email.toLowerCase()))
            .limit(1);

          const admin = result[0];

          if (!admin) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          if (!admin.isActive) {
            return done(null, false, { message: 'Account is deactivated' });
          }

          // Verify password
          const isValid = await bcrypt.compare(password, admin.passwordHash);

          if (!isValid) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          // Update last login timestamp
          await db
            .update(adminUsers)
            .set({ lastLogin: new Date() })
            .where(eq(adminUsers.id, admin.id));

          // Return admin user (without password hash)
          const { passwordHash, ...adminData } = admin;
          return done(null, adminData);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const result = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.id, id))
        .limit(1);

      const admin = result[0];

      if (!admin || !admin.isActive) {
        return done(null, false);
      }

      const { passwordHash, ...adminData } = admin;
      done(null, adminData);
    } catch (error) {
      done(error);
    }
  });
}

/**
 * Middleware to ensure user is authenticated
 */
export function requireAuth(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

/**
 * Middleware to check if user has required role
 */
export function requireRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
