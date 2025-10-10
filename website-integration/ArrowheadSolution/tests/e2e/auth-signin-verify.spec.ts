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
  const devCodeRaw = json.devCode || '';
  // Some CI artifact captures show potential newline/formatting. Normalize to digits-only.
  const devCode = (devCodeRaw.match(/\d{6,8}/)?.[0] || '').slice(0, 8);
  expect(devCode, 'devCode should be 6-8 digits').toMatch(/^\d{6,8}$/);

  // Navigate to verify (via link on the page)
  await page.getByRole('link', { name: /verify here/i }).click();
  await expect(page.getByRole('heading', { name: 'Verify code' })).toBeVisible();

  // Fill verify form
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Code').fill(devCode);
  // Verify client-side validity so submit is not blocked by HTML5 validation
  await expect(async () => {
    const valid = await page.getByLabel('Code').evaluate((el: HTMLInputElement) => el.checkValidity());
    if (!valid) throw new Error('code input invalid');
  }).toPass();

  // Ensure the submit button is interactable and submit the form
  const verifyButton = page.getByRole('button', { name: /verify/i });
  await expect(verifyButton).toBeEnabled();
  await verifyButton.click();

  // UI reflects success
  await expect(page.locator('#status')).toContainText("signed in");

  // Cookie set
  const cookies = await context.cookies(baseURL);
  const session = cookies.find((c) => c.name === 'sb_session');
  expect(session?.value).toBeTruthy();
});
