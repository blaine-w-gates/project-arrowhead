#!/usr/bin/env node
import { fileURLToPath } from 'url';
import path from 'path';
import { writeFile } from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

function headersFor(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

async function getArray(url, key) {
  const res = await fetch(url, { headers: headersFor(key) });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GET ${url} -> ${res.status} ${res.statusText} - ${text}`);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON from ${url}`);
  }
  if (!Array.isArray(data)) {
    throw new Error(`Expected array from ${url}`);
  }
  return data;
}

async function main() {
  const baseUrl = requireEnv('SUPABASE_URL').replace(/\/$/, '');
  const anonKey = requireEnv('SUPABASE_ANON_KEY');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const publishedUrl = `${baseUrl}/rest/v1/blog_posts?select=slug`;
  const draftsUrl = `${baseUrl}/rest/v1/blog_posts?select=slug&published=eq.false`;

  const report = {
    mode: 'verify-rls-rest',
    timestamp: new Date().toISOString(),
    checks: {},
    pass: false,
    messages: [],
  };

  // Anon checks
  const anonPublished = await getArray(publishedUrl, anonKey);
  const anonDrafts = await getArray(draftsUrl, anonKey);
  report.checks.anonPublishedCount = anonPublished.length;
  report.checks.anonDraftsCount = anonDrafts.length;

  if (anonDrafts.length !== 0) {
    report.messages.push('Anon user can see drafts (published=false). This violates public-read policy.');
  }

  // Service role check on drafts path
  let serviceDrafts = [];
  try {
    serviceDrafts = await getArray(draftsUrl, serviceKey);
  } catch (e) {
    report.messages.push('Service role request to drafts endpoint failed: ' + e.message);
  }
  report.checks.serviceDraftsCount = serviceDrafts.length;

  // Pass criteria: anonDrafts must be zero; published fetch must succeed
  const pass = anonDrafts.length === 0 && Array.isArray(anonPublished);
  report.pass = pass;
  if (pass) {
    report.messages.push('RLS verified via REST: anon cannot see drafts; published endpoint accessible.');
  }

  const outPath = path.join(repoRoot, 'verify-rls-rest.json');
  await writeFile(outPath, JSON.stringify(report, null, 2));
  console.log('[verify-rls-rest] Wrote', outPath);

  if (!pass) process.exit(3);
}

main().catch((err) => {
  console.error('[verify-rls-rest] Failed:', err?.message || err);
  process.exit(1);
});
