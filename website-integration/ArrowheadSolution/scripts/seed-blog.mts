#!/usr/bin/env node

import { fileURLToPath } from 'url';
import path from 'path';
import { eq } from 'drizzle-orm';
import { getDb, closeDb } from '../server/db.ts';
import { blogPosts, type InsertBlogPost } from '../shared/schema.ts';
import { FileBlogStorage } from '../server/fileStorage.ts';
import type { BlogPost } from '../shared/schema.ts';

// Idempotent seeding: insert-or-update by slug
async function run() {
  const db = getDb();
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(__dirname, '..');
  const blogDir = path.resolve(repoRoot, 'content', 'blog');
  const fsReader = new FileBlogStorage(blogDir);

  const fsPosts: BlogPost[] = await fsReader.getBlogPosts();
  if (!fsPosts.length) {
    console.log('[seed-blog] No blog posts found on filesystem at:', blogDir);
    await closeDb();
    return;
  }

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
