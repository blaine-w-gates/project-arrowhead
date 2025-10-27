import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Billing Stub Endpoints
 * 
 * TODO: [ARCHITECT] Obsolete tests - Old individual-user billing system replaced by Team MVP billing
 * These tests use the old passwordless OTP authentication flow and old /account page.
 * Team MVP uses Supabase authentication and team-based billing (not individual user billing).
 * The billing endpoints tested here (/api/billing/checkout, /api/billing/portal, /api/stripe/webhook)
 * are stubs for the old individual-user product and will be replaced or modified for Team MVP.
 * Skipping until new E2E tests are written for Phase 3+ Team MVP billing features.
 */

test.describe.skip('Old Billing Tests (Obsolete - Individual User Billing)', () => {

// Helper function to authenticate a user and return cookies
async function authenticateUser(page: any, email: string) {
  // Sign in via OTP flow
  await page.goto('/signin');
  await page.getByLabel('Email').fill(email);
  
  const [requestResponse] = await Promise.all([
    page.waitForResponse((res: any) => res.url().endsWith('/api/auth/request') && res.request().method() === 'POST'),
    page.getByRole('button', { name: /send code/i }).click(),
  ]);

  type RequestJson = { success?: boolean; devCode?: string; error?: string };
  const json: RequestJson = await requestResponse.json().catch(() => ({} as RequestJson));
  const devCode = String(json.devCode || '').replace(/\D/g, '').slice(0, 8);
  expect(devCode).toMatch(/^\d{6,8}$/);

  // Verify OTP
  await page.goto('/verify');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Code').fill(devCode);
  
  const [verifyResponse] = await Promise.all([
    page.waitForResponse((res: any) => res.url().endsWith('/api/auth/verify') && res.request().method() === 'POST'),
    page.getByRole('button', { name: /verify/i }).click(),
  ]);
  
  expect(verifyResponse.status()).toBe(200);
  await expect(page.locator('#status')).toContainText('signed in');
}

// ============================================================================
// POST /api/billing/checkout Tests
// ============================================================================

test('POST /api/billing/checkout returns 401 when not authenticated', async ({ request }) => {
  const response = await request.post('/api/billing/checkout', {
    data: { priceId: 'price_test123' }
  });

  expect(response.status()).toBe(401);
  const body = await response.json();
  expect(body.success).toBe(false);
  expect(body.error).toContain('Not authenticated');
});

test('POST /api/billing/checkout returns 400 when priceId is missing', async ({ page, request }) => {
  const email = `e2e+${Date.now()}@example.com`;
  await authenticateUser(page, email);

  // Get the cookie from the page context
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find((c: any) => c.name === 'sb_session');
  expect(sessionCookie).toBeTruthy();

  // Make request with cookie but without priceId
  const response = await request.post('/api/billing/checkout', {
    headers: {
      'Cookie': `sb_session=${sessionCookie?.value}`
    },
    data: {}
  });

  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.success).toBe(false);
  expect(body.error).toContain('priceId');
});

test('POST /api/billing/checkout returns 400 when priceId is invalid type', async ({ page, request }) => {
  const email = `e2e+${Date.now()}@example.com`;
  await authenticateUser(page, email);

  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find((c: any) => c.name === 'sb_session');

  // Make request with invalid priceId type
  const response = await request.post('/api/billing/checkout', {
    headers: {
      'Cookie': `sb_session=${sessionCookie?.value}`
    },
    data: { priceId: 123 } // Should be string, not number
  });

  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.success).toBe(false);
  expect(body.error).toContain('priceId');
});

test('POST /api/billing/checkout returns Stripe Checkout URL when authenticated with valid priceId', async ({ page, request }) => {
  test.skip(!!process.env.E2E_SKIP_BILLING, 'Skipping billing tests in CI (Stripe secrets not configured)');
  const email = `e2e+${Date.now()}@example.com`;
  await authenticateUser(page, email);

  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find((c: any) => c.name === 'sb_session');

  const response = await request.post('/api/billing/checkout', {
    headers: {
      'Cookie': `sb_session=${sessionCookie?.value}`,
      'Content-Type': 'application/json'
    },
    data: { priceId: 'price_test123' }
  });

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.success).toBe(true);
  expect(body.url).toBeTruthy();
  expect(body.url).toContain('stripe.com');
});

// ============================================================================
// GET /api/billing/portal Tests
// ============================================================================

test('GET /api/billing/portal returns 401 when not authenticated', async ({ request }) => {
  const response = await request.get('/api/billing/portal');

  expect(response.status()).toBe(401);
  const body = await response.json();
  expect(body.success).toBe(false);
  expect(body.error).toContain('Not authenticated');
});

test('GET /api/billing/portal returns stub response when authenticated', async ({ page, request }) => {
  const email = `e2e+${Date.now()}@example.com`;
  await authenticateUser(page, email);

  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find((c: any) => c.name === 'sb_session');

  const response = await request.get('/api/billing/portal', {
    headers: {
      'Cookie': `sb_session=${sessionCookie?.value}`
    }
  });

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.success).toBe(true);
  expect(body.portalUrl).toBeTruthy();
  expect(body.portalUrl).toContain('stripe.com');
  expect(body.message).toContain('not yet implemented');
});

test('Manage Billing button calls /api/billing/portal and shows stub message', async ({ page }) => {
  const email = `e2e+${Date.now()}@example.com`;
  await authenticateUser(page, email);

  // Navigate to account page
  await page.goto('/account');
  await expect(page).toHaveURL(/\/account$/);

  // Set up dialog handler to capture alert
  page.on('dialog', async (dialog) => {
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toContain('not yet implemented');
    await dialog.accept();
  });

  // Click Manage Billing button
  const billingButton = page.getByRole('button', { name: /manage billing/i });
  await expect(billingButton).toBeVisible();
  await billingButton.click();

  // Wait a moment for the API call and alert to process
  await page.waitForTimeout(500);
});

// ============================================================================
// POST /api/stripe/webhook Tests
// ============================================================================

test('POST /api/stripe/webhook returns 200 acknowledgment', async ({ request }) => {
  // Webhook should accept POST requests without authentication
  // (In production, will verify Stripe signature instead)
  const response = await request.post('/api/stripe/webhook', {
    headers: {
      'Content-Type': 'application/json'
    },
    data: {
      id: 'evt_test_webhook',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_test123',
          customer: 'cus_test123',
          status: 'active'
        }
      }
    }
  });

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.received).toBe(true);
  expect(body.message).toContain('not yet implemented');
});

test('POST /api/stripe/webhook handles empty payload gracefully', async ({ request }) => {
  const response = await request.post('/api/stripe/webhook', {
    headers: {
      'Content-Type': 'application/json'
    },
    data: {}
  });

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.received).toBe(true);
});

test('POST /api/stripe/webhook accepts different event types', async ({ request }) => {
  const eventTypes = [
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_succeeded',
    'invoice.payment_failed'
  ];

  for (const eventType of eventTypes) {
    const response = await request.post('/api/stripe/webhook', {
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        id: `evt_test_${Date.now()}`,
        type: eventType,
        data: { object: {} }
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.received).toBe(true);
  }
});

}); // end test.describe.skip
