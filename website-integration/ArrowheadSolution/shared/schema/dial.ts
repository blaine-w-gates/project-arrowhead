/**
 * Team MVP Schema: RRGT Dial
 * 
 * This file defines the dial state structure:
 * - dial_states: Tracks the two items a team member is comparing in the RRGT Dial
 * 
 * Based on: SLAD v6.0 Final, Section 3.0 Data Model
 */

import { pgTable, uuid, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { teamMembers } from "./teams";
import { rrgtItems } from "./tasks";

/**
 * DIAL_STATES Table
 * Tracks the RRGT Dial comparison state for each team member
 * 
 * Key Fields:
 * - team_member_id: Owner of this dial state (PK)
 * - left_item_id: RRGT item on the left side
 * - right_item_id: RRGT item on the right side
 * - selected_item_id: Which item won the comparison (nullable during comparison)
 * - is_left_private: Whether left item is marked private
 * - is_right_private: Whether right item is marked private
 * 
 * Business Rules:
 * - Each team member has exactly one dial state (1:1 relationship)
 * - Both items must belong to the same team member
 * - Privacy flags control visibility in Manager God-view
 */
export const dialStates = pgTable("dial_states", {
  teamMemberId: uuid("team_member_id").primaryKey().references(() => teamMembers.id, { onDelete: "cascade" }),
  leftItemId: uuid("left_item_id").references(() => rrgtItems.id, { onDelete: "set null" }),
  rightItemId: uuid("right_item_id").references(() => rrgtItems.id, { onDelete: "set null" }),
  selectedItemId: uuid("selected_item_id").references(() => rrgtItems.id, { onDelete: "set null" }),
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
  leftItem: one(rrgtItems, {
    fields: [dialStates.leftItemId],
    references: [rrgtItems.id],
  }),
  rightItem: one(rrgtItems, {
    fields: [dialStates.rightItemId],
    references: [rrgtItems.id],
  }),
  selectedItem: one(rrgtItems, {
    fields: [dialStates.selectedItemId],
    references: [rrgtItems.id],
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
