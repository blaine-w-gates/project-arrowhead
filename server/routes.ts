import type { Express } from "express";
import { createServer, type Server } from "http";
import apiRouter from "./routes/index";
// Force clean state

export async function registerRoutes(app: Express): Promise<Server> {
  // Register API routes
  app.use("/api", apiRouter);

  // Create and return HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
