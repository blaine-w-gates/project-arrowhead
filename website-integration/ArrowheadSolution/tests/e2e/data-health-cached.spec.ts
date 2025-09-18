import { test, expect } from '@playwright/test';

/**
 * Verifies that the Data Health card renders the "Cached" badge
 * when the backend returns a cached, non-stale payload.
 */
test('Data Health shows Cached badge when backend serves cached response', async ({ page }) => {
  // Intercept the admin data-health endpoint to return a cached, fresh response
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
        stale: false,
        fetched_at: new Date().toISOString(),
        cache_ttl_seconds: 60,
        run: { id: 456, url: 'https://github.com/blaine-w-gates/project-arrowhead/actions/runs/456' },
      }),
    });
  });

  // Ensure Admin Key is present so the hook is enabled
  await page.addInitScript(() => {
    localStorage.setItem('adminKey', 'test-admin');
  });

  // Navigate to the Ops admin page
  await page.goto('/ops');

  // Expect the Cached badge to be visible (exact match, avoid '(cached)' in timestamp)
  await expect(page.getByText(/^Cached$/)).toBeVisible();

  // Sanity: Stale should not be visible in this case
  await expect(page.getByText('Stale')).toHaveCount(0);

  // Quick sanity: incident runbook link is present
  await expect(page.getByRole('link', { name: 'Incident runbook' })).toBeVisible();
});
