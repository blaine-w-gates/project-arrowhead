#!/usr/bin/env node
import pg from 'pg';

function buildClient() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    console.error('[verify-rls] DATABASE_URL is not set');
    process.exit(1);
  }
  let original;
  try {
    original = new URL(raw);
  } catch (e) {
    console.error('[verify-rls] Invalid DATABASE_URL:', e.message);
    process.exit(2);
  }
  const servername = original.hostname; // preserve SNI
  const hostOverride = process.env.PGHOSTADDR || process.env.DB_HOST_IPV4;

  let effective = raw;
  if (hostOverride) {
    const u = new URL(raw);
    u.hostname = hostOverride;
    if (!u.searchParams.has('sslmode')) u.searchParams.set('sslmode', 'require');
    effective = u.toString();
  }

  console.log('[verify-rls] Connecting with IPv4 override:', !!hostOverride);
  return new pg.Client({
    connectionString: effective,
    ssl: { rejectUnauthorized: true, servername },
  });
}

async function main() {
  const client = buildClient();
  await client.connect();
  try {
    const rlsRes = await client.query(
      "select relrowsecurity from pg_class where relname = 'blog_posts'"
    );
    const isRls = rlsRes.rows?.[0]?.relrowsecurity === true;

    const polRes = await client.query(
      "select policyname, permissive, roles, cmd from pg_policies where schemaname = 'public' and tablename = 'blog_posts' order by policyname"
    );
    const policies = polRes.rows || [];
    const hasPublicRead = policies.some((p) => p.policyname === 'blog_posts_public_read');

    const report = {
      rlsEnabled: isRls,
      policies,
    };
    console.log('[verify-rls] Report:', JSON.stringify(report, null, 2));

    if (!isRls) {
      console.error('[verify-rls] RLS not enabled on blog_posts');
      process.exit(3);
    }
    if (!hasPublicRead) {
      console.error('[verify-rls] Policy blog_posts_public_read not found');
      process.exit(3);
    }
    console.log('[verify-rls] RLS verification passed');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[verify-rls] Failed:', err?.message || err);
  process.exit(1);
});
