import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertEmailSubscriberSchema,
  insertJourneySessionSchema,
  updateJourneySessionSchema,
  insertTaskSchema,
  updateTaskSchema
} from "@shared/schema";
import { z } from "zod";
import { getDb } from "./db";
import { authOtp, authEvents, users } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";
import { signJwt } from "./auth/jwt";

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

  // --- Auth vNext: Passwordless OTP endpoints ---
  const rateMap = new Map<string, { count: number; resetAt: number }>();
  const RATE_LIMIT = 5; // requests per window
  const RATE_WINDOW_MS = 60_000; // 1 minute

  function rateKey(ip: string, email?: string) {
    return `${ip}|${(email || "").toLowerCase()}`;
  }
  function allowRate(key: string) {
    const now = Date.now();
    const v = rateMap.get(key);
    if (!v || v.resetAt <= now) {
      rateMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
      return true;
    }
    if (v.count >= RATE_LIMIT) return false;
    v.count += 1;
    return true;
  }
  function originAllowed(req: import("express").Request): boolean {
    const origin = (req.get("origin") || "").replace(/\/$/, "");
    if (!origin) return true; // tolerate missing Origin in dev/tools
    const host = `${req.protocol}://${req.get("host")}`.replace(/\/$/, "");
    return origin === host;
  }
  function sha256Hex(s: string): string {
    return crypto.createHash("sha256").update(s, "utf8").digest("hex");
  }

  app.post("/api/auth/request", async (req, res) => {
    try {
      if (req.get("content-type")?.toLowerCase().indexOf("application/json") === -1) {
        return res.status(415).json({ success: false, error: "Content-Type must be application/json" });
      }
      if (!originAllowed(req)) {
        return res.status(403).json({ success: false, error: "Origin not allowed" });
      }

      const emailRaw = typeof req.body?.email === "string" ? String(req.body.email) : "";
      const email = emailRaw.trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) {
        return res.status(400).json({ success: false, error: "Invalid email" });
      }

      const ip = (req.headers["x-forwarded-for"] as string || "").split(",")[0].trim() || req.socket.remoteAddress || "";
      const key = rateKey(String(ip), email);
      if (!allowRate(key)) {
        return res.status(429).json({ success: false, error: "Too many requests" });
      }

      // Generate a 6-digit OTP and store hashed
      const code = (Math.floor(100000 + Math.random() * 900000)).toString();
      const codeHash = sha256Hex(code);
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const db = getDb();
      await db.insert(authOtp).values({
        email,
        codeHash,
        purpose: "login",
        attempts: 0,
        maxAttempts: 5,
        expiresAt: expires,
        createdAt: new Date(),
        ip: String(ip),
        userAgent: req.get("user-agent") || "",
      });

      await db.insert(authEvents).values({
        userId: null,
        type: "otp_issued",
        metadata: JSON.stringify({ email, ip }),
        createdAt: new Date(),
      });

      // TODO: integrate email provider; for now, log code in dev
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[auth][dev] OTP for ${email}: ${code}`);
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: "Unexpected error" });
    }
  });

  app.post("/api/auth/verify", async (req, res) => {
    try {
      if (req.get("content-type")?.toLowerCase().indexOf("application/json") === -1) {
        return res.status(415).json({ success: false, error: "Content-Type must be application/json" });
      }
      if (!originAllowed(req)) {
        return res.status(403).json({ success: false, error: "Origin not allowed" });
      }

      const emailRaw = typeof req.body?.email === "string" ? String(req.body.email) : "";
      const codeRaw = typeof req.body?.code === "string" ? String(req.body.code) : "";
      const email = emailRaw.trim().toLowerCase();
      const code = codeRaw.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email) || !/^\d{6,8}$/.test(code)) {
        return res.status(400).json({ success: false, error: "Invalid email or code" });
      }

      const ip = (req.headers["x-forwarded-for"] as string || "").split(",")[0].trim() || req.socket.remoteAddress || "";
      const key = rateKey(String(ip), email);
      if (!allowRate(key)) {
        return res.status(429).json({ success: false, error: "Too many requests" });
      }

      const db = getDb();
      const now = new Date();
      const rows = await db
        .select()
        .from(authOtp)
        .where(eq(authOtp.email, email))
        .orderBy(desc(authOtp.createdAt))
        .limit(5);

      const candidate = rows.find(r => (r.expiresAt ? r.expiresAt.getTime() : 0) >= now.getTime() && (r.attempts ?? 0) < (r.maxAttempts ?? 5));
      if (!candidate) {
        await db.insert(authEvents).values({ userId: null, type: "failed_attempt", metadata: JSON.stringify({ email, reason: "no_valid_otp" }), createdAt: now });
        return res.status(401).json({ success: false, error: "Invalid or expired code" });
      }

      const ok = candidate.codeHash && candidate.codeHash === sha256Hex(code);
      if (!ok) {
        // increment attempts best-effort
        try {
          await db.execute(/* sql */`UPDATE auth_otp SET attempts = attempts + 1 WHERE id = ${candidate.id}`);
        } catch {}
        await db.insert(authEvents).values({ userId: null, type: "failed_attempt", metadata: JSON.stringify({ email, reason: "mismatch" }), createdAt: now });
        return res.status(401).json({ success: false, error: "Invalid or expired code" });
      }

      // Resolve or create user
      let user = await db.select().from(users).where(eq(users.email, email)).then(r => r[0]);
      if (!user) {
        user = await db.insert(users).values({ email, password: crypto.randomBytes(16).toString('hex'), tier: 'free' }).returning().then(r => r[0]);
      }

      const secret = process.env.AUTH_JWT_SECRET || '';
      if (!secret) {
        return res.status(500).json({ success: false, error: "Server not configured" });
      }
      const jti = crypto.randomBytes(16).toString('hex');
      const token = signJwt({ sub: String(user.id), jti }, secret, 7 * 24 * 60 * 60);

      // Set HttpOnly cookie
      res.cookie('sb_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      await db.insert(authEvents).values({ userId: user.id, type: "login", metadata: JSON.stringify({ jti, ip }), createdAt: now });

      return res.status(200).json({ success: true, user: { id: user.id, email: user.email } });
    } catch (err) {
      return res.status(500).json({ success: false, error: "Unexpected error" });
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

  // HEAD health endpoints for blog APIs (used by E2E tests and CDNs)
  app.head("/api/blog/posts", async (_req, res) => {
    try {
      // Touch the storage to ensure it is healthy
      await storage.getBlogPosts();
      res.setHeader("Cache-Control", "max-age=60, must-revalidate");
      res.status(204).end();
    } catch (_err) {
      res.status(500).end();
    }
  });

  app.head("/api/blog/posts/:slug", async (req, res) => {
    try {
      const post = await storage.getBlogPost(req.params.slug);
      if (!post) {
        return res.status(404).end();
      }
      res.setHeader("Cache-Control", "max-age=60, must-revalidate");
      res.status(204).end();
    } catch (_err) {
      res.status(500).end();
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

  // SEO: Sitemap
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const posts = (await storage.getBlogPosts()).filter((p) => p.slug !== "xss-test");
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const urls = posts
        .map((p) => {
          const lastmod = (p.publishedAt ?? new Date()).toISOString();
          return `\n  <url>\n    <loc>${baseUrl}/blog/${p.slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`;
        })
        .join("");

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}\n</urlset>`;
      res.setHeader("Content-Type", "application/xml");
      res.send(xml);
    } catch (_err) {
      res.status(500).send("<error>Failed to generate sitemap</error>");
    }
  });

  // SEO: RSS feed
  app.get("/rss.xml", async (req, res) => {
    try {
      const posts = (await storage.getBlogPosts()).filter((p) => p.slug !== "xss-test");
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const items = posts
        .map((p) => {
          const pub = (p.publishedAt ?? new Date()).toUTCString();
          const safeTitle = p.title.replace(/]]>/g, "]]");
          const safeExcerpt = (p.excerpt || "").replace(/]]>/g, "]]");
          const link = `${baseUrl}/blog/${p.slug}`;
          return `\n  <item>\n    <title><![CDATA[${safeTitle}]]></title>\n    <link>${link}</link>\n    <guid>${link}</guid>\n    <pubDate>${pub}</pubDate>\n    <description><![CDATA[${safeExcerpt}]]></description>\n  </item>`;
        })
        .join("");

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n  <title>Strategic Insights Blog</title>\n  <link>${baseUrl}/blog</link>\n  <description>Expert advice on business strategy and planning</description>\n  <language>en-us</language>\n  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}\n</channel>\n</rss>`;
      res.setHeader("Content-Type", "application/rss+xml");
      res.send(xml);
    } catch (_err) {
      res.status(500).send("<error>Failed to generate RSS feed</error>");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
