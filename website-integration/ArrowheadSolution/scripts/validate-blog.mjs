#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

function slugify(base) {
  return base
    .toLowerCase()
    .replace(/[^a-z0-9\-\s_]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const blogDir = path.join(root, 'content', 'blog');

  let entries;
  try {
    entries = await fs.readdir(blogDir, { withFileTypes: true });
  } catch (e) {
    console.warn(`[validate-blog] No blog directory found at ${blogDir}`);
    process.exit(0);
  }

  const mdFiles = entries.filter(e => e.isFile() && /\.(md|markdown)$/i.test(e.name));
  const issues = [];
  const slugs = new Set();

  for (const file of mdFiles) {
    const full = path.join(blogDir, file.name);
    const raw = await fs.readFile(full, 'utf-8');
    const parsed = matter(raw);
    const fm = parsed.data || {};

    const derivedSlug = fm.slug ? slugify(fm.slug) : slugify(path.basename(file.name, path.extname(file.name)));

    if (!fm.title || typeof fm.title !== 'string') {
      issues.push({ file: file.name, type: 'error', message: 'Missing required frontmatter: title' });
    }

    // warn on duplicate slugs
    if (slugs.has(derivedSlug)) {
      issues.push({ file: file.name, type: 'error', message: `Duplicate derived slug: ${derivedSlug}` });
    } else {
      slugs.add(derivedSlug);
    }

    // warn if publishedAt missing when published true (or default true)
    const published = typeof fm.published === 'boolean' ? fm.published : true;
    const publishedAt = fm.publishedAt || fm.date;
    if (published && !publishedAt) {
      issues.push({ file: file.name, type: 'warn', message: 'Missing publishedAt/date for published post' });
    }

    // basic content length check
    if (!parsed.content || parsed.content.trim().length < 50) {
      issues.push({ file: file.name, type: 'warn', message: 'Content is very short (<50 chars)' });
    }
  }

  if (issues.length === 0) {
    console.log('[validate-blog] All blog posts look good.');
    process.exit(0);
  }

  const errors = issues.filter(i => i.type === 'error');
  const warns = issues.filter(i => i.type === 'warn');
  for (const i of issues) {
    console.log(`[validate-blog] ${i.type.toUpperCase()} in ${i.file}: ${i.message}`);
  }
  // Exit non-zero only if blocking errors exist
  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('[validate-blog] Unexpected error:', err);
  process.exit(1);
});
