import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { registerRoutes } from './routes';
import { setupVite, serveStatic, log } from './vite';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { setupAdminPanel } from './admin/index';
import type { Server } from 'http';

export async function createApp(options?: { withVite?: boolean }): Promise<{ app: Express; server: Server }> {
  const app = express();

  // Lightweight API logger (excludes static assets)
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

    const originalResJson = res.json.bind(res) as <T = unknown>(body?: T) => Response;
    (res as Response & { json: <T = unknown>(body?: T) => Response }).json = function <T = unknown>(bodyJson?: T): Response {
      capturedJsonResponse = (bodyJson as unknown) as Record<string, unknown> | undefined;
      return originalResJson<T>(bodyJson);
    };

    res.on('finish', () => {
      const duration = Date.now() - start;
      if (path.startsWith('/api')) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          try { logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`; } catch (_err) { /* noop */ }
        }
        if (logLine.length > 80) logLine = logLine.slice(0, 79) + '…';
        log(logLine);
      }
    });

    next();
  });

  // Optional: Python proxy used elsewhere in the app
  (function setupPythonApiProxy() {
    const pyBase = process.env.PY_BACKEND_URL || `http://localhost:${process.env.PY_BACKEND_PORT || '5050'}`;
    app.use(
      '/pyapi',
      createProxyMiddleware({
        target: pyBase,
        changeOrigin: true,
        ws: false,
        pathRewrite: { '^/pyapi': '/api' },
      }),
    );
  })();

  // Setup AdminJS BEFORE body parsers as required by @adminjs/express
  await setupAdminPanel(app);

  // Apply body parsers AFTER AdminJS
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Register app routes and create HTTP server (not listening yet)
  const server = await registerRoutes(app);

  // Error handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = (err as Partial<{ status: number; statusCode: number }>)?.status || (err as Partial<{ status: number; statusCode: number }>)?.statusCode || 500;
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    res.status(status).json({ message });
    // Re-throw so vitest can catch if desired
    if (process.env.NODE_ENV === 'test') {
      // no rethrow to avoid noisy test output
    } else {
      // eslint-disable-next-line no-throw-literal
      throw err as Error;
    }
  });

  // Vite dev middleware only when requested
  const withVite = options?.withVite ?? (process.env.NODE_ENV === 'development');
  if (withVite) {
    await setupVite(app, server);
  } else if (process.env.NODE_ENV !== 'test') {
    serveStatic(app);
  }

  return { app, server };
}
