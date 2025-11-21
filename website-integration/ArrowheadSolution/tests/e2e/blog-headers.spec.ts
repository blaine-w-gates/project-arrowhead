import { test, expect } from '@playwright/test';

function ensureProd(testInfo: any, baseURL?: string) {
  if (testInfo.project.name !== 'prod-chromium') {
    test.skip(true, 'Skipping non-prod project');
  }
  if (!baseURL) {
    test.skip(true, 'No baseURL configured for prod project');
  }
}

// Blog posts list HEAD should include nosniff and HSTS
test.describe.skip('Blog headers & metadata', () => {
  test('PROD Blog posts HEAD headers', async ({ request, baseURL }, testInfo) => {
    ensureProd(testInfo, baseURL);
    const res = await request.fetch('/api/blog/posts', { method: 'HEAD' });
    expect([204, 200]).toContain(res.status());
    const h = res.headers();
    expect(h['x-content-type-options']).toBe('nosniff');
    expect((h['content-type'] || '').toLowerCase()).toContain('application/json');
    expect((h['strict-transport-security'] || '').toLowerCase()).toContain('max-age');
    // Caching on list endpoint should be public
    expect((h['cache-control'] || '').toLowerCase()).toContain('public');
  });
});

// Blog post slug HEAD should include nosniff and HSTS whether found (204) or not (404)
test('PROD Blog post slug HEAD headers', async ({ request, baseURL }, testInfo) => {
  ensureProd(testInfo, baseURL);
  const res = await request.fetch('/api/blog/posts/non-existent-slug', { method: 'HEAD' });
  expect([204, 404]).toContain(res.status());
  const h = res.headers();
  expect(h['x-content-type-options']).toBe('nosniff');
  expect((h['content-type'] || '').toLowerCase()).toContain('application/json');
  expect((h['strict-transport-security'] || '').toLowerCase()).toContain('max-age');
});
