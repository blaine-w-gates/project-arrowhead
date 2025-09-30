/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import AdminJS, { ComponentLoader } from 'adminjs';
import { bundle } from '@adminjs/bundler';
import AdminJSExpress from '@adminjs/express';
import express, { type Express } from 'express';
import { verifyPassword } from './auth';
import { db } from '../db';
import { adminUsers, adminAuditLog, users, blogPosts, journeySessions, tasks } from '@shared/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { createAuditLog } from './middleware';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Configure and mount AdminJS to Express app
 * 
 * Note: AdminJS with Drizzle adapter requires additional configuration.
 * For Sprint 1, we'll use basic authentication and build out resources incrementally.
 */
export async function setupAdminPanel(app: Express) {
  // Ensure cookies work behind IDE/browser preview proxy
  app.set('trust proxy', 1);

  // Create AdminJS instance with minimal configuration
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const componentLoader = new ComponentLoader();
  const DashboardComponent = componentLoader.add('Dashboard', path.resolve(__dirname, 'components', 'dashboard.tsx'));
  const AdminUsersComponent = componentLoader.add('AdminUsersPage', path.resolve(__dirname, 'components', 'admin-users.tsx'));

  const port = parseInt(process.env.PORT || '5000', 10);
  // Align assetsCDN with what AdminJS login template expects (/admin/frontend/*)
  const assetsCdn = process.env.ADMIN_ASSETS_CDN || `http://127.0.0.1:${port}/admin/frontend`;

  const admin = new AdminJS({
    rootPath: '/admin',
    loginPath: '/admin/login',
    logoutPath: '/admin/logout',
    branding: {
      companyName: 'Project Arrowhead',
      logo: false,
      favicon: '/favicon.ico',
    },
    resources: [],
    locale: {
      language: 'en',
    },
    componentLoader,
    assetsCDN: assetsCdn,
    dashboard: {
      component: DashboardComponent,
      handler: async (_req, _res, _ctx) => {
        const q = async (table: any) => {
          const r = await db.select({ c: sql<number>`count(*)::int` }).from(table);
          return r?.[0]?.c ?? 0;
        };
        const [usersCount, postsCount, sessionsCount, tasksCount] = await Promise.all([
          q(users),
          q(blogPosts),
          q(journeySessions),
          q(tasks),
        ]);
        const recentAudit = await db
          .select()
          .from(adminAuditLog)
          .orderBy(desc(adminAuditLog.createdAt))
          .limit(10);
        return {
          counts: {
            users: usersCount,
            blogPosts: postsCount,
            sessions: sessionsCount,
            tasks: tasksCount,
          },
          recentAudit,
        };
      },
    },
    pages: {
      'Admin Users': {
        component: AdminUsersComponent,
        handler: async () => {
          const rows = await db
            .select({
              id: adminUsers.id,
              email: adminUsers.email,
              role: adminUsers.role,
              isActive: adminUsers.isActive,
              lastLogin: adminUsers.lastLogin,
              createdAt: adminUsers.createdAt,
            })
            .from(adminUsers)
            .orderBy(desc(adminUsers.createdAt))
            .limit(50);
          return { rows };
        },
      },
    },
  });

  // Bundle custom components and serve them statically (skip in tests)
  const bundleOutDir = path.resolve(__dirname, '../../.adminjs');
  const destinationDir = path.relative(process.cwd(), bundleOutDir) || '.adminjs';
  const isTestEnv = process.env.NODE_ENV === 'test' || !!process.env.VITEST || !!process.env.VITEST_WORKER_ID;
  if (!isTestEnv) {
    await bundle({ componentLoader, destinationDir });
    app.use('/_admin/assets', express.static(bundleOutDir));
    app.use('/admin/frontend', express.static(bundleOutDir, { immutable: true, maxAge: '1h' }));

    // Compatibility: some AdminJS templates may request bundles relative to /admin
    // Serve those by rewriting to our static bundle directory before mounting AdminJS router
    const bundleFiles = ['global.bundle.js', 'design-system.bundle.js', 'app.bundle.js', 'components.bundle.js'];
    // Dynamic matcher to catch /admin/<bundle>.js even with query strings
    app.get('/admin/:file', (req, res, next) => {
      const file = String(req.params.file || '');
      if (!bundleFiles.includes(file)) return next();
      res.sendFile(path.join(bundleOutDir, file));
    });
    for (const file of bundleFiles) {
      app.get(`/admin/${file}`, (_req, res) => {
        res.sendFile(path.join(bundleOutDir, file));
      });
    }
    // Also support /admin/frontend/<bundle>
    app.get('/admin/frontend/:file', (req, res) => {
      const f = String(req.params.file || '');
      if (!bundleFiles.includes(f)) return res.status(404).end();
      res.sendFile(path.join(bundleOutDir, f));
    });
  } else {
    console.log('AdminJS: skipping bundling in test environment');
  }
  // Create AdminJS router with authentication
  const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
    admin,
    {
      authenticate: async (email, password) => {
        console.log(`[admin-auth] attempt email=${email}`);
        // Validate credentials against admin_users
        const result = await db
          .select()
          .from(adminUsers)
          .where(eq(adminUsers.email, email.toLowerCase()))
          .limit(1);
        
        const adminRecord = result[0];
        if (!adminRecord) {
          console.log('[admin-auth] not_found');
          return null;
        }
        if (!adminRecord.isActive) {
          console.log('[admin-auth] inactive');
          return null;
        }

        const ok = await verifyPassword(password, adminRecord.passwordHash);
        if (!ok) {
          console.log('[admin-auth] bad_password');
          return null;
        }

        // Update last login timestamp (best-effort)
        try {
          await db
            .update(adminUsers)
            .set({ lastLogin: new Date() })
            .where(eq(adminUsers.id, adminRecord.id));
        } catch (_err) {
          // best-effort update: swallow errors safely
          void 0;
        }

        // Audit: login event (best-effort)
        try {
          await createAuditLog(adminRecord.id, 'login', 'admin', String(adminRecord.id));
        } catch (_err) {
          // best-effort audit: swallow errors safely
          void 0;
        }

        // Return a safe user object for AdminJS session
        const { passwordHash, ...safe } = adminRecord as any;
        console.log('[admin-auth] success', { id: adminRecord.id, email: adminRecord.email });
        return safe;
      },
      cookieName: 'adminjs',
      cookiePassword: process.env.ADMIN_COOKIE_SECRET || 'changeme-in-production',
    },
    null,
    {
      resave: false,
      // ensure session cookie is set even before explicit mutation in some proxies
      saveUninitialized: true,
      secret: process.env.ADMIN_SESSION_SECRET || 'changeme-in-production',
      cookie: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        // Allow tests to shorten session lifetime to assert expiration behavior
        maxAge: (() => {
          const v = process.env.ADMIN_SESSION_MAX_AGE_MS;
          const n = v ? Number(v) : NaN;
          return Number.isFinite(n) ? n : 30 * 60 * 1000; // 30 minutes default
        })(),
      },
      name: 'adminjs-session',
    }
  );

  // Mount admin router
  app.use(admin.options.rootPath, adminRouter);

  console.log(`✅ AdminJS started on http://localhost:5000${admin.options.rootPath}`);

  return admin;
}
