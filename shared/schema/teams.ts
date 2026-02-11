/**
 * Team MVP Schema: Teams and Members
 * 
 * This file defines the core team structure including:
 * - teams: Organization accounts
 * - team_members: Real users and Virtual Personas (5 roles)
 * - team_member_project_assignments: Junction table for project access control
 * 
 * Based on: SLAD v6.0 Final, Section 3.0 Data Model
 */

import { pgTable, uuid, text, boolean, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { projects } from "./projects";

/**
 * TEAMS Table
 * Represents a company/organization account in the multi-tenant system
 */
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // Stripe Integration Fields
  stripeCustomerId: text("stripe_customer_id"), // Stripe Customer ID (cus_xxx)
  stripeSubscriptionId: text("stripe_subscription_id"), // Stripe Subscription ID (sub_xxx)
  subscriptionStatus: text("subscription_status"), // trialing, active, past_due, canceled, incomplete, incomplete_expired, unpaid
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }), // When current billing period ends
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }), // When the 14-day trial expires (NULL if no trial or trial completed)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * TEAM_MEMBERS Table
 * Represents both real users and virtual personas within a team
 * 
 * Key Fields:
 * - user_id: NULL for virtual personas, links to auth.users for real members
 * - email: NULL for virtual personas, required for invitations (globally unique)
 * - is_virtual: TRUE for personas managed by Manager
 * - invite_status: Tracks invitation lifecycle
 * - role: One of 5 defined roles (Account Owner, Account Manager, Project Owner, Objective Owner, Team Member)
 */
export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id"), // References auth.users(id) - NULL for virtual personas
  name: text("name").notNull(),
  email: text("email").unique(), // Globally unique for authentication, NULL for virtual personas
  role: text("role").notNull().$type<TeamMemberRole>(), // Account Owner, Account Manager, Project Owner, Objective Owner, Team Member
  isVirtual: boolean("is_virtual").default(false).notNull(),
  inviteStatus: text("invite_status").default("not_invited").notNull().$type<InviteStatus>(), // not_invited, invite_pending, active
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  teamIdIdx: index("idx_team_members_team_id").on(table.teamId),
  userIdIdx: index("idx_team_members_user_id").on(table.userId),
  emailIdx: index("idx_team_members_email").on(table.email),
}));

/**
 * TEAM_MEMBER_PROJECT_ASSIGNMENTS Table
 * Junction table controlling which team members can access which projects
 * 
 * This is critical for RLS policy enforcement:
 * - All queries for objectives/tasks/touchbases must verify project assignment
 */
export const teamMemberProjectAssignments = pgTable("team_member_project_assignments", {
  teamMemberId: uuid("team_member_id").references(() => teamMembers.id, { onDelete: "cascade" }).notNull(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.teamMemberId, table.projectId] }),
  teamMemberIdx: index("idx_tmpa_team_member").on(table.teamMemberId),
  projectIdx: index("idx_tmpa_project").on(table.projectId),
}));

// Relations for Drizzle ORM query builder
export const teamsRelations = relations(teams, ({ many }) => ({
  members: many(teamMembers),
}));

export const teamMembersRelations = relations(teamMembers, ({ one, many }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  projectAssignments: many(teamMemberProjectAssignments),
}));

export const teamMemberProjectAssignmentsRelations = relations(teamMemberProjectAssignments, ({ one }) => ({
  teamMember: one(teamMembers, {
    fields: [teamMemberProjectAssignments.teamMemberId],
    references: [teamMembers.id],
  }),
  project: one(projects, {
    fields: [teamMemberProjectAssignments.projectId],
    references: [projects.id],
  }),
}));

// Zod Schemas for validation
export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});


export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});


export const insertTeamMemberProjectAssignmentSchema = createInsertSchema(teamMemberProjectAssignments).omit({
  assignedAt: true,
});

// TypeScript Types
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

export type TeamMemberProjectAssignment = typeof teamMemberProjectAssignments.$inferSelect;
export type InsertTeamMemberProjectAssignment = z.infer<typeof insertTeamMemberProjectAssignmentSchema>;

// Enums
export type TeamMemberRole = 
  | "Account Owner"
  | "Account Manager"
  | "Project Owner"
  | "Objective Owner"
  | "Team Member";

export type InviteStatus = "not_invited" | "invite_pending" | "active";
