import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createProxyMiddleware } from "http-proxy-middleware";
import { setupAdminPanel } from "./admin/index";
import { logger, logResponse } from "./utils/logger";
import { initializeSentry, setupSentryMiddleware, setupSentryErrorHandler } from "./utils/sentry";

const app = express();

// Initialize Sentry for error tracking (must be first)
initializeSentry(app);

// Sentry request handler (must be before routes)
setupSentryMiddleware(app);

// Winston logging middleware for API requests
app.use((req, res, next) => {
  const start = Date.now();
  const requestPath = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    
    if (requestPath.startsWith("/api")) {
      // Use Winston for structured logging
      logResponse(req, res.statusCode, duration);
      
      // Fallback to vite logger for development console visibility
      if (process.env.NODE_ENV === 'development') {
        const logLine = `${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`;
        log(logLine);
      }
    }
  });

  next();
});

(function setupPythonApiProxy() {
  // Bridge: forward /pyapi/* to the Python backend's /api/*
  // Default to localhost:5050, configurable via PY_BACKEND_URL or PY_BACKEND_PORT
  const pyBase =
    process.env.PY_BACKEND_URL || `http://localhost:${process.env.PY_BACKEND_PORT || "5050"}`;

  app.use(
    "/pyapi",
    createProxyMiddleware({
      target: pyBase,
      changeOrigin: true,
      ws: false,
      pathRewrite: { "^/pyapi": "/api" },
    }),
  );
})();

(async () => {
  // Setup AdminJS before routes
  await setupAdminPanel(app);

  // IMPORTANT: Apply body parsers AFTER AdminJS router to be compatible with @adminjs/express
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  const server = await registerRoutes(app);

  // Sentry error handler (must be after routes, before custom error handler)
  setupSentryErrorHandler(app);

  // Global error handler with Winston logging
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const status = (err as { status?: number; statusCode?: number })?.status || (err as { status?: number; statusCode?: number })?.statusCode || 500;
    const message = err instanceof Error ? err.message : "Internal Server Error";

    // Log error with context
    logger.error('Express error handler', {
      error: err instanceof Error ? {
        message: err.message,
        stack: err.stack,
        name: err.name
      } : err,
      method: req.method,
      url: req.url,
      statusCode: status,
      ip: req.ip
    });

    res.status(status).json({ message });
    
    // Only throw in development to see full stack
    if (process.env.NODE_ENV === 'development') {
      throw err;
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  const isDev = (process.env.NODE_ENV ?? 'development') !== 'production';
  const distPath = path.resolve(import.meta.dirname, "public");
  const hasBuild = fs.existsSync(distPath);
  log(`env=${process.env.NODE_ENV || 'undefined'} isDev=${isDev} hasBuild=${hasBuild}`);
  if (isDev || !hasBuild) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "localhost",
  }, () => {
    log(`serving on port ${port}`);
  });
})();
