import { test, expect } from '@playwright/test';
import { signUpAndGetTeam } from '../fixtures/auth.fixture';
import { waitForNetworkIdle, logStep } from '../fixtures/data.fixture';

// Atomic RRGT Incognito Test
// Verifies that Incognito plans are local-only:
// - Create private task
// - Rename
// - Move rabbit
// - Persist across reload
// - No /api/rrgt/plans/* network mutations

// Skip in CI and WebKit while hardening, consistent with other RRGT atomic tests
// and to avoid flakiness in environments we do not control directly.
test.skip(
  ({ browserName }) => browserName === 'webkit' || !!process.env.CI,
  'Skip RRGT Incognito atomic test in CI and on WebKit while hardening.'
);

const TARGET_COLUMN_INDEX = 3; // zero-based RRGT column index for Subtask 3

// Helper to locate the incognito row by its title text
async function getIncognitoRow(page: import('@playwright/test').Page, title: string) {
  const titleLocator = page.getByText(title).first();
  await expect(titleLocator).toBeVisible({ timeout: 15_000 });
  return titleLocator.locator('xpath=ancestor::div[contains(@class,"grid")][1]');
}

test.describe('RRGT - Incognito Mode (Local-Only)', () => {
  test('create, rename, move rabbit, persist, and keep network silent', async ({ page }) => {
    logStep('📝', 'Signing up user and initializing team for Incognito RRGT test');

    const { teamId } = await signUpAndGetTeam(page, {
      teamName: 'RRGT Incognito Team',
      userName: 'RRGT Incognito User',
    });

    if (!teamId) {
      throw new Error('Missing teamId for RRGT Incognito test');
    }

    logStep('📊', 'Navigating to RRGT tab');
    await page.goto('/dashboard/rrgt', { waitUntil: 'networkidle' });
    await waitForNetworkIdle(page);

    // Network spy for any RRGT plan mutations (server traffic)
    const requests: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('/api/rrgt/plans/')) {
        requests.push(url);
      }
    });

    logStep('➕', 'Creating an Incognito (private) RRGT plan');
    const addPrivateButton = page.getByRole('button', { name: /add private task/i });
    await expect(addPrivateButton).toBeVisible({ timeout: 15_000 });
    await addPrivateButton.click();

    // Newly created private row should appear with default title
    const defaultTitle = 'New Private Task';
    const privateRow = await getIncognitoRow(page, defaultTitle);

    logStep('✏️', 'Renaming private task to "Secret Plans"');
    const titleTextarea = privateRow.locator('textarea').first();
    await expect(titleTextarea).toBeVisible({ timeout: 15_000 });
    await titleTextarea.fill('Secret Plans');
    // Wait for AutoSaveTextarea debounce to fire
    await page.waitForTimeout(1500);

    const renamedRow = await getIncognitoRow(page, 'Secret Plans');

    logStep('🐇', `Dragging rabbit to Subtask ${TARGET_COLUMN_INDEX} column`);
    const rabbit = renamedRow.getByText('🐇').first();
    await expect(rabbit).toBeVisible({ timeout: 15_000 });

    // Target cell for configured column index (Start=0, S1=1, S2=2, S3=3)
    const targetCell = renamedRow
      .locator(`[data-testid$="-${TARGET_COLUMN_INDEX}"]`)
      .first();
    await expect(targetCell).toBeVisible({ timeout: 15_000 });

    await rabbit.dragTo(targetCell);

    // After drag, rabbit should appear in the target cell
    await expect(targetCell.getByText('🐇')).toBeVisible({ timeout: 15_000 });

    logStep('🔁', 'Reloading page to verify persistence of title and rabbit position');
    await page.reload({ waitUntil: 'networkidle' });
    await waitForNetworkIdle(page);

    const persistedRow = await getIncognitoRow(page, 'Secret Plans');
    const persistedTargetCell = persistedRow
      .locator(`[data-testid$="-${TARGET_COLUMN_INDEX}"]`)
      .first();
    await expect(persistedTargetCell.getByText('🐇')).toBeVisible({ timeout: 15_000 });

    logStep('📡', 'Verifying that no RRGT plan mutation requests were sent to the server');
    expect(requests.length).toBe(0);
  });
});
