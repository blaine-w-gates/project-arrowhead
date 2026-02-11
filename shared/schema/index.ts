/**
 * Team MVP Schema Index
 * 
 * Exports all schema tables, relations, validation schemas, and types
 * for the Team-Based MVP multi-tenant architecture.
 * 
 * Based on: SLAD v6.0 Final, Section 3.0 Data Model
 * 
 * Schema Organization (Logical Grouping):
 * - teams.ts: teams, team_members, team_member_project_assignments
 * - projects.ts: projects, objectives
 * - tasks.ts: tasks, task_assignments, rrgt_items
 * - touchbases.ts: touchbases
 * - dial.ts: dial_states
 * - rrgt.ts: rrgt_plans, rrgt_subtasks, rrgt_rabbits
 */

// Tables and Relations
export * from "./teams";
export * from "./projects";
export * from "./tasks";
export * from "./touchbases";
export * from "./dial";
export * from "./rrgt";
