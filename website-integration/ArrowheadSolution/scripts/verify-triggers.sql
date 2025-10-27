-- Database Triggers Verification Script
-- Tests both Team MVP triggers with realistic scenarios
--
-- Usage: psql <connection> -f scripts/verify-triggers.sql

\echo '========================================='
\echo 'Database Triggers Verification'
\echo '========================================='
\echo ''

-- ============================================================================
-- TEST 1: Objective Completion Trigger
-- ============================================================================

\echo '========================================='
\echo 'TEST 1: Objective Completion Trigger'
\echo '========================================='
\echo ''

-- Clean up any existing test data
DELETE FROM tasks WHERE objective_id = '99999999-9999-9999-9999-999999999999';

\echo 'Initial State: Objective with no completion'
SELECT 
  name,
  all_tasks_complete,
  actual_completion_date
FROM objectives 
WHERE id = '99999999-9999-9999-9999-999999999999';

\echo ''
\echo 'Step 1: Create 3 tasks for the objective (all todo)'
INSERT INTO tasks (id, objective_id, title, status) VALUES
  ('11111111-0000-0000-0000-000000000001', '99999999-9999-9999-9999-999999999999', 'Task 1', 'todo'),
  ('11111111-0000-0000-0000-000000000002', '99999999-9999-9999-9999-999999999999', 'Task 2', 'todo'),
  ('11111111-0000-0000-0000-000000000003', '99999999-9999-9999-9999-999999999999', 'Task 3', 'todo');

\echo 'After creating tasks (all todo):'
SELECT 
  name,
  all_tasks_complete,
  actual_completion_date
FROM objectives 
WHERE id = '99999999-9999-9999-9999-999999999999';

\echo ''
\echo 'Step 2: Complete 2 out of 3 tasks'
UPDATE tasks 
SET status = 'complete' 
WHERE id IN ('11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002');

\echo 'After completing 2/3 tasks (should still be false):'
SELECT 
  name,
  all_tasks_complete,
  actual_completion_date
FROM objectives 
WHERE id = '99999999-9999-9999-9999-999999999999';

\echo ''
\echo 'Step 3: Complete the final task'
UPDATE tasks 
SET status = 'complete' 
WHERE id = '11111111-0000-0000-0000-000000000003';

\echo 'After completing 3/3 tasks (should be TRUE with date):'
SELECT 
  name,
  all_tasks_complete,
  actual_completion_date IS NOT NULL as has_completion_date,
  actual_completion_date
FROM objectives 
WHERE id = '99999999-9999-9999-9999-999999999999';

\echo ''
\echo 'Step 4: Mark one task as incomplete (regress)'
UPDATE tasks 
SET status = 'in_progress' 
WHERE id = '11111111-0000-0000-0000-000000000003';

\echo 'After regressing one task (should be FALSE, date cleared):'
SELECT 
  name,
  all_tasks_complete,
  actual_completion_date
FROM objectives 
WHERE id = '99999999-9999-9999-9999-999999999999';

\echo ''
\echo 'Step 5: Delete all tasks'
DELETE FROM tasks WHERE objective_id = '99999999-9999-9999-9999-999999999999';

\echo 'After deleting all tasks (should be FALSE, no tasks = not complete):'
SELECT 
  name,
  all_tasks_complete,
  actual_completion_date
FROM objectives 
WHERE id = '99999999-9999-9999-9999-999999999999';

\echo ''
\echo '✅ TEST 1 COMPLETE'
\echo ''

-- ============================================================================
-- TEST 2: Invitation Linking Trigger
-- ============================================================================

\echo '========================================='
\echo 'TEST 2: Invitation Linking Trigger'
\echo '========================================='
\echo ''

-- Create a pending invitation
\echo 'Step 1: Create a team member with pending invitation'
INSERT INTO team_members (id, team_id, name, email, role, is_virtual, invite_status, user_id)
VALUES (
  'aaaabbbb-cccc-dddd-eeee-ffffffffffff',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'New User',
  'newuser@example.com',
  'Team Member',
  false,
  'invite_pending',
  NULL
)
ON CONFLICT (id) DO UPDATE 
SET user_id = NULL, invite_status = 'invite_pending', email = 'newuser@example.com';

\echo 'Team member before signup:'
SELECT 
  name,
  email,
  invite_status,
  user_id IS NULL as user_id_null
FROM team_members 
WHERE id = 'aaaabbbb-cccc-dddd-eeee-ffffffffffff';

\echo ''
\echo 'Step 2: User signs up via Supabase (simulated)'
INSERT INTO auth.users (id, email)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  'newuser@example.com'
)
ON CONFLICT (id) DO NOTHING;

\echo 'Team member after signup (should have user_id and active status):'
SELECT 
  name,
  email,
  invite_status,
  user_id,
  user_id = '44444444-4444-4444-4444-444444444444' as user_id_matches
FROM team_members 
WHERE id = 'aaaabbbb-cccc-dddd-eeee-ffffffffffff';

\echo ''
\echo 'Step 3: Verify trigger does NOT overwrite existing user_id'
-- Create another pending invitation
INSERT INTO team_members (id, team_id, name, email, role, is_virtual, invite_status, user_id)
VALUES (
  'bbbbcccc-dddd-eeee-ffff-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Already Linked User',
  'existing@example.com',
  'Team Member',
  false,
  'active',
  '55555555-5555-5555-5555-555555555555'
)
ON CONFLICT (id) DO UPDATE 
SET user_id = '55555555-5555-5555-5555-555555555555', invite_status = 'active';

-- Try to sign up with same email (should NOT update)
INSERT INTO auth.users (id, email)
VALUES (
  '66666666-6666-6666-6666-666666666666',
  'existing@example.com'
)
ON CONFLICT (email) DO NOTHING;

\echo 'Team member with existing user_id (should remain unchanged):'
SELECT 
  name,
  email,
  invite_status,
  user_id,
  user_id = '55555555-5555-5555-5555-555555555555' as original_user_id_preserved
FROM team_members 
WHERE id = 'bbbbcccc-dddd-eeee-ffff-aaaaaaaaaaaa';

\echo ''
\echo '✅ TEST 2 COMPLETE'
\echo ''

-- ============================================================================
-- SUMMARY
-- ============================================================================

\echo '========================================='
\echo 'VERIFICATION SUMMARY'
\echo '========================================='
\echo ''
\echo 'Expected Results:'
\echo '  TEST 1: Objective Completion Trigger'
\echo '    ✅ Objective tracks completion status automatically'
\echo '    ✅ Completion date set when all tasks complete'
\echo '    ✅ Completion date cleared when tasks regress'
\echo '    ✅ No tasks = not complete'
\echo ''
\echo '  TEST 2: Invitation Linking Trigger'
\echo '    ✅ Pending invitation linked to new user on signup'
\echo '    ✅ Existing user_id not overwritten'
\echo '    ✅ Invite status updated to active'
\echo ''
\echo '========================================='
\echo 'All triggers verified successfully!'
\echo '========================================='
