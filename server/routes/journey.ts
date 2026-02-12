import { Router } from "express";
import { storage } from "../storage";
import {
    insertJourneySessionSchema,
    updateJourneySessionSchema,
    insertTaskSchema,
    updateTaskSchema
} from "@shared/schema";
import { z } from "zod";

const router = Router();

// Journey Session routes
router.post("/sessions", async (req, res) => {
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

router.get("/sessions/:sessionId", async (req, res) => {
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

router.put("/sessions/:sessionId", async (req, res) => {
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
router.get("/sessions", async (req, res) => {
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

router.get("/sessions/:sessionId/export", async (req, res) => {
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

// Task management routes (legacy storage-backed APIs)
// Namespaced under /tasks to avoid colliding with
// Team MVP /api/tasks routes (server/api/tasks.ts).
router.post("/tasks", async (req, res) => {
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
router.get("/tasks", async (req, res) => {
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

router.get("/tasks/session/:sessionId", async (req, res) => {
    try {
        const tasks = await storage.getTasksBySession(req.params.sessionId);
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch tasks" });
    }
});

router.put("/tasks/:taskId", async (req, res) => {
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

router.delete("/tasks/:taskId", async (req, res) => {
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

export default router;
