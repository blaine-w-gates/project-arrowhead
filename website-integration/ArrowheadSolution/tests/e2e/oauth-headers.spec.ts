import { test, expect } from '@playwright/test';

// These tests are intended to run only against the production site via the prod-chromium project.
// They will automatically skip for non-prod projects.

function ensureProd(testInfo: any, baseURL?: string) {
  if (testInfo.project.name !== 'prod-chromium') {
    test.skip(true, 'Skipping non-prod project');
  }
  if (!baseURL) {
    test.skip(true, 'No baseURL configured for prod project');
  }
}

// 302 redirect to GitHub OAuth with hardened headers
test('PROD OAuth auth redirect headers (302)', async ({ request, baseURL }, testInfo) => {
  ensureProd(testInfo, baseURL);
  const res = await request.fetch('/api/oauth/auth', { method: 'GET', maxRedirects: 0 });
  expect(res.status()).toBe(302);
  const h = res.headers();
  expect(h['cache-control'] || '').toContain('no-store');
  expect(h['referrer-policy']).toBe('no-referrer');
  expect(h['x-content-type-options']).toBe('nosniff');
  expect((h['x-robots-tag'] || '')).toContain('noindex');
  expect((h['strict-transport-security'] || '').toLowerCase()).toContain('max-age');
  expect(h['location']).toMatch(/^https:\/\/github\.com\/login\/oauth\/authorize\?/);
});

// 204 HEAD with security headers for observability
test('PROD OAuth auth HEAD headers (204)', async ({ request, baseURL }, testInfo) => {
  ensureProd(testInfo, baseURL);
  const res = await request.fetch('/api/oauth/auth', { method: 'HEAD' });
  expect([204, 200]).toContain(res.status()); // Some environments may return 200
  const h = res.headers();
  expect(h['cache-control']).toContain('no-store');
  expect(h['referrer-policy']).toBe('no-referrer');
  expect(h['x-content-type-options']).toBe('nosniff');
  expect((h['x-robots-tag'] || '')).toContain('noindex');
  expect((h['strict-transport-security'] || '').toLowerCase()).toContain('max-age');
  expect((h['allow'] || '').toUpperCase()).toContain('GET');
  expect((h['allow'] || '').toUpperCase()).toContain('HEAD');
});

// 204 HEAD on callback with hardened headers
test('PROD OAuth callback HEAD security headers', async ({ request, baseURL }, testInfo) => {
  ensureProd(testInfo, baseURL);
  const res = await request.fetch('/api/oauth/callback', { method: 'HEAD' });
  expect([204, 200]).toContain(res.status());
  const h = res.headers();
  expect(h['cache-control']).toContain('no-store');
  expect(h['referrer-policy']).toBe('no-referrer');
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['x-frame-options']).toBe('DENY');
  expect((h['x-robots-tag'] || '')).toContain('noindex');
  // CSP presence (value may vary slightly across environments)
  expect(h['content-security-policy']).toBeTruthy();
  expect((h['strict-transport-security'] || '').toLowerCase()).toContain('max-age');
  expect((h['allow'] || '').toUpperCase()).toContain('GET');
  expect((h['allow'] || '').toUpperCase()).toContain('HEAD');
});
