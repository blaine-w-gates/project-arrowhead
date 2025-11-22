import { test, expect } from '@playwright/test';

// HEAD health + caching metadata for blog APIs
// These should work in dev and prod (functions return 204 on success, some platforms may return 200)

test.describe.skip('Blog API HEAD endpoints', () => {
  test('HEAD /api/blog/posts returns 200/204 and caching headers', async ({ request }) => {
    const res = await request.head('/api/blog/posts');
    expect([200, 204]).toContain(res.status());
    const url = res.url();
    const isLocal = /localhost|127\.0\.0\.1/.test(url);
    const cc = (res.headers()['cache-control'] || '').toLowerCase();
    if (isLocal) {
      // Local dev server may not run CF Functions; Cache-Control may be missing
      expect(cc === '' || cc.includes('max-age') || cc.includes('s-maxage')).toBeTruthy();
    } else {
      // In prod, accept either our s-maxage or platform default max-age=0
      expect(cc.includes('s-maxage') || cc.includes('max-age=0')).toBeTruthy();
      const nosniff = (res.headers()['x-content-type-options'] || '').toLowerCase();
      expect(nosniff).toContain('nosniff');
    }
  });

  test('HEAD /api/blog/posts/[slug] returns 200/204 and caching headers', async ({ request }) => {
    // Use a known published slug; align with blog.spec.ts detailSlug
    const slug = 'beyond-the-buzzwords';
    const res = await request.head(`/api/blog/posts/${slug}`);
    expect([200, 204]).toContain(res.status());
    const url = res.url();
    const isLocal = /localhost|127\.0\.0\.1/.test(url);
    const cc = (res.headers()['cache-control'] || '').toLowerCase();
    if (isLocal) {
      expect(cc === '' || cc.includes('max-age') || cc.includes('s-maxage')).toBeTruthy();
    } else {
      expect(cc.includes('s-maxage') || cc.includes('max-age=0')).toBeTruthy();
      const nosniff = (res.headers()['x-content-type-options'] || '').toLowerCase();
      expect(nosniff).toContain('nosniff');
    }
  });
});
