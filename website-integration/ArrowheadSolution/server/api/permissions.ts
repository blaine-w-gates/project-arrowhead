/**
 * Permission Checking Utilities
 * 
 * Helper functions for role-based access control
 * Based on: PRD v5.2 Section 6.2 Permission Matrix
 */

import { UserContext } from '../auth/middleware';

/**
 * Role Hierarchy
 * Per PRD v5.2 Section 6.2
 */
export type TeamRole = 
  | 'Account Owner' 
  | 'Account Manager' 
  | 'Project Owner' 
  | 'Objective Owner' 
  | 'Team Member';

/**
 * Permission Actions
 */
export type PermissionAction =
  | 'create_project'
  | 'edit_project'
  | 'delete_project'
  | 'create_objective'
  | 'edit_objective'
  | 'manage_tasks'
  | 'create_touchbase'
  | 'view_other_rrgt'
  | 'manage_team';

/**
 * Permission Matrix Implementation
 * Based on PRD v5.2 Section 6.2 Table
 */
const PERMISSION_MATRIX: Record<PermissionAction, Set<TeamRole>> = {
  create_project: new Set<TeamRole>(['Account Owner', 'Account Manager', 'Project Owner']),
  edit_project: new Set<TeamRole>(['Account Owner', 'Account Manager', 'Project Owner']),
  delete_project: new Set<TeamRole>(['Account Owner', 'Account Manager', 'Project Owner']),
  create_objective: new Set<TeamRole>(['Account Owner', 'Account Manager', 'Project Owner']),
  edit_objective: new Set<TeamRole>(['Account Owner', 'Account Manager', 'Project Owner']),
  manage_tasks: new Set<TeamRole>(['Account Owner', 'Account Manager', 'Project Owner', 'Objective Owner']),
  create_touchbase: new Set<TeamRole>(['Account Owner', 'Account Manager', 'Project Owner', 'Objective Owner']),
  view_other_rrgt: new Set<TeamRole>(['Account Owner', 'Account Manager', 'Project Owner', 'Objective Owner']),
  manage_team: new Set<TeamRole>(['Account Owner', 'Account Manager']),
};

/**
 * Check if user has permission for an action
 * 
 * @param userContext - User context from auth middleware
 * @param action - Permission action to check
 * @returns true if user has permission, false otherwise
 */
export function hasPermission(
  userContext: UserContext | undefined,
  action: PermissionAction
): boolean {
  if (!userContext || !userContext.role) {
    return false;
  }

  const allowedRoles = PERMISSION_MATRIX[action];
  return allowedRoles.has(userContext.role as TeamRole);
}

/**
 * Check if user can create projects
 * Account Owner, Account Manager, or Project Owner
 */
export function canCreateProject(userContext: UserContext | undefined): boolean {
  return hasPermission(userContext, 'create_project');
}

/**
 * Check if user can edit projects
 * Account Owner, Account Manager, or Project Owner
 */
export function canEditProject(userContext: UserContext | undefined): boolean {
  return hasPermission(userContext, 'edit_project');
}

/**
 * Check if user can delete projects
 * Account Owner, Account Manager, or Project Owner
 */
export function canDeleteProject(userContext: UserContext | undefined): boolean {
  return hasPermission(userContext, 'delete_project');
}

/**
 * Check if user is an account administrator
 * Account Owner or Account Manager
 */
export function isAccountAdmin(userContext: UserContext | undefined): boolean {
  return hasPermission(userContext, 'manage_team');
}

/**
 * Format permission error response
 */
export interface PermissionError {
  error: 'Forbidden';
  message: string;
  required_role?: string;
  current_role?: string;
}

/**
 * Create permission error response
 */
export function createPermissionError(
  action: string,
  userContext: UserContext | undefined
): PermissionError {
  return {
    error: 'Forbidden',
    message: `You don't have permission to ${action}`,
    current_role: userContext?.role,
  };
}
