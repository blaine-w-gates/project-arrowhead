/**
 * Team MVP Schema: RRGT Dial
 * 
 * This file defines the dial state structure:
 * - dial_states: Tracks the two items a team member is comparing in the RRGT Dial
 * 
 * Based on: SLAD v6.0 Final, Section 3.0 Data Model
 */

import { pgTable, uuid, boolean, timestamp, integer, text } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { teamMembers } from "./teams";
import { rrgtPlans } from "./rrgt";

/**
 * DIAL_STATES Table
 * Tracks the RRGT Dial comparison state for each team member
 * 
 * Key Fields:
 * - team_member_id: Owner of this dial state (PK)
 * - left_plan_id / left_column_index: Coordinates for the left Matrix cell
 * - right_plan_id / right_column_index: Coordinates for the right Matrix cell
 * - left_text: Optional snapshot of the left cell label
 * - selected_slot: Which side is the current primary focus (left/right, nullable during comparison)
 * - is_left_private: Whether left item is marked private
 * - is_right_private: Whether right item is marked private
 * 
 * Business Rules:
 * - Each team member has exactly one dial state (1:1 relationship)
 * - Both slots should reference plans for the same team member (enforced at application layer)
 * - Privacy flags control visibility in Manager God-view
 */
export const dialStates = pgTable("dial_states", {
  teamMemberId: uuid("team_member_id").primaryKey().references(() => teamMembers.id, { onDelete: "cascade" }),
  leftPlanId: uuid("left_plan_id").references(() => rrgtPlans.id, { onDelete: "set null" }),
  leftColumnIndex: integer("left_column_index"),
  leftText: text("left_text"),
  rightPlanId: uuid("right_plan_id").references(() => rrgtPlans.id, { onDelete: "set null" }),
  rightColumnIndex: integer("right_column_index"),
  selectedSlot: text("selected_slot"),
  isLeftPrivate: boolean("is_left_private").default(false).notNull(),
  isRightPrivate: boolean("is_right_private").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const dialStatesRelations = relations(dialStates, ({ one }) => ({
  teamMember: one(teamMembers, {
    fields: [dialStates.teamMemberId],
    references: [teamMembers.id],
  }),
  leftPlan: one(rrgtPlans, {
    fields: [dialStates.leftPlanId],
    references: [rrgtPlans.id],
  }),
  rightPlan: one(rrgtPlans, {
    fields: [dialStates.rightPlanId],
    references: [rrgtPlans.id],
  }),
}));

// Zod Schemas
export const insertDialStateSchema = createInsertSchema(dialStates).omit({
  createdAt: true,
  updatedAt: true,
});


export const updateDialStateSchema = insertDialStateSchema.partial().omit({
  teamMemberId: true,
});

// TypeScript Types
export type DialState = typeof dialStates.$inferSelect;
export type InsertDialState = z.infer<typeof insertDialStateSchema>;
export type UpdateDialState = z.infer<typeof updateDialStateSchema>;
