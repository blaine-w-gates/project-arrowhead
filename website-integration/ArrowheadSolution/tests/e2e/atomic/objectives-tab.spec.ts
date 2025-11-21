import { test, expect } from '@playwright/test';
import { signUpAndGetTeam } from '../fixtures/auth.fixture';
import { waitForNetworkIdle, logStep } from '../fixtures/data.fixture';

/**
 * Atomic Objectives Tab Test
 *
 * Extends the completion tracker test by:
 * - Creating a project via Projects tab UI
 * - Navigating to the Objectives tab
 * - Selecting that project in the Objectives dropdown
 * - Asserting that the Objectives tab renders without runtime errors
 */

test.describe('Objectives Tab - Project Selection', () => {
  test('can select a project in Objectives tab after creating it', async ({ page }) => {
    logStep('📝', 'Signing up user, initializing team');

    await signUpAndGetTeam(page, {
      teamName: 'Objectives Tab Team',
      userName: 'Objectives Tab User',
    });

    logStep('📂', 'Navigating to Projects dashboard');
    await page.goto('/dashboard/projects', { waitUntil: 'networkidle' });
    await waitForNetworkIdle(page);

    logStep('➕', 'Creating a new project via Add Project modal');
    const projectName = `Objectives Tab Project ${Date.now()}`;

    const addProjectButton = page.getByRole('button', { name: /add project/i });
    await expect(addProjectButton).toBeVisible({ timeout: 10_000 });
    await addProjectButton.click();

    const nameInput = page.getByLabel(/project name/i);
    await expect(nameInput).toBeVisible({ timeout: 10_000 });
    await nameInput.fill(projectName);

    const createButton = page.getByRole('button', { name: /create project/i });
    await expect(createButton).toBeVisible({ timeout: 10_000 });
    await createButton.click();

    const projectTitle = page.getByText(projectName).first();
    await expect(projectTitle).toBeVisible({ timeout: 15_000 });

    logStep('🧭', 'Navigating to Objectives tab');

    // Use the dashboard nav to go to Objectives tab; fall back to direct URL if needed
    const objectivesNav = page
      .getByRole('link', { name: /objectives/i })
      .or(page.getByRole('button', { name: /objectives/i }))
      .first();

    if (await objectivesNav.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await objectivesNav.click();
    } else {
      await page.goto('/dashboard/objectives', { waitUntil: 'networkidle' });
    }

    await waitForNetworkIdle(page);

    // Basic smoke: Objectives page heading should be visible
    const objectivesHeading = page.getByRole('heading', { name: /objectives/i });
    await expect(objectivesHeading).toBeVisible({ timeout: 10_000 });

    logStep('🎯', 'Selecting the newly created project in the Objectives tab');

    // Open the Select Project combobox by its placeholder text
    const projectSelectTrigger = page
      .getByText(/select a project/i)
      .locator('xpath=ancestor::button[1]');

    await expect(projectSelectTrigger).toBeVisible({ timeout: 10_000 });
    await projectSelectTrigger.click();

    const projectOption = page.getByRole('option', { name: projectName }).first();
    await expect(projectOption).toBeVisible({ timeout: 10_000 });
    await projectOption.click();

    logStep('🔎', 'Verifying Objectives tab renders without runtime error overlay');

    // Ensure we did not hit the Vite runtime error overlay
    const viteOverlay = page.locator('vite-error-overlay');
    await expect(viteOverlay).toHaveCount(0);

    // The fallback helper text should disappear once a project is selected
    const fallbackText = page.getByText(
      /select a project above to view and manage its objectives/i
    );
    await expect(fallbackText).not.toBeVisible({ timeout: 10_000 });

    // And the "Add Objective" button should be available for the selected project
    const addObjectiveButton = page.getByRole('button', { name: /add objective/i });
    await expect(addObjectiveButton).toBeVisible({ timeout: 10_000 });
  });
});
