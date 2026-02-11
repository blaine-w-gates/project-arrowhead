import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileBlogStorage } from '../../server/fileStorage';
import fs from 'fs/promises';

// Mock fs/promises
vi.mock('fs/promises');

describe('FileBlogStorage', () => {
  let storage: FileBlogStorage;
  const mockBlogDir = '/mock/content/blog';

  beforeEach(() => {
    vi.resetAllMocks();
    storage = new FileBlogStorage(mockBlogDir);
  });

  it('should return empty array if directory does not exist', async () => {
    const error = new Error('ENOENT');
    (error as any).code = 'ENOENT';
    vi.mocked(fs.readdir).mockRejectedValue(error);

    const posts = await storage.getBlogPosts();
    expect(posts).toEqual([]);
  });

  it('should read and parse blog posts sorted by date (newest first)', async () => {
    // Mock directory entries
    const files = [
      { name: 'older.md', isFile: () => true },
      { name: 'newer.md', isFile: () => true },
      { name: 'not-a-markdown.txt', isFile: () => true },
      { name: 'folder', isFile: () => false },
    ] as any[];

    vi.mocked(fs.readdir).mockResolvedValue(files);

    // Mock stat (needed for modification time fallback, though we use frontmatter date here)
    vi.mocked(fs.stat).mockResolvedValue({
      isFile: () => true,
      mtime: new Date('2023-01-01'),
      birthtime: new Date('2023-01-01'),
    } as any);

    // Mock readFile content
    vi.mocked(fs.readFile).mockImplementation(async (filePath: string | Buffer | URL, _options?: any) => {
      const strPath = filePath.toString();
      if (strPath.endsWith('older.md')) {
        return `---
title: Older Post
date: 2023-01-01
published: true
---
Older content`;
      }
      if (strPath.endsWith('newer.md')) {
        return `---
title: Newer Post
date: 2023-02-01
published: true
---
Newer content`;
      }
      return '';
    });

    const posts = await storage.getBlogPosts();

    // Should filter out non-md files and folders
    expect(posts).toHaveLength(2);

    // Check sorting: Newer (Feb 1) before Older (Jan 1)
    expect(posts[0].title).toBe('Newer Post');
    expect(posts[1].title).toBe('Older Post');
  });

  it('should filter out unpublished posts', async () => {
    const files = [
      { name: 'published.md', isFile: () => true },
      { name: 'draft.md', isFile: () => true },
    ] as any[];

    vi.mocked(fs.readdir).mockResolvedValue(files);

    vi.mocked(fs.stat).mockResolvedValue({
      isFile: () => true,
      mtime: new Date(),
      birthtime: new Date(),
    } as any);

    vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
      const strPath = filePath.toString();
      if (strPath.endsWith('published.md')) {
        return `---
title: Published
date: 2023-01-01
published: true
---
Content`;
      }
      if (strPath.endsWith('draft.md')) {
        return `---
title: Draft
date: 2023-01-02
published: false
---
Content`;
      }
      return '';
    });

    const posts = await storage.getBlogPosts();
    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe('Published');
  });

  it('should handle malformed frontmatter gracefully', async () => {
    const files = [
      { name: 'good.md', isFile: () => true },
      { name: 'bad.md', isFile: () => true },
    ] as any[];

    vi.mocked(fs.readdir).mockResolvedValue(files);
    vi.mocked(fs.stat).mockResolvedValue({
      isFile: () => true,
      mtime: new Date(),
      birthtime: new Date(),
    } as any);

    vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
      const strPath = filePath.toString();
      if (strPath.endsWith('good.md')) {
        return `---
title: Good
date: 2023-01-01
---
Content`;
      }
      if (strPath.endsWith('bad.md')) {
        // Missing title, which is required by schema
        return `---
date: 2023-01-01
---
Content`;
      }
      return '';
    });

    // Suppress console.warn for this test
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const posts = await storage.getBlogPosts();

    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe('Good');

    consoleSpy.mockRestore();
  });
});
