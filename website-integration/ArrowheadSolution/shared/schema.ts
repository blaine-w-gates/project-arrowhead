import { pgTable, text, serial, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  tier: text("tier").notNull().default("free"), // free, pro, team
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripePriceId: text("stripe_price_id"),
  status: text("status").notNull().default("none"), // none, active, canceled, past_due, trialing
  planName: text("plan_name"), // "Pro Monthly", "Team Annual", etc.
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    idxUserId: index("idx_user_subscriptions_user_id").on(table.userId),
    idxStripeCustomerId: index("idx_user_subscriptions_stripe_customer_id").on(table.stripeCustomerId),
    idxStripeSubscriptionId: index("idx_user_subscriptions_stripe_subscription_id").on(table.stripeSubscriptionId),
    idxStatus: index("idx_user_subscriptions_status").on(table.status),
  };
});

export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  published: boolean("published").default(false),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    // Speeds up list queries and ordering (Postgres can scan btree index backwards for DESC)
    idxPublishedPublishedAt: index("idx_blog_posts_published_published_at").on(table.published, table.publishedAt),
  };
});

export const emailSubscribers = pgTable("email_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  subscribed: boolean("subscribed").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    // email already has a UNIQUE index; add created_at index for analytics/sorting if needed
    idxCreatedAt: index("idx_email_subscribers_created_at").on(table.createdAt),
  };
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  tier: true,
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  createdAt: true,
});

export const insertEmailSubscriberSchema = createInsertSchema(emailSubscribers).pick({
  email: true,
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserSubscriptionSchema = createInsertSchema(userSubscriptions).partial().omit({
  id: true,
  userId: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertEmailSubscriber = z.infer<typeof insertEmailSubscriberSchema>;
export type EmailSubscriber = typeof emailSubscribers.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type UpdateUserSubscription = z.infer<typeof updateUserSubscriptionSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;

// Journey System Tables
export const journeySessions = pgTable("journey_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionId: text("session_id").notNull().unique(), // For guest users
  module: text("module").notNull(), // 'brainstorm', 'choose', 'objectives'
  stepData: text("step_data").notNull().default('{}'), // JSON string of step responses
  completedSteps: text("completed_steps").notNull().default('[]'), // JSON array of completed step numbers
  currentStep: integer("current_step").notNull().default(1),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    // sessionId is UNIQUE (implicitly indexed). Add userId index for lookups by user.
    idxUserId: index("idx_journey_sessions_user_id").on(table.userId),
    idxUpdatedAt: index("idx_journey_sessions_updated_at").on(table.updatedAt),
  };
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionId: text("session_id").notNull(), // Links to journey session or guest session
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("todo"), // 'todo', 'in_progress', 'done'
  priority: text("priority").default("medium"), // 'low', 'medium', 'high'
  dueDate: timestamp("due_date"),
  assignedTo: text("assigned_to").default("You"),
  sourceModule: text("source_module"), // 'brainstorm', 'choose', 'objectives', 'custom'
  sourceStep: integer("source_step"), // Which step the task was created from
  tags: text("tags").default('[]'), // JSON array of tags
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    idxSessionId: index("idx_tasks_session_id").on(table.sessionId),
    idxUserId: index("idx_tasks_user_id").on(table.userId),
  };
});

// Admin Users Table
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"), // 'super_admin', 'admin', 'support', 'read_only'
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    idxEmail: index("idx_admin_users_email").on(table.email),
    idxRole: index("idx_admin_users_role").on(table.role),
  };
});

// Admin Audit Log Table
export const adminAuditLog = pgTable("admin_audit_log", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").references(() => adminUsers.id).notNull(),
  action: text("action").notNull(), // 'create', 'update', 'delete', 'login', 'logout'
  resource: text("resource").notNull(), // 'users', 'teams', 'subscriptions', etc.
  resourceId: text("resource_id"), // ID of the affected resource
  changes: text("changes"), // JSON string of what changed
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    idxAdminId: index("idx_admin_audit_log_admin_id").on(table.adminId),
    idxCreatedAt: index("idx_admin_audit_log_created_at").on(table.createdAt),
    idxResource: index("idx_admin_audit_log_resource").on(table.resource),
  };
});

// Journey Session Schemas
export const insertJourneySessionSchema = createInsertSchema(journeySessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateJourneySessionSchema = createInsertSchema(journeySessions).omit({
  id: true,
  createdAt: true,
}).partial();

// Task Schemas
export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
}).partial();

// Journey System Types
export type JourneySession = typeof journeySessions.$inferSelect;
export type InsertJourneySession = z.infer<typeof insertJourneySessionSchema>;
export type UpdateJourneySession = z.infer<typeof updateJourneySessionSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;

// Admin Users Schemas
export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
});

export const updateAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
}).partial();

// Admin Audit Log Schema
export const insertAdminAuditLogSchema = createInsertSchema(adminAuditLog).omit({
  id: true,
  createdAt: true,
});

// Admin Types
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type UpdateAdminUser = z.infer<typeof updateAdminUserSchema>;
export type AdminAuditLog = typeof adminAuditLog.$inferSelect;
export type InsertAdminAuditLog = z.infer<typeof insertAdminAuditLogSchema>;
export type AdminRole = 'super_admin' | 'admin' | 'support' | 'read_only';

// Journey Module Types
export type JourneyModule = 'brainstorm' | 'choose' | 'objectives';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

// Journey Step Data Interfaces
export interface BrainstormStepData {
  step1?: string; // Imitate/Trends
  step2?: string; // Ideate
  step3?: string; // Ignore
  step4?: string; // Integrate
  step5?: string; // Interfere
}

export interface ChooseStepData {
  step1?: string; // Scenarios
  step2?: string; // Compare
  step3?: string; // Important Aspects
  step4?: string; // Evaluate
  step5?: string; // Support Decision
}

export interface ObjectivesStepData {
  step1?: string; // Objective
  step2?: string; // Delegate
  step3?: string; // Resources
  step4?: string; // Obstacles
  step5?: string; // Milestones
  step6?: string; // Accountability
  step7?: string; // Review
}

// Auth tables (passwordless + MFA) — vNext
// Note: store metadata/backup codes as JSON strings in TEXT columns to avoid jsonb/array dependencies.
export const authOtp = pgTable("auth_otp", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  email: text("email").notNull(),
  codeHash: text("code_hash"), // hashed OTP code
  token: text("token"),        // magic-link token (single-use)
  purpose: text("purpose"),    // 'login' | 'verify_email' | 'reset'
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(5),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  ip: text("ip"),
  userAgent: text("user_agent"),
}, (table) => {
  return {
    idxEmail: index("idx_auth_otp_email").on(table.email),
    idxExpiresAt: index("idx_auth_otp_expires_at").on(table.expiresAt),
  };
});

export const authTotp = pgTable("auth_totp", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  secretEnc: text("secret_enc").notNull(), // encrypted TOTP secret
  backupCodesHash: text("backup_codes_hash").notNull().default("[]"), // JSON string of hashed backup codes
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    idxUserId: index("idx_auth_totp_user_id").on(table.userId),
  };
});

export const authEvents = pgTable("auth_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  type: text("type").notNull(), // 'otp_issued' | 'otp_verified' | 'login' | 'logout' | 'mfa_enrolled' | 'mfa_verified' | 'rate_limited' | 'failed_attempt'
  metadata: text("metadata"),   // JSON string { ip, ua, method, reason }
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    idxUserId: index("idx_auth_events_user_id").on(table.userId),
    idxCreatedAt: index("idx_auth_events_created_at").on(table.createdAt),
    idxType: index("idx_auth_events_type").on(table.type),
  };
});
