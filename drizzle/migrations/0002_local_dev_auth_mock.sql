-- Local Development Auth Mock
-- This creates a mock auth schema for local PostgreSQL testing
-- In production Supabase, this schema already exists

-- Create auth schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS auth;

-- Create mock auth.users table
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamp DEFAULT now()
);

-- Create mock auth.uid() function
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid AS $$
BEGIN
  -- In local dev, return the session user setting or NULL
  -- In production, Supabase handles this automatically
  RETURN COALESCE(
    current_setting('request.jwt.claim.sub', true)::uuid,
    current_setting('app.current_user_id', true)::uuid
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON SCHEMA auth IS 'Mock auth schema for local development (Supabase provides this in production)';
COMMENT ON TABLE auth.users IS 'Mock users table for local testing';
COMMENT ON FUNCTION auth.uid() IS 'Mock function that returns current authenticated user ID';
