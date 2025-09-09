#!/usr/bin/env node

import { fileURLToPath } from 'url';
import path from 'path';
import { writeFile } from 'fs/promises';
import { eq, inArray } from 'drizzle-orm';
import { getDb, closeDb } from '../server/db.ts';
import { blogPosts, type InsertBlogPost } from '../shared/schema.ts';
import { FileBlogStorage } from '../server/fileStorage.ts';
import type { BlogPost } from '../shared/schema.ts';

async function restUpsertBlogPosts(posts: BlogPost[], supabaseUrl: string, serviceKey: string): Promise<{ count: number, data: any[] }> {
  const base = supabaseUrl.replace(/\/$/, '');
  const url = `${base}/rest/v1/blog_posts?on_conflict=slug`;
  const rows = posts.map((p) => ({
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    content: p.content,
    image_url: p.imageUrl ?? null,
    published: !!p.published,
    published_at: p.publishedAt ? new Date(p.publishedAt).toISOString() : null,
  }));

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`REST upsert failed: ${res.status} ${res.statusText} - ${text}`);
  }
  const data = await res.json().catch(() => []);
  const count = Array.isArray(data) ? data.length : 0;
  console.log(`[seed-blog] REST upsert completed. Upserted: ${count}, Total processed: ${posts.length}`);
  return { count, data: Array.isArray(data) ? data : [] };
}

async function fetchRestPublishedSlugs(supabaseUrl: string, serviceKey: string): Promise<string[]> {
  const base = supabaseUrl.replace(/\/$/, '');
  const url = `${base}/rest/v1/blog_posts?select=slug&published=eq.true`;
  const res = await fetch(url, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`REST fetch published slugs failed: ${res.status} ${res.statusText} - ${text}`);
  }
  const arr = await res.json().catch(() => []);
  return Array.isArray(arr) ? arr.map((r: any) => r.slug).filter(Boolean) : [];
}

async function unpublishRestSlugs(slugs: string[], supabaseUrl: string, serviceKey: string): Promise<number> {
  if (!slugs.length) return 0;
  const base = supabaseUrl.replace(/\/$/, '');
  let changed = 0;
  for (const slug of slugs) {
    const url = `${base}/rest/v1/blog_posts?slug=eq.${encodeURIComponent(slug)}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ published: false, published_at: null }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`REST unpublish failed for slug ${slug}: ${res.status} ${res.statusText} - ${text}`);
    }
    changed += 1;
  }
  return changed;
}

// Idempotent seeding: insert-or-update by slug
async function run() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(__dirname, '..');
  const blogDir = path.resolve(repoRoot, 'content', 'blog');
  const fsReader = new FileBlogStorage(blogDir);

  const fsPosts: BlogPost[] = await fsReader.getBlogPosts();
  const publishedPosts: BlogPost[] = fsPosts.filter((p) => !!p.published);
  if (!publishedPosts.length) {
    console.log('[seed-blog] No published blog posts found on filesystem at:', blogDir);
    return;
  }

  // Prefer REST fallback if available (avoids IPv6-only TCP issues in CI)
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey) {
    const { count } = await restUpsertBlogPosts(publishedPosts, supabaseUrl, serviceKey);
    // Reconcile: unpublish DB rows that are no longer present in FS published set
    const fsSlugs = publishedPosts.map(p => p.slug);
    const dbPublishedSlugs = await fetchRestPublishedSlugs(supabaseUrl, serviceKey);
    const extras = dbPublishedSlugs.filter(s => !fsSlugs.includes(s));
    let unpublished = 0;
    if (extras.length) {
      unpublished = await unpublishRestSlugs(extras, supabaseUrl, serviceKey);
      console.log(`[seed-blog] Reconciled REST: unpublished extras ${unpublished} [${extras.join(', ')}]`);
    } else {
      console.log('[seed-blog] Reconciled REST: no extras to unpublish');
    }
    const report = {
      mode: 'rest',
      upserted: count,
      total: publishedPosts.length,
      unpublishedExtras: unpublished,
      unpublishedSlugs: extras,
      slugs: fsSlugs,
      timestamp: new Date().toISOString(),
    };
    await writeFile(path.join(repoRoot, 'seed-report.json'), JSON.stringify(report, null, 2));
    console.log('[seed-blog] Wrote seed-report.json');
    return;
  }

  const db = getDb();

  let inserted = 0;
  let updated = 0;

  for (const p of publishedPosts) {
    const value: InsertBlogPost = {
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      content: p.content,
      imageUrl: p.imageUrl ?? null,
      published: !!p.published,
      publishedAt: p.publishedAt ? new Date(p.publishedAt) : null,
    };

    // Try insert-only first; if conflict, do an explicit update with latest content
    const insertedRow = await db
      .insert(blogPosts)
      .values(value)
      .onConflictDoNothing({ target: blogPosts.slug })
      .returning({ id: blogPosts.id });

    if (insertedRow.length > 0) {
      inserted += 1;
      continue;
    }

    // Existing row: update it to ensure parity with FS
    await db
      .update(blogPosts)
      .set(value)
      .where(eq(blogPosts.slug, value.slug));

    updated += 1;
  }

  console.log(`[seed-blog] Completed. Inserted: ${inserted}, Updated: ${updated}, Total processed (published): ${publishedPosts.length}`);
  // Reconcile (DB mode): unpublish rows present in DB but not in FS
  const fsSlugs = publishedPosts.map(p => p.slug);
  const rows = await db.select({ slug: blogPosts.slug }).from(blogPosts).where(eq(blogPosts.published, true));
  const dbPublishedSlugs = rows.map(r => r.slug).filter(Boolean);
  const extras = dbPublishedSlugs.filter(s => !fsSlugs.includes(s));
  let unpublished = 0;
  if (extras.length) {
    await db.update(blogPosts)
      .set({ published: false, publishedAt: null })
      .where(inArray(blogPosts.slug, extras));
    unpublished = extras.length;
    console.log(`[seed-blog] Reconciled DB: unpublished extras ${unpublished} [${extras.join(', ')}]`);
  } else {
    console.log('[seed-blog] Reconciled DB: no extras to unpublish');
  }
  const report = {
    mode: 'db',
    inserted,
    updated,
    total: publishedPosts.length,
    unpublishedExtras: unpublished,
    unpublishedSlugs: extras,
    slugs: fsSlugs,
    timestamp: new Date().toISOString(),
  };
  await writeFile(path.join(repoRoot, 'seed-report.json'), JSON.stringify(report, null, 2));
  console.log('[seed-blog] Wrote seed-report.json');
  await closeDb();
}

run().catch(async (err) => {
  console.error('[seed-blog] Failed:', err?.message || err);
  try { await closeDb(); } catch {}
  process.exitCode = 1;
});
