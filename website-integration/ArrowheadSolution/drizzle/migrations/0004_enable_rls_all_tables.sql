-- ============================================================================
-- Enable Row Level Security (RLS) on All Tables
-- ============================================================================
-- Purpose: Enable RLS enforcement on all user-data tables
-- Version: 1.0
-- Created: 2025-10-29
--
-- Context: Supabase Security Advisor flagged multiple tables without RLS enabled.
-- Even though RLS policies exist (from 0001_team_mvp_rls_policies.sql), they
-- are not enforced until RLS is explicitly enabled on each table.
--
-- CRITICAL: This migration enables RLS enforcement. Ensure policies exist
-- before running, or users will lose access to data.
-- ============================================================================

-- ============================================================================
-- Team MVP Core Tables
-- ============================================================================

-- Teams table: Core team records
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams FORCE ROW LEVEL SECURITY;

-- Team Members: User-to-team relationships
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members FORCE ROW LEVEL SECURITY;

-- Team Member Project Assignments: User-to-project relationships
ALTER TABLE public.team_member_project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_member_project_assignments FORCE ROW LEVEL SECURITY;

-- Projects: Team projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;

-- Objectives: Project objectives
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objectives FORCE ROW LEVEL SECURITY;

-- Tasks: Project/objective tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks FORCE ROW LEVEL SECURITY;

-- Task Assignments: User-to-task assignments
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- RRGT Dashboard Tables
-- ============================================================================

-- RRGT Items: Risks, Roles, Goals, Thoughts
ALTER TABLE public.rrgt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rrgt_items FORCE ROW LEVEL SECURITY;

-- Dial States: User dial positions (life satisfaction)
ALTER TABLE public.dial_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dial_states FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- Touchbase Tables
-- ============================================================================

-- Touchbases: Team member check-ins
ALTER TABLE public.touchbases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.touchbases FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- Free Tool Tables (Journey, Scoreboard, etc.)
-- ============================================================================

-- Journey Sessions: Unauthenticated journey progress
ALTER TABLE public.journey_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_sessions FORCE ROW LEVEL SECURITY;

-- Users: Legacy user table (if exists)
-- Note: May be replaced by auth.users + team_members pattern
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    EXECUTE 'ALTER TABLE public.users ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.users FORCE ROW LEVEL SECURITY';
  END IF;
END $$;

-- ============================================================================
-- Admin Tables
-- ============================================================================

-- Admin Users: AdminJS user accounts
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_users') THEN
    EXECUTE 'ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.admin_users FORCE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Admin Audit Log: AdminJS activity log
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_audit_log') THEN
    EXECUTE 'ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.admin_audit_log FORCE ROW LEVEL SECURITY';
  END IF;
END $$;

-- ============================================================================
-- Marketing/Lead Capture Tables
-- ============================================================================

-- Leads: Lead magnet subscribers
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leads') THEN
    EXECUTE 'ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.leads FORCE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Email Subscribers: Newsletter subscribers
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_subscribers') THEN
    EXECUTE 'ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.email_subscribers FORCE ROW LEVEL SECURITY';
  END IF;
END $$;

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Check which tables now have RLS enabled

SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END AS status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'teams', 'team_members', 'team_member_project_assignments',
    'projects', 'objectives', 'tasks', 'task_assignments',
    'rrgt_items', 'dial_states', 'touchbases',
    'journey_sessions', 'users',
    'admin_users', 'admin_audit_log',
    'leads', 'email_subscribers'
  )
ORDER BY tablename;

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================
--
-- What ENABLE ROW LEVEL SECURITY does:
-- - Activates RLS enforcement for regular users
-- - RLS policies (from 0001_team_mvp_rls_policies.sql) now apply
-- - Without matching policies, users get zero access
--
-- What FORCE ROW LEVEL SECURITY does:
-- - Enforces RLS even for table owners and superusers
-- - Critical for shared hosting (Supabase) where table owner != app user
-- - Prevents accidental bypass via direct psql access
--
-- Security Impact:
-- - BEFORE: Users could access any row (no security)
-- - AFTER: Users only see rows allowed by policies (secure)
--
-- Testing After Migration:
-- 1. Login as test-owner@arrowhead.com
-- 2. Verify can see "QA Test Team" data
-- 3. Try to access another team's data (should fail)
-- 4. Check Supabase Security Advisor (warnings should be gone)
--
-- Rollback (if needed):
-- To disable RLS: ALTER TABLE public.table_name DISABLE ROW LEVEL SECURITY;
-- Note: Only do this temporarily for debugging, never in production
--
-- ============================================================================
