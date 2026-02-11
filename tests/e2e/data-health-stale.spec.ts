import { test, expect } from '@playwright/test';

/**
 * Verifies that the Data Health card renders the "Stale" badge
 * when the backend returns a stale cached payload.
 */
test('Data Health shows Stale badge when backend serves stale cache', async ({ page }) => {
  // Intercept the admin data-health endpoint to return a canned stale response
  await page.route('**/pyapi/admin/data-health*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        drift_ok: true,
        counts: { fs: 10, db: 10 },
        drift: { only_fs: [], only_db: [] },
        cached: true,
        stale: true,
        fetched_at: new Date().toISOString(),
        cache_ttl_seconds: 60,
        run: { id: 123, url: 'https://github.com/blaine-w-gates/project-arrowhead/actions/runs/123' },
      }),
    });
  });

  // Ensure Admin Key is present so the hook is enabled
  await page.addInitScript(() => {
    localStorage.setItem('adminKey', 'test-admin');
  });

  // Navigate to the Ops admin page
  await page.goto('/ops');

  // Expect the Stale badge to be visible
  await expect(page.getByText('Stale')).toBeVisible();

  // Quick sanity: incident runbook link is present
  await expect(page.getByRole('link', { name: 'Incident runbook' })).toBeVisible();
});
