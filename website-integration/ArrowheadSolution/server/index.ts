import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
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
      logLevel: "warn",
    }),
  );
})();

(async () => {
  const server = await registerRoutes(app);

  // Ensure Decap CMS admin loads at /admin and /admin/ by redirecting to the index file
  app.get(["/admin", "/admin/"], (_req, res) => {
    res.redirect(302, "/admin/index.html");
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = (err as { status?: number; statusCode?: number })?.status || (err as { status?: number; statusCode?: number })?.statusCode || 500;
    const message = err instanceof Error ? err.message : "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
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
