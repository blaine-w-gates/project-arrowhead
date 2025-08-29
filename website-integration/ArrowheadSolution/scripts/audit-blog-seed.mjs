#!/usr/bin/env node
import { fileURLToPath } from 'url';
import path from 'path';
import { readdir, readFile, writeFile } from 'fs/promises';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const blogDir = path.resolve(repoRoot, 'content', 'blog');

async function getFsSlugs() {
  const files = await readdir(blogDir, { withFileTypes: true });
  const slugs = [];
  for (const f of files) {
    if (!f.isFile()) continue;
    if (!/\.(md|mdx)$/i.test(f.name)) continue;
    const p = path.join(blogDir, f.name);
    const txt = await readFile(p, 'utf8');
    const fm = matter(txt);
    const isPublished = !!fm.data?.published;
    if (!isPublished) continue; // published-only policy
    const slug = (fm.data?.slug || f.name.replace(/\.(md|mdx)$/i, '')).toString();
    slugs.push(slug);
  }
  slugs.sort();
  return slugs;
}

async function getDbSlugs() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { slugs: null, note: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' };
  }
  const url = `${supabaseUrl}/rest/v1/blog_posts?select=slug&published=eq.true`;
  const res = await fetch(url, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`REST fetch failed: ${res.status} ${res.statusText} - ${text}`);
  }
  const arr = await res.json();
  const slugs = Array.isArray(arr) ? arr.map((r) => r.slug).filter(Boolean).sort() : [];
  return { slugs };
}

function diff(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  const onlyA = a.filter((x) => !B.has(x));
  const onlyB = b.filter((x) => !A.has(x));
  return { onlyA, onlyB };
}

(async () => {
  const fsSlugs = await getFsSlugs();
  const dbResp = await getDbSlugs();
  const dbSlugs = dbResp.slugs;

  const report = {
    mode: 'audit',
    timestamp: new Date().toISOString(),
    note: dbResp.note || undefined,
    counts: { fs: fsSlugs.length, db: dbSlugs ? dbSlugs.length : null },
    drift: dbSlugs ? diff(fsSlugs, dbSlugs) : null,
  };

  await writeFile(path.join(repoRoot, 'seed-audit.json'), JSON.stringify(report, null, 2));
  console.log('[audit-blog-seed] Wrote seed-audit.json');

  if (dbSlugs && (report.drift.onlyA.length || report.drift.onlyB.length)) {
    console.error('[audit-blog-seed] Drift detected');
    console.error('Only in FS:', report.drift.onlyA);
    console.error('Only in DB:', report.drift.onlyB);
    process.exitCode = 2; // signal drift
  }
})();
