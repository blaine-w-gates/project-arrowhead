/**
 * Team MVP Schema: Projects and Objectives
 * 
 * This file defines the project and objective structures:
 * - projects: Top-level containers with vision data
 * - objectives: Individual journeys through Brainstorm → Choose → Objectives modules
 * 
 * Based on: SLAD v6.0 Final, Section 3.0 Data Model
 */

import { pgTable, uuid, text, boolean, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { teams, teamMemberProjectAssignments } from "./teams";

/**
 * PROJECTS Table
 * Top-level container for objectives within a team
 * 
 * Key Fields:
 * - vision_data: JSONB with 5 vision questions (q1_purpose, q2_achieve, q3_market, q4_customers, q5_win)
 * - completion_status: Manually set by Project Owner
 * - estimated_completion_date: Set by Project Owner
 * - is_archived: Soft delete flag
 */
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  visionData: jsonb("vision_data").$type<VisionData>(), // {q1_purpose, q2_achieve, q3_market, q4_customers, q5_win}
  completionStatus: text("completion_status").default("not_started").notNull().$type<CompletionStatus>(),
  estimatedCompletionDate: timestamp("estimated_completion_date"),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  teamIdIdx: index("idx_projects_team_id").on(table.teamId),
  isArchivedIdx: index("idx_projects_is_archived").on(table.isArchived),
}));

/**
 * OBJECTIVES Table
 * Individual journeys through the three modules
 * 
 * Key Fields:
 * - current_step: Integer 1-17 tracking progress (Brainstorm 1-5, Choose 6-10, Objectives 11-17)
 * - journey_status: 'draft' or 'complete'
 * - brainstorm_data: JSONB with 5 Brainstorm step responses
 * - choose_data: JSONB with 5 Choose step responses
 * - objectives_data: JSONB with 7 Objectives step responses
 * - all_tasks_complete: Auto-updated by database trigger when all tasks are complete
 * - target_completion_date: Set during Objectives module
 * - actual_completion_date: Auto-set by trigger when all_tasks_complete becomes true
 */
export const objectives = pgTable("objectives", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  currentStep: integer("current_step").default(1).notNull(),
  journeyStatus: text("journey_status").default("draft").notNull().$type<JourneyStatus>(),
  brainstormData: jsonb("brainstorm_data").$type<BrainstormData>(),
  chooseData: jsonb("choose_data").$type<ChooseData>(),
  objectivesData: jsonb("objectives_data").$type<ObjectivesData>(),
  allTasksComplete: boolean("all_tasks_complete").default(false).notNull(),
  targetCompletionDate: timestamp("target_completion_date"),
  actualCompletionDate: timestamp("actual_completion_date"),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index("idx_objectives_project_id").on(table.projectId),
  journeyStatusIdx: index("idx_objectives_journey_status").on(table.journeyStatus),
  isArchivedIdx: index("idx_objectives_is_archived").on(table.isArchived),
}));

// Relations
export const projectsRelations = relations(projects, ({ one, many }) => ({
  team: one(teams, {
    fields: [projects.teamId],
    references: [teams.id],
  }),
  objectives: many(objectives),
  teamMemberAssignments: many(teamMemberProjectAssignments),
}));

export const objectivesRelations = relations(objectives, ({ one }) => ({
  project: one(projects, {
    fields: [objectives.projectId],
    references: [projects.id],
  }),
}));

// Zod Schemas
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});


export const insertObjectiveSchema = createInsertSchema(objectives).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});


// TypeScript Types
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Objective = typeof objectives.$inferSelect;
export type InsertObjective = z.infer<typeof insertObjectiveSchema>;

// Enums
export type CompletionStatus = "not_started" | "in_progress" | "completed";
export type JourneyStatus = "draft" | "complete";

// JSONB Data Structures
export interface VisionData {
  q1_purpose?: string;
  q2_achieve?: string;
  q3_market?: string;
  q4_customers?: string;
  q5_win?: string;
}

export interface BrainstormData {
  step1_imitate?: string;
  step2_ideate?: string;
  step3_ignore?: string;
  step4_integrate?: string;
  step5_interfere?: string;
}

export interface ChooseData {
  step1_scenarios?: string;
  step2_compare?: string;
  step3_important?: string;
  step4_evaluate?: string;
  step5_support?: string;
}

export interface ObjectivesData {
  step1_objective?: string;
  step2_delegate?: string;
  step3_resources?: string;
  step4_obstacles?: string;
  step5_milestones?: string;
  step6_accountability?: string;
  step7_review?: string;
}
