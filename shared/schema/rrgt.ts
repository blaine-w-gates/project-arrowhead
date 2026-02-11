import { pgTable, uuid, integer, text, timestamp, index, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { tasks } from "./tasks";
import { teamMembers } from "./teams";
import { projects, objectives } from "./projects";

/**
 * RRGT v2 Schema – Rabbit Race Matrix
 *
 * Tables:
 * - rrgt_plans: one row per (task, team_member)
 * - rrgt_subtasks: per-cell subtask text
 * - rrgt_rabbits: current rabbit position per plan
 */

export const rrgtPlans = pgTable("rrgt_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  teamMemberId: uuid("team_member_id").references(() => teamMembers.id, { onDelete: "cascade" }).notNull(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  objectiveId: uuid("objective_id").references(() => objectives.id, { onDelete: "cascade" }).notNull(),
  maxColumnIndex: integer("max_column_index").default(6).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  taskIdx: index("idx_rrgt_plans_task_id").on(table.taskId),
  teamMemberIdx: index("idx_rrgt_plans_team_member_id").on(table.teamMemberId),
  projectIdx: index("idx_rrgt_plans_project_id").on(table.projectId),
  objectiveIdx: index("idx_rrgt_plans_objective_id").on(table.objectiveId),
}));

export const rrgtSubtasks = pgTable("rrgt_subtasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").references(() => rrgtPlans.id, { onDelete: "cascade" }).notNull(),
  columnIndex: integer("column_index").notNull(), // 0 = Start, 1..N = subtasks
  text: text("text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  planIdx: index("idx_rrgt_subtasks_plan_id").on(table.planId),
  columnIdx: index("idx_rrgt_subtasks_column_index").on(table.columnIndex),
}));

export const rrgtRabbits = pgTable("rrgt_rabbits", {
  planId: uuid("plan_id").references(() => rrgtPlans.id, { onDelete: "cascade" }).notNull(),
  currentColumnIndex: integer("current_column_index").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.planId] }),
  planIdx: index("idx_rrgt_rabbits_plan_id").on(table.planId),
}));

// Relations
export const rrgtPlansRelations = relations(rrgtPlans, ({ one, many }) => ({
  task: one(tasks, {
    fields: [rrgtPlans.taskId],
    references: [tasks.id],
  }),
  teamMember: one(teamMembers, {
    fields: [rrgtPlans.teamMemberId],
    references: [teamMembers.id],
  }),
  project: one(projects, {
    fields: [rrgtPlans.projectId],
    references: [projects.id],
  }),
  objective: one(objectives, {
    fields: [rrgtPlans.objectiveId],
    references: [objectives.id],
  }),
  subtasks: many(rrgtSubtasks),
  rabbit: one(rrgtRabbits, {
    fields: [rrgtPlans.id],
    references: [rrgtRabbits.planId],
  }),
}));

export const rrgtSubtasksRelations = relations(rrgtSubtasks, ({ one }) => ({
  plan: one(rrgtPlans, {
    fields: [rrgtSubtasks.planId],
    references: [rrgtPlans.id],
  }),
}));

export const rrgtRabbitsRelations = relations(rrgtRabbits, ({ one }) => ({
  plan: one(rrgtPlans, {
    fields: [rrgtRabbits.planId],
    references: [rrgtPlans.id],
  }),
}));

// Zod Schemas
export const insertRrgtPlanSchema = createInsertSchema(rrgtPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRrgtSubtaskSchema = createInsertSchema(rrgtSubtasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRrgtRabbitSchema = createInsertSchema(rrgtRabbits).omit({});

// Types
export type RrgtPlan = typeof rrgtPlans.$inferSelect;
export type InsertRrgtPlan = z.infer<typeof insertRrgtPlanSchema>;

export type RrgtSubtask = typeof rrgtSubtasks.$inferSelect;
export type InsertRrgtSubtask = z.infer<typeof insertRrgtSubtaskSchema>;

export type RrgtRabbit = typeof rrgtRabbits.$inferSelect;
export type InsertRrgtRabbit = z.infer<typeof insertRrgtRabbitSchema>;
