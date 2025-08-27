import { test, expect } from '@playwright/test';

function ensureProd(testInfo: any, baseURL?: string) {
  if (testInfo.project.name !== 'prod-chromium') {
    test.skip(true, 'Skipping non-prod project');
  }
  if (!baseURL) {
    test.skip(true, 'No baseURL configured for prod project');
  }
}

// Lead Magnet HEAD: ensure security headers, no content
test('PROD Lead Magnet HEAD headers', async ({ request, baseURL }, testInfo) => {
  ensureProd(testInfo, baseURL);
  const res = await request.fetch('/api/lead-magnet', { method: 'HEAD' });
  expect([204, 200]).toContain(res.status());
  const h = res.headers();
  expect(h['x-content-type-options']).toBe('nosniff');
  expect((h['cache-control'] || '').toLowerCase()).toContain('no-store');
  expect((h['x-robots-tag'] || '').toLowerCase()).toContain('noindex');
  expect((h['strict-transport-security'] || '').toLowerCase()).toContain('max-age');
  expect((h['allow'] || '').toUpperCase()).toContain('POST');
  expect((h['allow'] || '').toUpperCase()).toContain('HEAD');
});

// Lead Magnet OPTIONS: ensure security headers and advertised methods
test('PROD Lead Magnet preflight OPTIONS headers', async ({ request, baseURL }, testInfo) => {
  ensureProd(testInfo, baseURL);
  const res = await request.fetch('/api/lead-magnet', { method: 'OPTIONS' });
  expect(res.status()).toBe(204);
  const h = res.headers();
  expect(h['x-content-type-options']).toBe('nosniff');
  expect((h['cache-control'] || '').toLowerCase()).toContain('no-store');
  expect((h['x-robots-tag'] || '').toLowerCase()).toContain('noindex');
  expect((h['strict-transport-security'] || '').toLowerCase()).toContain('max-age');
  expect((h['allow'] || '').toUpperCase()).toContain('POST');
  expect((h['allow'] || '').toUpperCase()).toContain('HEAD');
});

// Lead Magnet GET should be disallowed (405) and still include security headers
test('PROD Lead Magnet GET is 405 with security headers', async ({ request, baseURL }, testInfo) => {
  ensureProd(testInfo, baseURL);
  const res = await request.fetch('/api/lead-magnet', { method: 'GET', maxRedirects: 0 });
  expect(res.status()).toBe(405);
  const h = res.headers();
  expect(h['x-content-type-options']).toBe('nosniff');
  expect((h['cache-control'] || '').toLowerCase()).toContain('no-store');
  expect((h['x-robots-tag'] || '').toLowerCase()).toContain('noindex');
  expect((h['strict-transport-security'] || '').toLowerCase()).toContain('max-age');
  const allow = (h['allow'] || '').toUpperCase();
  expect(allow).toContain('POST');
  expect(allow).toContain('OPTIONS');
  expect(allow).toContain('HEAD');
});
