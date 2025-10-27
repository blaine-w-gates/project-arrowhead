-- RLS Policy Verification Script
-- Tests Team MVP RLS policies with sample data
--
-- Usage: psql <connection> -f scripts/verify-rls-policies.sql

\echo '========================================='
\echo 'RLS Policy Verification Script'
\echo '========================================='
\echo ''

-- Create test users in auth.users
\echo '1. Creating test users...'
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'owner@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'manager@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'member@example.com')
ON CONFLICT (id) DO NOTHING;

-- Create test team
\echo '2. Creating test team...'
INSERT INTO teams (id, name) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test Team')
ON CONFLICT (id) DO NOTHING;

-- Create team members
\echo '3. Creating team members...'
INSERT INTO team_members (id, team_id, user_id, name, email, role, is_virtual) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Account Owner', 'owner@example.com', 'Account Owner', false),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Account Manager', 'manager@example.com', 'Account Manager', false),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Team Member', 'member@example.com', 'Team Member', false),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'Virtual Persona', NULL, 'Team Member', true)
ON CONFLICT (id) DO NOTHING;

-- Create test project
\echo '4. Creating test project...'
INSERT INTO projects (id, team_id, name) VALUES
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test Project')
ON CONFLICT (id) DO NOTHING;

-- Assign members to project
\echo '5. Assigning members to project...'
INSERT INTO team_member_project_assignments (team_member_id, project_id) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ffffffff-ffff-ffff-ffff-ffffffffffff'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'ffffffff-ffff-ffff-ffff-ffffffffffff')
ON CONFLICT DO NOTHING;

-- Create test objective
\echo '6. Creating test objective...'
INSERT INTO objectives (id, project_id, name) VALUES
  ('99999999-9999-9999-9999-999999999999', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Test Objective')
ON CONFLICT (id) DO NOTHING;

\echo ''
\echo '========================================='
\echo 'Test Data Created Successfully!'
\echo '========================================='
\echo ''
\echo 'Test Accounts:'
\echo '  - owner@example.com (Account Owner)'
\echo '  - manager@example.com (Account Manager)'
\echo '  - member@example.com (Team Member)'
\echo ''
\echo 'To test RLS policies:'
\echo '  1. Set session user: SET request.jwt.claim.sub = ''<user_id>'';'
\echo '  2. Run queries as that user'
\echo '  3. Verify access matches role permissions'
\echo ''
\echo '========================================='
\echo 'Verification Queries'
\echo '========================================='
\echo ''

-- Test 1: Team Member can see their team
\echo 'Test 1: Team Member (member@example.com) can see their team'
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SELECT COUNT(*) AS visible_teams FROM teams;

-- Test 2: Team Member can see team projects
\echo 'Test 2: Team Member can see team projects'
SELECT COUNT(*) AS visible_projects FROM projects;

-- Test 3: Team Member can only see assigned projects
\echo 'Test 3: Team Member can see assigned project'
SELECT COUNT(*) AS assigned_projects 
FROM projects p
WHERE EXISTS (
  SELECT 1 FROM team_member_project_assignments tmpa
  WHERE tmpa.project_id = p.id
  AND tmpa.team_member_id = get_current_team_member_id()
);

-- Test 4: Helper functions work correctly
\echo 'Test 4: Helper functions return correct values'
SELECT 
  auth.uid() as auth_uid,
  get_current_team_member_id() as team_member_id,
  is_team_member('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') as is_team_member,
  is_assigned_to_project('ffffffff-ffff-ffff-ffff-ffffffffffff') as is_assigned_to_project,
  is_account_admin('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') as is_account_admin;

\echo ''
\echo '========================================='
\echo 'Verification Complete!'
\echo '========================================='
