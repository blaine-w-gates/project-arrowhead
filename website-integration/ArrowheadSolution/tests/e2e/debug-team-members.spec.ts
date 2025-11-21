import { test, expect } from '@playwright/test';
import { generateTestEmail, signUpNewUser, initializeTeam } from './fixtures/auth.fixture';

const TEST_PASSWORD = 'TestPassword123!';

// Debug test: mirror the real UI flow and capture the browser's
// request to /api/teams/:teamId/members (used by PermissionGrid).

test.skip('debug team members API response shape (via UI fetch)', async ({ page }) => {
  const email = generateTestEmail();

  // 1) Sign up and initialize team using existing helpers
  await signUpNewUser(page, email, TEST_PASSWORD);
  await initializeTeam(page, 'Debug Team', 'Debug Owner');

  // 2) Capture the actual browser-side fetch to /api/teams/:teamId/members
  const teamMemberResponses: { url: string; status: number; body: string }[] = [];

  page.on('response', async (response) => {
    const url = response.url();
    if (!url.includes('/api/teams/') || !url.includes('/members')) return;

    const req = response.request();
    const rt = req.resourceType();
    if (rt !== 'fetch' && rt !== 'xhr') return;

    const ct = response.headers()['content-type'] || '';
    if (!ct.toLowerCase().startsWith('application/json')) return;

    const status = response.status();
    let body = '';
    try {
      body = await response.text();
    } catch {
      // ignore body read errors in listener
    }
    console.log('TEAM_MEMBERS_RESPONSE', status, url, body);
    teamMemberResponses.push({ url, status, body });
  });

  // 3) Navigate to Projects dashboard (this should trigger PermissionGrid fetch)
  await page.goto('/dashboard/projects');
  await page.waitForLoadState('networkidle');

  // Wait a bit to ensure the team-members request has fired
  await page.waitForTimeout(2000);

  expect(teamMemberResponses.length).toBeGreaterThan(0);
  const last = teamMemberResponses[teamMemberResponses.length - 1];

  expect(last.status).toBeLessThan(500);

  let parsed: unknown;
  try {
    parsed = JSON.parse(last.body || 'null');
  } catch (e) {
    throw new Error(
      `Failed to parse team members JSON: ${(e as Error).message}\nRaw: ${last.body}`,
    );
  }

  // PermissionGrid expects an array of members
  expect(Array.isArray(parsed)).toBeTruthy();
});
