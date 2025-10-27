-- Team MVP RLS Policies
-- Based on: SLAD v6.0 Final, Section 4.0 Security Model
-- 
-- Key Patterns:
-- 1. Team isolation: User must be member of team
-- 2. Project assignment: User must be assigned to project via junction table
-- 3. Touchbase privacy: Only creator + subject + Account Owner/Manager
-- 4. Virtual Persona support: Session variable app.current_team_member_id

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get current team member ID (either from auth.uid() or session variable for Virtual Persona)
CREATE OR REPLACE FUNCTION get_current_team_member_id()
RETURNS uuid AS $$
BEGIN
  -- Check if Virtual Persona session variable is set
  IF current_setting('app.current_team_member_id', true) IS NOT NULL THEN
    RETURN current_setting('app.current_team_member_id', true)::uuid;
  END IF;
  
  -- Fall back to auth.uid() lookup
  RETURN (
    SELECT id 
    FROM team_members 
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is member of a team
CREATE OR REPLACE FUNCTION is_team_member(team_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM team_members
    WHERE team_id = team_uuid
    AND (user_id = auth.uid() OR id = get_current_team_member_id())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is assigned to a project
CREATE OR REPLACE FUNCTION is_assigned_to_project(project_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM team_member_project_assignments tmpa
    WHERE tmpa.project_id = project_uuid
    AND tmpa.team_member_id = get_current_team_member_id()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user has Account Owner or Account Manager role
CREATE OR REPLACE FUNCTION is_account_admin(team_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM team_members
    WHERE team_id = team_uuid
    AND (user_id = auth.uid() OR id = get_current_team_member_id())
    AND role IN ('Account Owner', 'Account Manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- ENABLE RLS ON ALL TEAM MVP TABLES
-- ============================================================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_member_project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rrgt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE dial_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE touchbases ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TEAMS TABLE POLICIES
-- ============================================================================

-- SELECT: User can see teams they belong to
CREATE POLICY "team_members_select_own_teams"
ON teams FOR SELECT
USING (is_team_member(id));

-- INSERT: Not allowed via RLS (handled by application/admin)
-- UPDATE: Account Owner/Manager can update their team
CREATE POLICY "account_admins_update_team"
ON teams FOR UPDATE
USING (is_account_admin(id));

-- DELETE: Not allowed via RLS

-- ============================================================================
-- TEAM_MEMBERS TABLE POLICIES
-- ============================================================================

-- SELECT: See members of teams you belong to
CREATE POLICY "team_members_select_same_team"
ON team_members FOR SELECT
USING (is_team_member(team_id));

-- INSERT: Account admins can add members
CREATE POLICY "account_admins_insert_members"
ON team_members FOR INSERT
WITH CHECK (is_account_admin(team_id));

-- UPDATE: Account admins can update members, or members can update themselves
CREATE POLICY "members_update_self_or_admin"
ON team_members FOR UPDATE
USING (
  is_account_admin(team_id) 
  OR (user_id = auth.uid() OR id = get_current_team_member_id())
);

-- DELETE: Account admins can delete members
CREATE POLICY "account_admins_delete_members"
ON team_members FOR DELETE
USING (is_account_admin(team_id));

-- ============================================================================
-- TEAM_MEMBER_PROJECT_ASSIGNMENTS TABLE POLICIES
-- ============================================================================

-- SELECT: See assignments for your team
CREATE POLICY "team_members_select_project_assignments"
ON team_member_project_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    JOIN projects p ON tm.team_id = p.team_id
    WHERE p.id = team_member_project_assignments.project_id
    AND (tm.user_id = auth.uid() OR tm.id = get_current_team_member_id())
  )
);

-- INSERT: Account admins or Project Owners can assign
CREATE POLICY "admins_insert_project_assignments"
ON team_member_project_assignments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN team_members tm ON tm.team_id = p.team_id
    WHERE p.id = team_member_project_assignments.project_id
    AND (tm.user_id = auth.uid() OR tm.id = get_current_team_member_id())
    AND tm.role IN ('Account Owner', 'Account Manager', 'Project Owner')
  )
);

-- UPDATE: Not applicable (composite PK, delete+insert pattern)

-- DELETE: Account admins or Project Owners can remove assignments
CREATE POLICY "admins_delete_project_assignments"
ON team_member_project_assignments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN team_members tm ON tm.team_id = p.team_id
    WHERE p.id = team_member_project_assignments.project_id
    AND (tm.user_id = auth.uid() OR tm.id = get_current_team_member_id())
    AND tm.role IN ('Account Owner', 'Account Manager', 'Project Owner')
  )
);

-- ============================================================================
-- PROJECTS TABLE POLICIES
-- ============================================================================

-- SELECT: See projects for teams you belong to
CREATE POLICY "team_members_select_projects"
ON projects FOR SELECT
USING (is_team_member(team_id));

-- INSERT: Account admins or Project Owners can create projects
CREATE POLICY "project_owners_insert_projects"
ON projects FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = projects.team_id
    AND (user_id = auth.uid() OR id = get_current_team_member_id())
    AND role IN ('Account Owner', 'Account Manager', 'Project Owner')
  )
);

-- UPDATE: Account admins, Project Owners, or assigned members can update
CREATE POLICY "assigned_members_update_projects"
ON projects FOR UPDATE
USING (
  is_account_admin(team_id)
  OR EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = projects.team_id
    AND (user_id = auth.uid() OR id = get_current_team_member_id())
    AND role = 'Project Owner'
  )
  OR is_assigned_to_project(id)
);

-- DELETE: Account admins or Project Owners can delete (archive preferred)
CREATE POLICY "project_owners_delete_projects"
ON projects FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = projects.team_id
    AND (user_id = auth.uid() OR id = get_current_team_member_id())
    AND role IN ('Account Owner', 'Account Manager', 'Project Owner')
  )
);

-- ============================================================================
-- OBJECTIVES TABLE POLICIES
-- ============================================================================

-- SELECT: See objectives for projects you're assigned to
CREATE POLICY "assigned_members_select_objectives"
ON objectives FOR SELECT
USING (is_assigned_to_project(project_id));

-- INSERT: Assigned members can create objectives
CREATE POLICY "assigned_members_insert_objectives"
ON objectives FOR INSERT
WITH CHECK (is_assigned_to_project(project_id));

-- UPDATE: Assigned members can update objectives
CREATE POLICY "assigned_members_update_objectives"
ON objectives FOR UPDATE
USING (is_assigned_to_project(project_id));

-- DELETE: Account admins or Objective Owners can delete (archive preferred)
CREATE POLICY "objective_owners_delete_objectives"
ON objectives FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN team_members tm ON tm.team_id = p.team_id
    WHERE p.id = objectives.project_id
    AND (tm.user_id = auth.uid() OR tm.id = get_current_team_member_id())
    AND tm.role IN ('Account Owner', 'Account Manager', 'Objective Owner')
  )
  OR is_assigned_to_project(project_id)
);

-- ============================================================================
-- TASKS TABLE POLICIES
-- ============================================================================

-- SELECT: See tasks for objectives in assigned projects
CREATE POLICY "assigned_members_select_tasks"
ON tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM objectives o
    WHERE o.id = tasks.objective_id
    AND is_assigned_to_project(o.project_id)
  )
);

-- INSERT: Assigned members can create tasks
CREATE POLICY "assigned_members_insert_tasks"
ON tasks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM objectives o
    WHERE o.id = tasks.objective_id
    AND is_assigned_to_project(o.project_id)
  )
);

-- UPDATE: Assigned members can update tasks
CREATE POLICY "assigned_members_update_tasks"
ON tasks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM objectives o
    WHERE o.id = tasks.objective_id
    AND is_assigned_to_project(o.project_id)
  )
);

-- DELETE: Assigned members can delete tasks
CREATE POLICY "assigned_members_delete_tasks"
ON tasks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM objectives o
    WHERE o.id = tasks.objective_id
    AND is_assigned_to_project(o.project_id)
  )
);

-- ============================================================================
-- TASK_ASSIGNMENTS TABLE POLICIES
-- ============================================================================

-- SELECT: See assignments for tasks in assigned projects
CREATE POLICY "team_members_select_task_assignments"
ON task_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN objectives o ON o.id = t.objective_id
    WHERE t.id = task_assignments.task_id
    AND is_assigned_to_project(o.project_id)
  )
);

-- INSERT: Assigned members can create task assignments
CREATE POLICY "assigned_members_insert_task_assignments"
ON task_assignments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN objectives o ON o.id = t.objective_id
    WHERE t.id = task_assignments.task_id
    AND is_assigned_to_project(o.project_id)
  )
);

-- DELETE: Assigned members can remove task assignments
CREATE POLICY "assigned_members_delete_task_assignments"
ON task_assignments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN objectives o ON o.id = t.objective_id
    WHERE t.id = task_assignments.task_id
    AND is_assigned_to_project(o.project_id)
  )
);

-- ============================================================================
-- RRGT_ITEMS TABLE POLICIES
-- ============================================================================

-- SELECT: See own items, or Account admins can see all team items (God-view)
CREATE POLICY "members_select_own_rrgt_items"
ON rrgt_items FOR SELECT
USING (
  team_member_id = get_current_team_member_id()
  OR EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.id = rrgt_items.team_member_id
    AND is_account_admin(tm.team_id)
  )
);

-- INSERT: Create own items only
CREATE POLICY "members_insert_own_rrgt_items"
ON rrgt_items FOR INSERT
WITH CHECK (team_member_id = get_current_team_member_id());

-- UPDATE: Update own items only
CREATE POLICY "members_update_own_rrgt_items"
ON rrgt_items FOR UPDATE
USING (team_member_id = get_current_team_member_id());

-- DELETE: Delete own items only
CREATE POLICY "members_delete_own_rrgt_items"
ON rrgt_items FOR DELETE
USING (team_member_id = get_current_team_member_id());

-- ============================================================================
-- DIAL_STATES TABLE POLICIES
-- ============================================================================

-- SELECT: See own dial state, or Account admins can see all (God-view)
CREATE POLICY "members_select_own_dial_state"
ON dial_states FOR SELECT
USING (
  team_member_id = get_current_team_member_id()
  OR EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.id = dial_states.team_member_id
    AND is_account_admin(tm.team_id)
  )
);

-- INSERT: Create own dial state only
CREATE POLICY "members_insert_own_dial_state"
ON dial_states FOR INSERT
WITH CHECK (team_member_id = get_current_team_member_id());

-- UPDATE: Update own dial state only
CREATE POLICY "members_update_own_dial_state"
ON dial_states FOR UPDATE
USING (team_member_id = get_current_team_member_id());

-- DELETE: Delete own dial state only
CREATE POLICY "members_delete_own_dial_state"
ON dial_states FOR DELETE
USING (team_member_id = get_current_team_member_id());

-- ============================================================================
-- TOUCHBASES TABLE POLICIES
-- ============================================================================

-- SELECT: See touchbases where you are:
--   - The creator
--   - The subject (team member)
--   - Account Owner/Manager of the team
CREATE POLICY "restricted_select_touchbases"
ON touchbases FOR SELECT
USING (
  created_by = get_current_team_member_id()
  OR team_member_id = get_current_team_member_id()
  OR EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.id = touchbases.team_member_id
    AND is_account_admin(tm.team_id)
  )
);

-- INSERT: Anyone assigned to the project can create touchbases
CREATE POLICY "assigned_members_insert_touchbases"
ON touchbases FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM objectives o
    WHERE o.id = touchbases.objective_id
    AND is_assigned_to_project(o.project_id)
  )
);

-- UPDATE: Only creator can update (within editable window)
CREATE POLICY "creator_updates_touchbases"
ON touchbases FOR UPDATE
USING (
  created_by = get_current_team_member_id()
  AND editable = true
);

-- DELETE: Only creator or Account admins can delete
CREATE POLICY "creator_or_admin_deletes_touchbases"
ON touchbases FOR DELETE
USING (
  created_by = get_current_team_member_id()
  OR EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.id = touchbases.team_member_id
    AND is_account_admin(tm.team_id)
  )
);

-- ============================================================================
-- INDEXES FOR RLS POLICY PERFORMANCE
-- ============================================================================

-- These indexes support the helper functions and RLS policy lookups
CREATE INDEX IF NOT EXISTS idx_team_members_user_id_team_id ON team_members(user_id, team_id);
CREATE INDEX IF NOT EXISTS idx_tmpa_team_member_project ON team_member_project_assignments(team_member_id, project_id);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION get_current_team_member_id() IS 'Returns current team member ID from session variable (Virtual Persona) or auth.uid() lookup';
COMMENT ON FUNCTION is_team_member(uuid) IS 'Checks if current user is a member of the specified team';
COMMENT ON FUNCTION is_assigned_to_project(uuid) IS 'Checks if current user is assigned to the specified project';
COMMENT ON FUNCTION is_account_admin(uuid) IS 'Checks if current user has Account Owner or Account Manager role';
