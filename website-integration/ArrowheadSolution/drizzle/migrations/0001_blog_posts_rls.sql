-- 0001_blog_posts_rls.sql
-- Codify blog_posts RLS and public read policy for published content

BEGIN;

-- Enable RLS (idempotent)
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Create policy only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = current_schema()
      AND tablename = 'blog_posts'
      AND policyname = 'blog_posts_public_read'
  ) THEN
    CREATE POLICY blog_posts_public_read
      ON blog_posts
      FOR SELECT
      USING (
        published = true
        AND (published_at IS NULL OR published_at <= now())
      );
  END IF;
END $$;

COMMIT;
