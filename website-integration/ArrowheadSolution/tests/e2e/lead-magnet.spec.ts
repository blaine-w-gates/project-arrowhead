import { test, expect } from '@playwright/test';

const SITE = (process.env.PUBLIC_SITE_URL || 'https://project-arrowhead.pages.dev').replace(/\/$/, '');
const API = `${SITE}/api/lead-magnet`;

// These tests hit production Pages Functions. Ensure env vars are configured in Cloudflare.
// Run with: PLAYWRIGHT_NO_WEBSERVER=1 npx playwright test -g "PROD Lead Magnet API"

test.describe('PROD Lead Magnet API', () => {
  test('allows allowed origin and returns success true', async ({ request }) => {
    const email = `e2e-${Date.now()}@example.com`;
    const res = await request.post(API, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': SITE,
      },
      data: { email },
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ success: true });
  });

  test('rejects missing origin', async ({ request }) => {
    const res = await request.post(API, {
      headers: { 'Content-Type': 'application/json' },
      data: { email: `no-origin-${Date.now()}@example.com` },
    });
    expect(res.status()).toBe(403);
  });

  test('rejects invalid email with allowed origin', async ({ request }) => {
    const res = await request.post(API, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': SITE,
      },
      data: { email: 'not-an-email' },
    });
    expect(res.status()).toBe(400);
  });
});
