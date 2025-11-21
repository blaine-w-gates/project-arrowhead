import { test, expect } from '@playwright/test';
import { signUpAndGetTeam } from '../fixtures/auth.fixture';
import { waitForNetworkIdle, logStep } from '../fixtures/data.fixture';

/**
 * Atomic Completion Tracker Test
 *
 * Verifies that newly created projects have the
 * "Mark as Complete" switch OFF (unchecked) by default.
 */

test.skip(({ browserName }) => browserName === 'webkit' || !!process.env.CI, 'Temporarily skip Atomic Completion Tracker spec in CI and on WebKit for Phase 3.0; tracked for Phase 3.1 hardening.');

test.describe('Completion Tracker - Default State', () => {
  test('new projects default to incomplete', async ({ page }) => {
    logStep('📝', 'Setting up user and team for completion tracker default state test');

    await signUpAndGetTeam(page, {
      teamName: 'Completion Tracker Team',
      userName: 'Completion Tracker User',
    });

    logStep('📂', 'Navigating to Projects dashboard');
    await page.goto('/dashboard/projects', { waitUntil: 'networkidle' });
    await waitForNetworkIdle(page);

    logStep('➕', 'Creating a new project via Add Project modal');
    const projectName = `Completion Tracker Project ${Date.now()}`;

    const addProjectButton = page.getByRole('button', { name: /add project/i });
    await expect(addProjectButton).toBeVisible({ timeout: 10_000 });
    await addProjectButton.click();

    const nameInput = page.getByLabel(/project name/i);
    await expect(nameInput).toBeVisible({ timeout: 10_000 });
    await nameInput.fill(projectName);

    const createButton = page.getByRole('button', { name: /create project/i });
    await expect(createButton).toBeVisible({ timeout: 10_000 });
    await createButton.click();

    // Wait for the new project card to appear in the Active list
    const projectTitle = page.getByText(projectName).first();
    await expect(projectTitle).toBeVisible({ timeout: 15_000 });

    logStep('🔍', 'Asserting that the completion switch is OFF by default');

    const projectCard = projectTitle.locator(
      'xpath=ancestor::div[contains(@class,"card")][1]'
    );

    const completionSwitch = projectCard.getByRole('switch', {
      name: /mark as complete/i,
    });

    await expect(completionSwitch).toBeVisible({ timeout: 10_000 });

    // For ARIA switches, aria-checked should be "false" when unchecked
    await expect(completionSwitch).toHaveAttribute('aria-checked', 'false');
  });
});
