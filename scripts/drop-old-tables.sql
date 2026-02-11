-- Drop Old Application Tables
-- This script removes tables from the previous schema to prepare for Team MVP fresh migration
-- Run before generating the Team MVP migration

-- Drop old tables in reverse dependency order
DROP TABLE IF EXISTS auth_events CASCADE;
DROP TABLE IF EXISTS auth_totp CASCADE;
DROP TABLE IF EXISTS auth_otp CASCADE;
DROP TABLE IF EXISTS admin_audit_log CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS journey_sessions CASCADE;
DROP TABLE IF EXISTS user_subscriptions CASCADE;
DROP TABLE IF EXISTS email_subscribers CASCADE;
DROP TABLE IF EXISTS blog_posts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Note: drizzle_migrations table is intentionally kept to maintain migration history
