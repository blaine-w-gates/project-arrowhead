#!/usr/bin/env node

import { fileURLToPath } from 'url';
import path from 'path';
import { eq } from 'drizzle-orm';
import { getDb, closeDb } from '../server/db.ts';
import { blogPosts, type InsertBlogPost } from '../shared/schema.ts';
import { FileBlogStorage } from '../server/fileStorage.ts';
import type { BlogPost } from '../shared/schema.ts';

async function restUpsertBlogPosts(posts: BlogPost[], supabaseUrl: string, serviceKey: string) {
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
}

// Idempotent seeding: insert-or-update by slug
async function run() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(__dirname, '..');
  const blogDir = path.resolve(repoRoot, 'content', 'blog');
  const fsReader = new FileBlogStorage(blogDir);

  const fsPosts: BlogPost[] = await fsReader.getBlogPosts();
  if (!fsPosts.length) {
    console.log('[seed-blog] No blog posts found on filesystem at:', blogDir);
    return;
  }

  // Prefer REST fallback if available (avoids IPv6-only TCP issues in CI)
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey) {
    await restUpsertBlogPosts(fsPosts, supabaseUrl, serviceKey);
    return;
  }

  const db = getDb();

  let inserted = 0;
  let updated = 0;

  for (const p of fsPosts) {
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

  console.log(`[seed-blog] Completed. Inserted: ${inserted}, Updated: ${updated}, Total processed: ${fsPosts.length}`);
  await closeDb();
}

run().catch(async (err) => {
  console.error('[seed-blog] Failed:', err?.message || err);
  try { await closeDb(); } catch {}
  process.exitCode = 1;
});
