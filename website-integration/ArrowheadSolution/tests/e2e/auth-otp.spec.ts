import { test, expect } from '@playwright/test';

const emailForTest = () => `e2e+${Date.now()}@example.com`;

test('OTP sign-in happy path', async ({ page, context, baseURL }) => {
  const email = emailForTest();

  // Go to Sign In
  await page.goto(`${baseURL || ''}/signin`);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  // Fill email and submit
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send code' }).click();

  // Expect success message and capture dev code (test mode)
  await expect(page.getByText('Check your email for a verification code.')).toBeVisible();
  const devCodeEl = page.locator('[data-testid="dev-code"]');
  const hasDevCode = await devCodeEl.count();
  let code = '';
  if (hasDevCode) {
    const txt = await devCodeEl.textContent();
    code = (txt || '').replace(/[^0-9]/g, '').slice(0, 8);
  }

  // Navigate to Verify
  await page.getByRole('button', { name: 'Enter code' }).click();
  await expect(page.getByRole('heading', { name: 'Verify code' })).toBeVisible();

  // If code wasn't present in session, fill it; always fill email explicitly
  await page.getByLabel('Email').fill(email);
  if (code) {
    await page.getByLabel('Code').fill(code);
  }
  await page.getByRole('button', { name: 'Verify' }).click();

  await expect(page.getByText("You're signed in.")).toBeVisible();

  // Assert HttpOnly cookie set
  const cookies = await context.cookies();
  const hasSession = cookies.some(c => c.name === 'sb_session');
  expect(hasSession).toBe(true);
});
