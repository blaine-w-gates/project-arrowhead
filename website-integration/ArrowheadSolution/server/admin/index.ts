import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import type { Express } from 'express';
import { configureAuth } from './auth';

/**
 * Configure and mount AdminJS to Express app
 * 
 * Note: AdminJS with Drizzle adapter requires additional configuration.
 * For Sprint 1, we'll use basic authentication and build out resources incrementally.
 */
export async function setupAdminPanel(app: Express) {
  // Configure authentication first
  configureAuth(app);

  // Create AdminJS instance with minimal configuration
  const admin = new AdminJS({
    rootPath: '/admin',
    loginPath: '/admin/login',
    logoutPath: '/admin/logout',
    branding: {
      companyName: 'Project Arrowhead',
      logo: false,
      favicon: '/favicon.ico',
    },
    resources: [
      // Resources will be added in Sprint 1 completion
      // Currently focusing on authentication infrastructure
    ],
    locale: {
      language: 'en',
    },
  });

  // Create AdminJS router with authentication
  const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
    admin,
    {
      authenticate: async (email, password) => {
        // Authentication is handled by Passport.js in auth.ts
        // This is a placeholder that AdminJS requires
        return null;
      },
      cookieName: 'adminjs',
      cookiePassword: process.env.ADMIN_COOKIE_SECRET || 'changeme-in-production',
    },
    null,
    {
      resave: false,
      saveUninitialized: false,
      secret: process.env.ADMIN_SESSION_SECRET || 'changeme-in-production',
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      },
    }
  );

  // Mount admin router
  app.use(admin.options.rootPath, adminRouter);

  console.log(`✅ AdminJS started on http://localhost:5000${admin.options.rootPath}`);

  return admin;
}
