/**
 * Team MVP Schema: Tasks and RRGT Items
 * 
 * This file defines the task management structures:
 * - tasks: Action items within objectives
 * - task_assignments: Many-to-many relationship between tasks and team members
 * - rrgt_items: Items in the RRGT dashboard columns
 * 
 * Based on: SLAD v6.0 Final, Section 3.0 Data Model
 */

import { pgTable, uuid, text, integer, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { objectives } from "./projects";
import { teamMembers } from "./teams";

/**
 * TASKS Table
 * Action items created during the Objectives module
 * 
 * Key Fields:
 * - objective_id: Parent objective
 * - status: todo, in_progress, complete
 * - priority: 1 (high), 2 (medium), 3 (low)
 * - due_date: Optional deadline
 */
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  objectiveId: uuid("objective_id").references(() => objectives.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("todo").notNull().$type<TaskStatus>(),
  priority: integer("priority").default(2).notNull(), // 1=high, 2=medium, 3=low
  dueDate: timestamp("due_date"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  objectiveIdIdx: index("idx_tasks_objective_id").on(table.objectiveId),
  statusIdx: index("idx_tasks_status").on(table.status),
}));

/**
 * TASK_ASSIGNMENTS Table
 * Many-to-many junction table for task assignees
 * 
 * A task can be assigned to multiple team members
 * A team member can have multiple tasks
 */
export const taskAssignments = pgTable("task_assignments", {
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  teamMemberId: uuid("team_member_id").references(() => teamMembers.id, { onDelete: "cascade" }).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.taskId, table.teamMemberId] }),
  taskIdx: index("idx_task_assignments_task").on(table.taskId),
  teamMemberIdx: index("idx_task_assignments_team_member").on(table.teamMemberId),
}));

/**
 * RRGT_ITEMS Table
 * Items displayed in the RRGT dashboard columns
 * 
 * Key Fields:
 * - task_id: Source task (required)
 * - team_member_id: Owner of this item
 * - column_index: 1-6 (Red, Red/Yellow, Yellow, Yellow/Green, Green, Top Priority)
 * - title: Display text
 * 
 * Business Rules:
 * - Each task can have multiple RRGT items (one per assignee)
 * - Items are owned by individual team members
 * - Column position indicates status/priority
 */
export const rrgtItems = pgTable("rrgt_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  teamMemberId: uuid("team_member_id").references(() => teamMembers.id, { onDelete: "cascade" }).notNull(),
  columnIndex: integer("column_index").notNull(), // 1-6
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  taskIdIdx: index("idx_rrgt_items_task_id").on(table.taskId),
  teamMemberIdIdx: index("idx_rrgt_items_team_member_id").on(table.teamMemberId),
  columnIdx: index("idx_rrgt_items_column_index").on(table.columnIndex),
}));

// Relations
export const tasksRelations = relations(tasks, ({ one, many }) => ({
  objective: one(objectives, {
    fields: [tasks.objectiveId],
    references: [objectives.id],
  }),
  assignments: many(taskAssignments),
  rrgtItems: many(rrgtItems),
}));

export const taskAssignmentsRelations = relations(taskAssignments, ({ one }) => ({
  task: one(tasks, {
    fields: [taskAssignments.taskId],
    references: [tasks.id],
  }),
  teamMember: one(teamMembers, {
    fields: [taskAssignments.teamMemberId],
    references: [teamMembers.id],
  }),
}));

export const rrgtItemsRelations = relations(rrgtItems, ({ one }) => ({
  task: one(tasks, {
    fields: [rrgtItems.taskId],
    references: [tasks.id],
  }),
  teamMember: one(teamMembers, {
    fields: [rrgtItems.teamMemberId],
    references: [teamMembers.id],
  }),
}));

// Zod Schemas
export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});


export const insertTaskAssignmentSchema = createInsertSchema(taskAssignments).omit({
  assignedAt: true,
});

export const insertRrgtItemSchema = createInsertSchema(rrgtItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});


// TypeScript Types
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type TaskAssignment = typeof taskAssignments.$inferSelect;
export type InsertTaskAssignment = z.infer<typeof insertTaskAssignmentSchema>;

export type RrgtItem = typeof rrgtItems.$inferSelect;
export type InsertRrgtItem = z.infer<typeof insertRrgtItemSchema>;

// Enums
export type TaskStatus = "todo" | "in_progress" | "complete";
