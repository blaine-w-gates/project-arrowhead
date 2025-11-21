import { test, expect } from '@playwright/test';
import { signUpAndGetTeam } from '../fixtures/auth.fixture';

/**
 * Atomic Navigation Tests
 * NV-01: Layout Isolation (no marketing nav / hamburger inside dashboard)
 * NV-02: Return Trip (Dashboard CTA from marketing site)
 */

test.describe('Navigation - Dual World Layout Isolation', () => {
  test('NV-01: Dashboard hides marketing navbar and GlobalSidebar hamburger', async ({ page }) => {
    await signUpAndGetTeam(page, {
      teamName: 'NV-01 Team',
      userName: 'NV-01 User',
    });

    // Ensure we are on the Projects dashboard
    await page.goto('/dashboard/projects', { waitUntil: 'networkidle' });

    // GlobalSidebar hamburger and sidebar should NOT be rendered on dashboard routes
    const hamburgerToggle = page.locator('#sidebarToggleBtn');
    const globalSidebar = page.locator('#globalSidebar');
    await expect(hamburgerToggle).toHaveCount(0);
    await expect(globalSidebar).toHaveCount(0);

    // Marketing navbar (public nav with Project Arrowhead brand) should NOT be visible here
    const marketingNav = page.locator('nav').filter({ hasText: 'Project Arrowhead' });
    await expect(marketingNav).toHaveCount(0);
  });

  test('NV-02: Public site shows Dashboard CTA and returns to /dashboard/projects', async ({ page }) => {
    await signUpAndGetTeam(page, {
      teamName: 'NV-02 Team',
      userName: 'NV-02 User',
    });

    // Start from the Projects dashboard
    await page.goto('/dashboard/projects', { waitUntil: 'networkidle' });

    // Navigate to public homepage
    await page.goto('/', { waitUntil: 'networkidle' });

    // Locate the marketing navbar by its brand text
    const marketingNav = page.locator('nav').filter({ hasText: 'Project Arrowhead' }).first();
    await expect(marketingNav).toBeVisible();

    // In logged-in state, "Dashboard" CTA should be present and "Sign In" should not
    const dashboardLink = marketingNav.getByRole('link', { name: /dashboard/i });
    await expect(dashboardLink).toBeVisible();

    const signInLinks = marketingNav.getByRole('link', { name: /sign in/i });
    await expect(signInLinks).toHaveCount(0);

    // Clicking Dashboard should return us to /dashboard/projects
    await dashboardLink.click();
    await expect(page).toHaveURL(/\/dashboard\/projects/);
  });
});
