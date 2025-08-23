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

function safeDate(input) {
  if (!input) return null;
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

// Deterministic 32-bit FNV-1a hash for slug -> positive number id
function slugToId(slug) {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < slug.length; i++) {
    hash ^= slug.charCodeAt(i);
    hash = (hash + (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)) >>> 0;
  }
  return hash >>> 0;
}

async function readPosts(root) {
  const blogDir = path.join(root, 'content', 'blog');
  let entries;
  try {
    entries = await fs.readdir(blogDir, { withFileTypes: true });
  } catch (e) {
    return [];
  }
  const mdFiles = entries.filter(e => e.isFile() && /\.(md|markdown)$/i.test(e.name));
  const posts = [];
  for (const file of mdFiles) {
    try {
      const full = path.join(blogDir, file.name);
      const raw = await fs.readFile(full, 'utf-8');
      const parsed = matter(raw);
      const fm = parsed.data || {};
      const published = typeof fm.published === 'boolean' ? fm.published : true;
      if (!published) continue;
      const fromName = slugify(path.basename(file.name, path.extname(file.name)));
      const slug = fm.slug ? slugify(fm.slug) : fromName;
      const publishedAt = safeDate(fm.publishedAt || fm.date) || new Date();
      const title = fm.title || slug;
      const excerpt = (fm.excerpt || '').toString();
      const post = {
        id: slugToId(slug),
        title,
        slug,
        excerpt,
        content: parsed.content || '',
        imageUrl: fm.imageUrl ?? null,
        published: true,
        publishedAt,
        createdAt: publishedAt,
      };
      posts.push(post);
    } catch {
      // skip bad files
    }
  }
  posts.sort((a, b) => (b.publishedAt?.getTime() || 0) - (a.publishedAt?.getTime() || 0));
  return posts;
}

function buildSitemap(posts, baseUrl) {
  const urls = posts.map(p => {
    const lastmod = (p.publishedAt || new Date()).toISOString();
    const loc = baseUrl ? `${baseUrl}/blog/${p.slug}` : `/blog/${p.slug}`;
    return `\n  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}\n</urlset>\n`;
}

function buildRss(posts, baseUrl) {
  const items = posts.map(p => {
    const pub = (p.publishedAt || new Date()).toUTCString();
    const link = baseUrl ? `${baseUrl}/blog/${p.slug}` : `/blog/${p.slug}`;
    const safeTitle = p.title.replace(/]]>/g, ']]');
    const safeExcerpt = (p.excerpt || '').replace(/]]>/g, ']]');
    return `\n  <item>\n    <title><![CDATA[${safeTitle}]]></title>\n    <link>${link}</link>\n    <guid>${link}</guid>\n    <pubDate>${pub}</pubDate>\n    <description><![CDATA[${safeExcerpt}]]></description>\n  </item>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n  <title>Strategic Insights Blog</title>\n  <link>${baseUrl || '/blog'}</link>\n  <description>Expert advice on business strategy and planning</description>\n  <language>en-us</language>\n  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}\n</channel>\n</rss>\n`;
}

async function writeIfChanged(filePath, content) {
  try {
    const cur = await fs.readFile(filePath, 'utf-8');
    if (cur === content) return;
  } catch {}
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}

async function main() {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const baseUrl = process.env.PUBLIC_SITE_URL || '';
  const posts = await readPosts(root);

  const sitemap = buildSitemap(posts, baseUrl);
  const rss = buildRss(posts, baseUrl);

  const outDir = path.join(root, 'client', 'public');
  await writeIfChanged(path.join(outDir, 'sitemap.xml'), sitemap);
  await writeIfChanged(path.join(outDir, 'rss.xml'), rss);
  console.log('[generate-seo] Wrote sitemap.xml and rss.xml to client/public');

  // Emit JSON API compatible with Cloudflare Pages Functions
  // List: /data/blog/posts.json
  // Item: /data/blog/posts/<slug>.json
  const dataDir = path.join(outDir, 'data', 'blog', 'posts');
  const postsList = posts.map(p => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    imageUrl: p.imageUrl ?? null,
    published: true,
    publishedAt: p.publishedAt ? new Date(p.publishedAt).toISOString() : null,
    createdAt: p.publishedAt ? new Date(p.publishedAt).toISOString() : null,
    // content omitted in list for efficiency
    content: undefined,
  }));
  await writeIfChanged(path.join(outDir, 'data', 'blog', 'posts.json'), JSON.stringify(postsList, null, 2));

  for (const p of posts) {
    const itemPath = path.join(dataDir, `${p.slug}.json`);
    const item = {
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      content: p.content || '',
      imageUrl: p.imageUrl ?? null,
      published: true,
      publishedAt: p.publishedAt ? new Date(p.publishedAt).toISOString() : null,
      createdAt: p.publishedAt ? new Date(p.publishedAt).toISOString() : null,
    };
    await writeIfChanged(itemPath, JSON.stringify(item, null, 2));
  }
  console.log('[generate-seo] Wrote blog JSON to client/public/data/blog');
}

main().catch((e) => {
  console.error('[generate-seo] Error:', e);
  process.exit(1);
});
