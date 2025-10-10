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
  const devCode = json.devCode;
  expect(devCode, 'devCode should be exposed in E2E').toMatch(/^\d{6}$/);

  // Navigate to verify (via link on the page)
  await page.getByRole('link', { name: /verify here/i }).click();
  await expect(page.getByRole('heading', { name: 'Verify code' })).toBeVisible();

  // Fill verify form
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Code').fill(String(devCode));

  // Ensure the submit button is interactable
  await expect(page.getByRole('button', { name: /verify/i })).toBeEnabled();

  // Wait for both the request and the response to ensure we don't miss a fast response
  const waitVerifyRequest = page.waitForRequest((req) => req.url().endsWith('/api/auth/verify') && req.method() === 'POST');
  const waitVerifyResponse = page.waitForResponse((res) => res.url().endsWith('/api/auth/verify'));
  await page.getByRole('button', { name: /verify/i }).click();
  const verifyRequest = await waitVerifyRequest;
  const verifyResponse = await waitVerifyResponse;

  expect(verifyRequest, 'verify POST request should be sent').toBeTruthy();
  await expect(verifyResponse.ok(), 'verify response should be 2xx').toBeTruthy();

  // UI reflects success
  await expect(page.locator('#status')).toContainText("signed in");

  // Cookie set
  const cookies = await context.cookies(baseURL);
  const session = cookies.find((c) => c.name === 'sb_session');
  expect(session?.value).toBeTruthy();
});
