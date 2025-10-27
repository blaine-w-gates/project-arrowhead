import { test, expect } from '@playwright/test';

// TODO: [ARCHITECT] Obsolete tests - Old passwordless OTP auth system replaced by Supabase email/password auth
// The /account page and old authentication flow (signin -> request OTP -> verify) no longer exist.
// Team MVP uses Supabase authentication with /signin (email/password) and /dashboard routes.
// These tests need to be rewritten for the new Supabase auth flow and Team MVP dashboard.
// Skipping until new E2E tests are written for Phase 3+ Team MVP features.

test.describe.skip('Old Account Page Tests (Obsolete - Passwordless Auth)', () => {

// Test 1: Account guard - unauthenticated users redirected to /signin
test('/account redirects to /signin when not authenticated', async ({ page, context: _context, baseURL: _baseURL }) => {
  await page.goto('/account');
  
  // Should redirect to signin
  await expect(page).toHaveURL(/\/signin$/);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

// Test 2: Happy path - authenticated user sees account page
test('Authenticated user can view /account page', async ({ page, context: _context, baseURL: _baseURL }) => {
  const email = `e2e+${Date.now()}@example.com`;

  // Step 1: Sign in via OTP flow
  await page.goto('/signin');
  await page.getByLabel('Email').fill(email);
  const [requestResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().endsWith('/api/auth/request') && res.request().method() === 'POST'),
    page.getByRole('button', { name: /send code/i }).click(),
  ]);

  type RequestJson = { success?: boolean; devCode?: string; error?: string };
  const json: RequestJson = await requestResponse.json().catch(() => ({} as RequestJson));
  const devCode = String(json.devCode || '').replace(/\D/g, '').slice(0, 8);
  expect(devCode, 'devCode should be 6-8 digits').toMatch(/^\d{6,8}$/);

  // Step 2: Verify OTP
  await page.goto('/verify');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Code').fill(devCode);
  const verifyButton = page.getByRole('button', { name: /verify/i });
  await expect(verifyButton).toBeEnabled();
  
  // Wait for verify response to complete (cookie is set in response)
  const [verifyResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().endsWith('/api/auth/verify') && res.request().method() === 'POST'),
    verifyButton.click(),
  ]);
  
  // Verify the response was successful
  expect(verifyResponse.status()).toBe(200);
  
  // Wait for success message
  await expect(page.locator('#status')).toContainText('signed in');

  // Step 3: Navigate to account page
  await page.goto('/account');
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible();

  // Verify user email is displayed
  await expect(page.getByText(email)).toBeVisible();

  // Verify subscription section exists
  await expect(page.getByText('Subscription')).toBeVisible();
  await expect(page.getByText(/status/i)).toBeVisible();

  // Verify Manage Billing button exists
  await expect(page.getByRole('button', { name: /manage billing/i })).toBeVisible();

  // Verify Logout button exists
  await expect(page.getByRole('button', { name: /logout/i })).toBeVisible();
});

// Test 3: Logout clears session and redirects to /signin
test('Logout button clears cookie and redirects to /signin', async ({ page, context, baseURL }) => {
  const email = `e2e+${Date.now()}@example.com`;

  // Step 1: Sign in via OTP flow
  await page.goto('/signin');
  await page.getByLabel('Email').fill(email);
  const [requestResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().endsWith('/api/auth/request') && res.request().method() === 'POST'),
    page.getByRole('button', { name: /send code/i }).click(),
  ]);

  type RequestJson = { success?: boolean; devCode?: string; error?: string };
  const json: RequestJson = await requestResponse.json().catch(() => ({} as RequestJson));
  const devCode = String(json.devCode || '').replace(/\D/g, '').slice(0, 8);
  expect(devCode).toMatch(/^\d{6,8}$/);

  // Step 2: Verify OTP
  await page.goto('/verify');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Code').fill(devCode);
  
  // Wait for verify response to complete (cookie is set in response)
  const [verifyResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().endsWith('/api/auth/verify') && res.request().method() === 'POST'),
    page.getByRole('button', { name: /verify/i }).click(),
  ]);
  
  expect(verifyResponse.status()).toBe(200);
  await expect(page.locator('#status')).toContainText('signed in');

  // Step 3: Verify session cookie exists
  const cookiesBefore = await context.cookies(baseURL);
  const sessionBefore = cookiesBefore.find((c) => c.name === 'sb_session');
  expect(sessionBefore?.value).toBeTruthy();

  // Step 4: Navigate to account and logout
  await page.goto('/account');
  await expect(page).toHaveURL(/\/account$/);
  
  await page.getByRole('button', { name: /logout/i }).click();

  // Should redirect to /signin
  await expect(page).toHaveURL(/\/signin$/);

  // Step 5: Verify session cookie is cleared
  const cookiesAfter = await context.cookies(baseURL);
  const sessionAfter = cookiesAfter.find((c) => c.name === 'sb_session');
  expect(sessionAfter?.value || '').toBe('');

  // Step 6: Verify /account is now protected again
  await page.goto('/account');
  await expect(page).toHaveURL(/\/signin$/);
});

}); // end test.describe.skip
