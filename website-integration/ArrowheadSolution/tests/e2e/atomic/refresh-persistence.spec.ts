import { test, expect } from '@playwright/test';
import { signUpAndGetTeam } from '../fixtures/auth.fixture';

/**
 * Atomic Navigation Tests - Refresh Persistence
 *
 * Scenario: Login -> Dashboard -> Reload Page.
 * Verify: URL remains /dashboard/projects and Welcome modal does not reappear.
 */

test.describe.skip('Navigation - Refresh Persistence', () => {
  test('stays on /dashboard/projects after reload without Welcome modal', async ({ page }) => {
    await signUpAndGetTeam(page, {
      teamName: 'Refresh Team',
      userName: 'Refresh User',
    });

    // Ensure we are on the Projects dashboard
    await page.goto('/dashboard/projects', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/dashboard\/projects/);

    // Reload the page to simulate hard refresh
    await page.reload({ waitUntil: 'networkidle' });

    // Still on dashboard after reload
    await expect(page).toHaveURL(/\/dashboard\/projects/);

    // The Team Initialization modal ("Welcome! Let's Get Started") should not be visible
    const welcomeDialog = page.getByRole('dialog').filter({ hasText: /welcome! let's get started/i });
    await expect(welcomeDialog).toHaveCount(0);
  });
});
