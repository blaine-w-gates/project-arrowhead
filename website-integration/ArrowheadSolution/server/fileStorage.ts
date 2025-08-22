import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { z } from "zod";
import { type BlogPost } from "@shared/schema";

// Zod schema for frontmatter validation
const frontmatterSchema = z.object({
  title: z.string().min(1, "title is required"),
  slug: z.string().min(1).optional(),
  excerpt: z.string().optional(),
  imageUrl: z.string().optional().nullable(),
  published: z.boolean().optional(),
  publishedAt: z.union([z.string(), z.date()]).optional(),
  date: z.union([z.string(), z.date()]).optional(), // alias commonly used
});

function safeParseDate(input?: string | Date | null): Date | null {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

function slugify(base: string): string {
  return base
    .toLowerCase()
    .replace(/[^a-z0-9\-\s_]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Deterministic 32-bit FNV-1a hash for slug -> positive number id
function slugToId(slug: string): number {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < slug.length; i++) {
    hash ^= slug.charCodeAt(i);
    // hash *= FNV prime (with 32-bit overflow behavior)
    hash = (hash + (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)) >>> 0;
  }
  // Ensure non-negative 32-bit integer
  return hash >>> 0;
}

export class FileBlogStorage {
  private blogDir: string;

  constructor(baseDir?: string) {
    // Default to ../content/blog relative to this file
    this.blogDir = baseDir ?? path.resolve(import.meta.dirname, "..", "content", "blog");
  }

  private async readOneMarkdown(filePath: string, fileName: string): Promise<BlogPost | null> {
    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) return null;

      const raw = await fs.readFile(filePath, "utf-8");
      const parsed = matter(raw);

      const fmParsed = frontmatterSchema.safeParse(parsed.data ?? {});
      if (!fmParsed.success) {
        console.warn(`Skipping malformed frontmatter in ${fileName}:`, fmParsed.error?.errors);
        return null;
      }

      const fm = fmParsed.data;

      // Derive slug from frontmatter or filename
      const fromName = slugify(path.basename(fileName, path.extname(fileName)));
      const slug = (fm.slug ? slugify(fm.slug) : fromName) || fromName;

      const id = slugToId(slug);

      const published = fm.published ?? true; // default publish on if not specified

      // Handle dates from multiple possible fields
      const publishedAt = safeParseDate(fm.publishedAt ?? fm.date) ?? (published ? stat.mtime : null);
      const createdAt = stat.birthtime?.getTime() ? stat.birthtime : stat.mtime;

      // Build excerpt if missing (strip basic markdown tokens)
      const plain = parsed.content
        .replace(/`{1,3}[^`]*`{1,3}/g, " ") // inline code blocks
        .replace(/[#>*_\[\]()`]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const excerpt = (fm.excerpt ?? plain.slice(0, 200).trim()).trim();

      const post: BlogPost = {
        id,
        title: fm.title,
        slug,
        excerpt,
        content: parsed.content, // raw markdown; client handles rendering/sanitization
        imageUrl: fm.imageUrl ?? null,
        published,
        publishedAt,
        createdAt,
      } as BlogPost;

      return post;
    } catch (err) {
      console.warn(`Skipping file due to error: ${fileName}`, err);
      return null;
    }
  }

  async getBlogPosts(): Promise<BlogPost[]> {
    try {
      const entries = await fs.readdir(this.blogDir, { withFileTypes: true });
      const mdFiles = entries.filter(e => e.isFile() && /\.(md|markdown)$/i.test(e.name));

      const posts: BlogPost[] = [];
      for (const file of mdFiles) {
        const full = path.join(this.blogDir, file.name);
        const post = await this.readOneMarkdown(full, file.name);
        if (post && post.published) posts.push(post);
      }

      // Sort newest first by publishedAt
      posts.sort((a, b) => (b.publishedAt?.getTime() || 0) - (a.publishedAt?.getTime() || 0));
      return posts;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        // Directory doesn't exist: treat as no posts
        return [];
      }
      console.error("Failed to read blog posts directory:", err);
      return [];
    }
  }

  async getBlogPost(slug: string): Promise<BlogPost | undefined> {
    const posts = await this.getBlogPosts();
    return posts.find(p => p.slug === slug);
  }
}
