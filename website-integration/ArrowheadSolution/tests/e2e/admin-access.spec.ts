import { test, expect, request } from '@playwright/test';

/**
 * Production Cloudflare Access integration tests for /admin routes
 *
 * Pre-requisites (env):
 * - CF_ACCESS_CLIENT_ID: service token client id (with or without .access suffix)
 * - CF_ACCESS_CLIENT_SECRET: service token secret
 * - Optional: PLAYWRIGHT_PROD_BASE_URL (defaults to https://project-arrowhead.pages.dev)
 *
 * Notes:
 * - These tests run only against the 'prod-chromium' Playwright project.
 * - We verify the current behavior:
 *   - 200 with valid service token headers
 *   - Non-200 (401/403/302/307/308) without headers and with invalid headers
 * - Policy is currently using any_valid_service_token include rule; we cannot assert specific-token scoping yet.
 */

const PROD_BASE = process.env.PLAYWRIGHT_PROD_BASE_URL || 'https://project-arrowhead.pages.dev';

// Helper to skip prod-only tests when not running in the prod project
async function ensureProdProject(testInfo: any) {
  if (testInfo.project.name !== 'prod-chromium') {
    test.skip(true, 'Production-only test: run with --project=prod-chromium');
  }
}

// Helper to skip if CF Access env not set
function ensureAccessEnvOrSkip() {
  if (!process.env.CF_ACCESS_CLIENT_ID || !process.env.CF_ACCESS_CLIENT_SECRET) {
    test.skip(true, 'CF_ACCESS_CLIENT_ID/CF_ACCESS_CLIENT_SECRET not set');
  }
}

// Returns a new request context for fetching against production with optional headers
async function newProdRequestContext(extraHTTPHeaders?: Record<string, string>) {
  return await request.newContext({
    baseURL: PROD_BASE,
    extraHTTPHeaders,
  });
}

// Positive case: valid token can fetch admin assets
test('PROD Access: allows /admin with valid service token', async (_, testInfo) => {
  await ensureProdProject(testInfo);
  ensureAccessEnvOrSkip();

  const ctx = await newProdRequestContext({
    'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID!,
    'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET!,
  });
  try {
    const resp = await ctx.get('/admin/index.html', { maxRedirects: 0 });
    expect(resp.status(), 'index.html should be 200 with valid token').toBe(200);
    const body = await resp.text();
    expect(body).toMatch(/Decap CMS/i);

    const yml = await ctx.get('/admin/config.yml', { maxRedirects: 0 });
    expect(yml.status(), 'config.yml should be 200 with valid token').toBe(200);
    const ymlBody = await yml.text();
    expect(ymlBody).toContain('backend:');
    expect(ymlBody).toContain('collections:');
  } finally {
    await ctx.dispose();
  }
});

// Negative case: no headers -> should be blocked by Cloudflare Access
test('PROD Access: denies /admin without Access headers', async (_, testInfo) => {
  await ensureProdProject(testInfo);

  const ctx = await newProdRequestContext();
  try {
    const resp = await ctx.get('/admin/index.html', { maxRedirects: 0 });
    const status = resp.status();
    // Cloudflare may reply 401/403, or redirect to Access/SSO (30x)
    expect([401, 403, 302, 307, 308]).toContain(status);
  } finally {
    await ctx.dispose();
  }
});

// Negative case: invalid random token -> should be blocked
test('PROD Access: denies /admin with invalid token headers', async (_, testInfo) => {
  await ensureProdProject(testInfo);

  const ctx = await newProdRequestContext({
    'CF-Access-Client-Id': `invalid-${Date.now()}`,
    'CF-Access-Client-Secret': `invalid-${Math.random().toString(36).slice(2)}`,
  });
  try {
    const resp = await ctx.get('/admin/index.html', { maxRedirects: 0 });
    const status = resp.status();
    expect([401, 403, 302, 307, 308]).toContain(status);
  } finally {
    await ctx.dispose();
  }
});
