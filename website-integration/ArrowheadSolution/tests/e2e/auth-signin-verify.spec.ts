import { test, expect } from '@playwright/test';

// Happy path: user requests OTP on /signin and verifies on /verify
// Assumes dev server started by Playwright with E2E_EXPOSE_OTP=1 so /api/auth/request returns { devCode }

test('Passwordless sign-in: /signin -> /verify happy path', async ({ page, context, baseURL }) => {
  const email = `e2e+${Date.now()}@example.com`;

  // Go to Sign In
  await page.goto('/signin');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  // Fill email and send request
  await page.getByLabel('Email').fill(email);
  const [requestResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().endsWith('/api/auth/request') && res.request().method() === 'POST'),
    page.getByRole('button', { name: /send code/i }).click(),
  ]);

  type RequestJson = { success?: boolean; devCode?: string; error?: string };
  const json: RequestJson = await requestResponse.json().catch(() => ({} as RequestJson));
  // Normalize to digits-only in case of newlines or other chars in CI capture
  const devCode = String(json.devCode || '').replace(/\D/g, '').slice(0, 8);
  expect(devCode, 'devCode should be 6-8 digits').toMatch(/^\d{6,8}$/);

  // Navigate directly to verify page
  await page.goto('/verify');
  await expect(page.getByRole('heading', { name: 'Verify code' })).toBeVisible();

  // Fill verify form
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Code').fill(devCode);
  // Submit and wait for the verify API response
  const verifyButton = page.getByRole('button', { name: /verify/i });
  await expect(verifyButton).toBeEnabled();
  const [verifyResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().endsWith('/api/auth/verify') && res.request().method() === 'POST'),
    verifyButton.click(),
  ]);
  await expect(verifyResponse.ok(), 'verify response should be 2xx').toBeTruthy();

  // UI reflects success
  await expect(page.locator('#status')).toContainText('signed in');

  // Cookie set
  const cookies = await context.cookies(baseURL);
  const session = cookies.find((c) => c.name === 'sb_session');
  expect(session?.value).toBeTruthy();
});
