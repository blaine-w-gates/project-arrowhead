#!/usr/bin/env node
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

async function main() {
  const migrationPath = path.resolve(repoRoot, 'drizzle', 'migrations', '0001_blog_posts_rls.sql');
  const sql = await fs.readFile(migrationPath, 'utf8');

  const raw = process.env.DATABASE_URL;
  if (!raw) {
    console.error('[apply-rls] DATABASE_URL is not set');
    process.exit(1);
  }

  const original = new URL(raw);
  const servername = original.hostname; // preserve SNI
  const hostOverride = process.env.PGHOSTADDR || process.env.DB_HOST_IPV4;

  let effective = raw;
  if (hostOverride) {
    const u = new URL(raw);
    u.hostname = hostOverride;
    if (!u.searchParams.has('sslmode')) u.searchParams.set('sslmode', 'require');
    effective = u.toString();
  }

  const client = new pg.Client({
    connectionString: effective,
    ssl: { rejectUnauthorized: true, servername },
  });

  console.log('[apply-rls] Connecting with IPv4 override:', !!hostOverride);
  await client.connect();
  try {
    await client.query(sql);
    console.log('[apply-rls] RLS migration applied successfully');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[apply-rls] Failed:', err?.message || err);
  process.exit(1);
});
