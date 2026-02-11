-- Team MVP Database Triggers
-- Based on: SLAD v6.0 Final, Section 7.0 Implementation Notes
--
-- TD.4: Completion Tracker - Ensures data integrity at database level
-- TD.5: Email Invitations - Links auth.users to team_members on signup

-- ============================================================================
-- TRIGGER 1: Update Objective Completion Status
-- ============================================================================
-- Purpose: Auto-update objectives.all_tasks_complete when all tasks are complete
--          Also set actual_completion_date when this happens

CREATE OR REPLACE FUNCTION update_objective_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_objective_id uuid;
  v_total_tasks integer;
  v_complete_tasks integer;
  v_all_complete boolean;
BEGIN
  -- Determine which objective to check
  IF TG_OP = 'DELETE' THEN
    v_objective_id := OLD.objective_id;
  ELSE
    v_objective_id := NEW.objective_id;
  END IF;

  -- Count total tasks and completed tasks for this objective
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'complete')
  INTO v_total_tasks, v_complete_tasks
  FROM tasks
  WHERE objective_id = v_objective_id;

  -- Determine if all tasks are complete
  -- Edge case: If no tasks exist, consider it NOT complete
  v_all_complete := (v_total_tasks > 0 AND v_total_tasks = v_complete_tasks);

  -- Update the objective
  UPDATE objectives
  SET 
    all_tasks_complete = v_all_complete,
    actual_completion_date = CASE 
      WHEN v_all_complete AND actual_completion_date IS NULL THEN now()
      WHEN NOT v_all_complete THEN NULL
      ELSE actual_completion_date
    END,
    updated_at = now()
  WHERE id = v_objective_id;

  -- Return appropriate value based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on tasks table
DROP TRIGGER IF EXISTS trigger_update_objective_completion ON tasks;
CREATE TRIGGER trigger_update_objective_completion
  AFTER INSERT OR UPDATE OF status OR DELETE
  ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_objective_completion();

COMMENT ON FUNCTION update_objective_completion() IS 'TD.4: Auto-updates objective completion status and date when all tasks are complete';

-- ============================================================================
-- TRIGGER 2: Link Invited Team Member on Signup
-- ============================================================================
-- Purpose: When a user signs up via invitation, link auth.users to team_members
--          Match by email and update invite_status to 'active'

CREATE OR REPLACE FUNCTION link_invited_team_member()
RETURNS TRIGGER AS $$
BEGIN
  -- Find pending team member invitation matching this email
  UPDATE team_members
  SET 
    user_id = NEW.id,
    invite_status = 'active',
    updated_at = now()
  WHERE email = NEW.email
    AND invite_status = 'invite_pending'
    AND user_id IS NULL;

  -- Note: If no match found, that's OK - user might be signing up independently
  -- The UPDATE will simply affect 0 rows

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS trigger_link_invited_team_member ON auth.users;
CREATE TRIGGER trigger_link_invited_team_member
  AFTER INSERT
  ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION link_invited_team_member();

COMMENT ON FUNCTION link_invited_team_member() IS 'TD.5: Links auth.users to team_members on signup, matching by email for pending invitations';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Use these to test trigger functionality

-- Test 1: Verify completion trigger works
-- Step 1: Create an objective with tasks
-- Step 2: Mark all tasks complete
-- Step 3: Check that objective.all_tasks_complete = true and actual_completion_date is set

-- Test 2: Verify invitation linking
-- Step 1: Create team_member with email, invite_status='invite_pending', user_id=NULL
-- Step 2: Insert into auth.users with matching email
-- Step 3: Check that team_member.user_id is set and invite_status='active'

-- ============================================================================
-- TRIGGER DEPENDENCY NOTES
-- ============================================================================
-- These triggers depend on:
-- 1. RLS policies (0001) - ensure triggers run with proper security context
-- 2. Schema structure (0000) - tables must exist before triggers
--
-- These triggers will be automatically executed by PostgreSQL when:
-- - Tasks are inserted, updated (status), or deleted
-- - Auth users are created (signup via invitation)
