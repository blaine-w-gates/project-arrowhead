/**
 * Team MVP Schema: Touchbases
 * 
 * This file defines the touchbase structure:
 * - touchbases: Status updates for objectives with 7 questions in JSONB
 * 
 * Based on: SLAD v6.0 Final, Section 3.0 Data Model
 */

import { pgTable, uuid, timestamp, boolean, jsonb, integer, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { objectives } from "./projects";
import { teamMembers } from "./teams";

/**
 * TOUCHBASES Table
 * Weekly status updates for objectives
 * 
 * Key Fields:
 * - objective_id: Parent objective
 * - team_member_id: Team member this touchbase is about (the subject)
 * - created_by: Team member who created it (Manager for Virtual Persona, self for real member)
 * - touchbase_date: When the touchbase was held (weekly cadence)
 * - responses: JSONB with 7 touchbase questions
 * - editable: Boolean flag (TRUE during 24-hour edit window)
 * 
 * Privacy Rules (RLS):
 * - Only viewable by: creator, subject team member, Account Owner, Account Manager
 * - Only editable by: creator (within 24-hour window)
 */
export const touchbases = pgTable("touchbases", {
  id: uuid("id").primaryKey().defaultRandom(),
  objectiveId: uuid("objective_id").references(() => objectives.id, { onDelete: "cascade" }).notNull(),
  teamMemberId: uuid("team_member_id").references(() => teamMembers.id, { onDelete: "cascade" }).notNull(),
  createdBy: uuid("created_by").references(() => teamMembers.id, { onDelete: "cascade" }).notNull(),
  touchbaseDate: timestamp("touchbase_date").notNull(),
  responses: jsonb("responses").$type<TouchbaseResponses>().notNull(),
  editable: boolean("editable").default(true).notNull(),
  version: integer("version").default(1).notNull(), // Optimistic locking
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  objectiveIdIdx: index("idx_touchbases_objective_id").on(table.objectiveId),
  teamMemberIdIdx: index("idx_touchbases_team_member_id").on(table.teamMemberId),
  createdByIdx: index("idx_touchbases_created_by").on(table.createdBy),
  touchbaseDateIdx: index("idx_touchbases_touchbase_date").on(table.touchbaseDate),
}));

// Relations
export const touchbasesRelations = relations(touchbases, ({ one }) => ({
  objective: one(objectives, {
    fields: [touchbases.objectiveId],
    references: [objectives.id],
  }),
  teamMember: one(teamMembers, {
    fields: [touchbases.teamMemberId],
    references: [teamMembers.id],
  }),
  creator: one(teamMembers, {
    fields: [touchbases.createdBy],
    references: [teamMembers.id],
  }),
}));

// Zod Schemas
export const insertTouchbaseSchema = createInsertSchema(touchbases).omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
});


// TypeScript Types
export type Touchbase = typeof touchbases.$inferSelect;
export type InsertTouchbase = z.infer<typeof insertTouchbaseSchema>;

// JSONB Data Structure
export interface TouchbaseResponses {
  q1_working_on?: string;
  q2_help_needed?: string;
  q3_blockers?: string;
  q4_wins?: string;
  q5_priorities?: string;
  q6_resource_needs?: string;
  q7_timeline_change?: string;
}
