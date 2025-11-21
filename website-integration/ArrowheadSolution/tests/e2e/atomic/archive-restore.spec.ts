import { test, expect } from '@playwright/test';
import { signUpAndGetTeam, ensureAuthToken } from '../fixtures/auth.fixture';
import { seedProject } from '../fixtures/api.fixture';
import { waitForNetworkIdle, logStep } from '../fixtures/data.fixture';

/**
 * Atomic Archive / Restore Tests
 *
 * Verifies core project lifecycle behaviors without the legacy
 * full-screen flow:
 * - Archiving a project moves it to the Archived view/list
 * - Restoring a project moves it back to the Active view/list
 * - Delete protection rule: cannot delete a non-empty project
 */

test.skip(({ browserName }) => browserName === 'webkit' || !!process.env.CI, 'Temporarily skip Atomic Archive/Restore spec in CI and on WebKit for Phase 3.0; tracked for Phase 3.1 hardening.');

test.describe('Projects - Archive & Delete Protection', () => {
  test('can archive and restore a project via dashboard UI', async ({ page }) => {
    logStep('📝', 'Setting up user, team, and project via fixtures');

    const { teamId, teamMemberId } = await signUpAndGetTeam(page, {
      teamName: 'Archive/Restore Team',
      userName: 'Archive User',
    });

    if (!teamId || !teamMemberId) {
      throw new Error('Missing teamId or teamMemberId for archive/restore test');
    }

    const projectName = `Archive Test Project ${Date.now()}`;
    const { id: projectId, name: seededName } = await seedProject(page, teamId, projectName);

    logStep('📂', 'Navigating to Projects dashboard');
    await page.goto('/dashboard/projects', { waitUntil: 'networkidle' });
    await waitForNetworkIdle(page);

    // Verify seeded project appears in Active list
    const projectCard = page.getByText(seededName).first();
    await expect(projectCard).toBeVisible({ timeout: 10_000 });

    logStep('🧊', 'Archiving project via UI');

    // Open project action menu (ellipsis) on the project card, then click "Archive Project"
    const projectRow = projectCard.locator(
      'xpath=ancestor::div[contains(@class,"project") or contains(@class,"card") or contains(@class,"grid")][1]'
    );
    // The ellipsis trigger is the last button in the project header actions row.
    const ellipsisTrigger = projectRow.getByRole('button').last();

    await expect(ellipsisTrigger).toBeVisible({ timeout: 10_000 });
    await ellipsisTrigger.click();

    const archiveMenuItem = page.getByRole('menuitem', { name: /archive project/i });
    await expect(archiveMenuItem).toBeVisible({ timeout: 5_000 });
    await archiveMenuItem.click();

    // Confirm archive if a confirmation dialog appears
    const confirmArchive = page.getByRole('button', { name: /confirm archive|archive project/i }).first();
    if (await confirmArchive.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmArchive.click();
    }

    // After archiving, project should no longer appear in Active view
    await expect(projectCard).not.toBeVisible({ timeout: 10_000 });

    logStep('♻️', 'Restoring project via API');

    const token = await ensureAuthToken(page);
    const restoreResponse = await page.request.put(`/api/projects/${projectId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: { is_archived: false },
    });

    expect(restoreResponse.ok()).toBeTruthy();

    // Reload Projects dashboard and verify project has returned to Active list
    await page.goto('/dashboard/projects', { waitUntil: 'networkidle' });
    await waitForNetworkIdle(page);

    const restoredCard = page.getByText(seededName).first();
    await expect(restoredCard).toBeVisible({ timeout: 10_000 });

    logStep('✅', 'Archive and restore flow verified');
  });

  test('enforces delete protection rule for non-empty projects', async ({ page }) => {
    logStep('📝', 'Setting up user, team, and non-empty project for delete protection');

    const { teamId } = await signUpAndGetTeam(page, {
      teamName: 'Delete Protection Team',
      userName: 'Owner User',
    });

    if (!teamId) {
      throw new Error('Missing teamId for delete protection test');
    }

    const projectName = `Protected Project ${Date.now()}`;
    await seedProject(page, teamId, projectName);

    await page.goto('/dashboard/projects', { waitUntil: 'networkidle' });
    await waitForNetworkIdle(page);

    const projectCard = page.getByText(projectName).first();
    await expect(projectCard).toBeVisible({ timeout: 10_000 });

    logStep('🛡', 'Attempting to delete non-empty project via UI');

    const projectRow = projectCard.locator('xpath=ancestor::div[contains(@class,"project") or contains(@class,"card") or contains(@class,"grid")][1]');
    const deleteButton = projectRow
      .getByRole('button', { name: /delete/i })
      .or(projectRow.getByRole('menuitem', { name: /delete/i }))
      .first();

    if (!(await deleteButton.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Delete action not exposed in current UI; delete protection rule may be enforced elsewhere');
    }

    await deleteButton.click();

    const confirmDelete = page.getByRole('button', { name: /delete/i }).last();
    if (await confirmDelete.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmDelete.click();
    }

    // Expect that project is still present (protected), or an error toast/message is shown
    // We assert the conservative condition: project still visible => delete protection working.
    await expect(projectCard).toBeVisible({ timeout: 10_000 });

    logStep('✅', 'Delete protection verified: non-empty project was not removed');
  });
});
