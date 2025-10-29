-- ============================================================================
-- Test User & Team Seeding Script
-- ============================================================================
-- Purpose: Creates test users, team, and team member relationships for QA
-- Version: 1.0
-- Last Updated: 2025-10-29
--
-- IMPORTANT: This script is for DEVELOPMENT/STAGING environments only.
-- DO NOT run this against production databases.
-- ============================================================================

-- Rollback existing test data (idempotent)
-- ============================================================================

-- Delete existing test team members (if any)
DELETE FROM team_members 
WHERE team_id IN (
  SELECT id FROM teams WHERE name = 'QA Test Team'
);

-- Delete existing test team
DELETE FROM teams WHERE name = 'QA Test Team';

-- Delete existing test users from auth.users
-- Note: This requires service role access to auth schema
DELETE FROM auth.users 
WHERE email IN (
  'test-owner@arrowhead.com',
  'test-member@arrowhead.com',
  'test-manager@arrowhead.com'
);

-- ============================================================================
-- Create Test Users
-- ============================================================================
-- Password for all test accounts: TestPassword123!
-- Note: Using bcrypt hash with gen_salt('bf')
-- ============================================================================

-- Test User 1: Account Owner
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'test-owner@arrowhead.com',
  crypt('TestPassword123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Test Owner"}',
  false,
  'authenticated',
  'authenticated'
);

-- Test User 2: Team Member
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'test-member@arrowhead.com',
  crypt('TestPassword123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Test Member"}',
  false,
  'authenticated',
  'authenticated'
);

-- Test User 3: Team Manager
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'test-manager@arrowhead.com',
  crypt('TestPassword123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Test Manager"}',
  false,
  'authenticated',
  'authenticated'
);

-- ============================================================================
-- Create Test Team
-- ============================================================================

INSERT INTO teams (
  id,
  name,
  subscription_status,
  trial_ends_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'QA Test Team',
  'active',
  NOW() + INTERVAL '1 year', -- Set trial end 1 year in future
  NOW(),
  NOW()
);

-- ============================================================================
-- Create Team Member Relationships
-- ============================================================================

-- Link Test Owner as Account Owner
INSERT INTO team_members (
  id,
  team_id,
  user_id,
  name,
  role,
  invite_status,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM teams WHERE name = 'QA Test Team'),
  u.id,
  'Test Owner',
  'Account Owner',
  'active',
  NOW(),
  NOW()
FROM auth.users u
WHERE u.email = 'test-owner@arrowhead.com';

-- Link Test Member as Team Member
INSERT INTO team_members (
  id,
  team_id,
  user_id,
  name,
  role,
  invite_status,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM teams WHERE name = 'QA Test Team'),
  u.id,
  'Test Member',
  'Team Member',
  'active',
  NOW(),
  NOW()
FROM auth.users u
WHERE u.email = 'test-member@arrowhead.com';

-- Link Test Manager as Manager
INSERT INTO team_members (
  id,
  team_id,
  user_id,
  name,
  role,
  invite_status,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM teams WHERE name = 'QA Test Team'),
  u.id,
  'Test Manager',
  'Manager',
  'active',
  NOW(),
  NOW()
FROM auth.users u
WHERE u.email = 'test-manager@arrowhead.com';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify test users were created
SELECT 
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email IN (
  'test-owner@arrowhead.com',
  'test-member@arrowhead.com',
  'test-manager@arrowhead.com'
)
ORDER BY email;

-- Verify test team was created
SELECT 
  id,
  name,
  subscription_status,
  trial_ends_at,
  created_at
FROM teams
WHERE name = 'QA Test Team';

-- Verify team member relationships
SELECT 
  tm.name,
  tm.role,
  tm.invite_status,
  u.email
FROM team_members tm
JOIN auth.users u ON tm.user_id = u.id
WHERE tm.team_id = (SELECT id FROM teams WHERE name = 'QA Test Team')
ORDER BY tm.role DESC;

-- ============================================================================
-- Success Message
-- ============================================================================
-- If you see results from the queries above, seeding was successful!
--
-- Test Credentials:
-- - Email: test-owner@arrowhead.com   | Role: Account Owner  | Password: TestPassword123!
-- - Email: test-manager@arrowhead.com | Role: Manager        | Password: TestPassword123!
-- - Email: test-member@arrowhead.com  | Role: Team Member    | Password: TestPassword123!
--
-- Team: QA Test Team (Active subscription, trial expires in 1 year)
-- ============================================================================
