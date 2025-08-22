import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertEmailSubscriberSchema,
  insertJourneySessionSchema,
  updateJourneySessionSchema,
  insertTaskSchema,
  updateTaskSchema,
  type JourneyModule
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Blog routes
  app.get("/api/blog/posts", async (req, res) => {
    try {
      const posts = await storage.getBlogPosts();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch blog posts" });
    }
  });

  app.get("/api/blog/posts/:slug", async (req, res) => {
    try {
      const post = await storage.getBlogPost(req.params.slug);
      if (!post) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      res.json(post);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch blog post" });
    }
  });

  // User registration
  app.post("/api/users/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const user = await storage.createUser(userData);
      res.status(201).json({ id: user.id, email: user.email, tier: user.tier });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Email subscription
  app.post("/api/email/subscribe", async (req, res) => {
    try {
      const subscriberData = insertEmailSubscriberSchema.parse(req.body);
      
      // Check if already subscribed
      const existingSubscriber = await storage.getEmailSubscriber(subscriberData.email);
      if (existingSubscriber) {
        return res.status(400).json({ message: "Email already subscribed" });
      }

      const subscriber = await storage.createEmailSubscriber(subscriberData);
      res.status(201).json({ message: "Successfully subscribed", id: subscriber.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid email data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to subscribe email" });
    }
  });

  // Journey Session routes
  app.post("/api/journey/sessions", async (req, res) => {
    try {
      console.log('🔧 SESSION CREATE: Received request for sessionId:', req.body.sessionId);
      const sessionData = insertJourneySessionSchema.parse(req.body);
      const session = await storage.createJourneySession(sessionData);
      console.log('✅ SESSION CREATE: Successfully created session:', session.sessionId);
      res.status(201).json(session);
    } catch (error) {
      console.log('🚨 SESSION CREATE ERROR:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create journey session" });
    }
  });

  app.get("/api/journey/sessions/:sessionId", async (req, res) => {
    try {
      console.log('🔍 SESSION GET: Looking for sessionId:', req.params.sessionId);
      const session = await storage.getJourneySession(req.params.sessionId);
      if (!session) {
        console.log('🚨 SESSION GET: Session not found for sessionId:', req.params.sessionId);
        return res.status(404).json({ message: "Journey session not found" });
      }
      console.log('✅ SESSION GET: Found session:', session.sessionId);
      res.json(session);
    } catch (error) {
      console.log('🚨 SESSION GET ERROR:', error);
      res.status(500).json({ message: "Failed to fetch journey session" });
    }
  });

  app.put("/api/journey/sessions/:sessionId", async (req, res) => {
    try {
      const sessionData = updateJourneySessionSchema.parse(req.body);
      const session = await storage.updateJourneySession(req.params.sessionId, sessionData);
      if (!session) {
        return res.status(404).json({ message: "Journey session not found" });
      }
      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update journey session" });
    }
  });

  // Get all journey sessions (with optional sessionId filter)
  app.get("/api/journey/sessions", async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string;
      if (sessionId) {
        // Get sessions for specific sessionId
        const sessions = await storage.getAllJourneySessionsForUser(sessionId);
        res.json(sessions);
      } else {
        // Get all sessions (for admin/testing purposes)
        const sessions = await storage.getAllJourneySessions();
        res.json(sessions);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch journey sessions" });
    }
  });

  app.get("/api/journey/sessions/:sessionId/export", async (req, res) => {
    try {
      const session = await storage.getJourneySession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Journey session not found" });
      }
      
      const tasks = await storage.getTasksBySession(req.params.sessionId);
      const exportData = {
        exportType: session.module,
        exportDate: new Date().toISOString(),
        session: session,
        tasks: tasks
      };
      
      res.json(exportData);
    } catch (error) {
      res.status(500).json({ message: "Failed to export journey session" });
    }
  });

  // Task management routes
  app.post("/api/tasks", async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  // Get tasks by session (alternative endpoint)
  app.get("/api/tasks", async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string;
      if (sessionId) {
        const tasks = await storage.getTasksBySession(sessionId);
        res.json(tasks);
      } else {
        // Get all tasks (for admin/testing purposes)
        const tasks = await storage.getAllTasks();
        res.json(tasks);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/session/:sessionId", async (req, res) => {
    try {
      const tasks = await storage.getTasksBySession(req.params.sessionId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.put("/api/tasks/:taskId", async (req, res) => {
    try {
      const taskData = updateTaskSchema.parse(req.body);
      const task = await storage.updateTask(req.params.taskId, taskData);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:taskId", async (req, res) => {
    try {
      const deleted = await storage.deleteTask(req.params.taskId);
      if (!deleted) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Journey progress routes
  app.get("/api/journey/progress/:sessionId", async (req, res) => {
    try {
      const session = await storage.getJourneySession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Journey session not found" });
      }
      
      const progress = {
        module: session.module,
        currentStep: session.currentStep,
        completedSteps: JSON.parse(session.completedSteps),
        isCompleted: session.isCompleted,
        totalSteps: session.module === 'objectives' ? 7 : 5
      };
      
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch journey progress" });
    }
  });

  // Bulk export route for full project data
  app.get("/api/journey/export/full/:sessionId", async (req, res) => {
    try {
      const sessions = await storage.getAllJourneySessionsForUser(req.params.sessionId);
      const tasks = await storage.getTasksBySession(req.params.sessionId);
      
      const exportData = {
        exportType: "unified_project",
        exportDate: new Date().toISOString(),
        sessions: sessions,
        tasks: tasks,
        summary: {
          totalSessions: sessions.length,
          totalTasks: tasks.length,
          completedSessions: sessions.filter(s => s.isCompleted).length
        }
      };
      
      res.json(exportData);
    } catch (error) {
      res.status(500).json({ message: "Failed to export full project data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
