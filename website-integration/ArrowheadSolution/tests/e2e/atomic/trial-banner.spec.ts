import { test, expect } from '@playwright/test';
import { signUpAndGetTeam, supabaseAdmin } from '../fixtures/auth.fixture';
import { waitForNetworkIdle, logStep } from '../fixtures/data.fixture';

/**
 * Atomic Trial Banner Test
 *
 * Verifies that when a team is in a trialing state with
 * 3 days or less remaining, the TrialEndingBanner is
 * rendered above the dashboard content, with a Subscribe
 * CTA and a working dismiss button.
 */

test.describe('Trial Banner - Subscription UX', () => {
  test('shows trial ending banner when trial has 3 days or less remaining', async ({ page }) => {
    logStep('📝', 'Setting up trialing team via signup + team init');

    const { email, teamId } = await signUpAndGetTeam(page, {
      teamName: 'Trial Banner Team',
      userName: 'Trial Banner User',
    });

    if (!teamId) {
      throw new Error(`Missing teamId for trial banner test (email=${email})`);
    }

    logStep('🛠', 'Forcing trial to end in 2 days via Supabase Admin DB update');

    const now = new Date();
    const trialEnd = new Date(now.getTime());
    trialEnd.setDate(trialEnd.getDate() + 2);

    const { error } = await supabaseAdmin
      .from('teams')
      .update({
        subscription_status: 'trialing',
        trial_ends_at: trialEnd.toISOString(),
      })
      .eq('id', teamId);

    if (error) {
      throw new Error(`Failed to update team trial fields: ${error.message}`);
    }

    // Reload dashboard to ensure AuthContext refetches profile with new trial info
    await page.goto('/dashboard/projects', { waitUntil: 'networkidle' });
    await waitForNetworkIdle(page);

    logStep('🔍', 'Asserting that trial ending banner is visible with CTA');

    // Banner message should mention trial ending
    const bannerMessage = page.getByText(/Your trial ends/i).first();
    await expect(bannerMessage).toBeVisible();

    // Subscribe CTA should link to /pricing
    const subscribeLink = page.getByRole('link', { name: /subscribe now/i });
    await expect(subscribeLink).toBeVisible();
    await expect(subscribeLink).toHaveAttribute('href', '/pricing');

    // Dismiss button should hide the banner
    const dismissButton = page.getByRole('button', { name: /dismiss banner/i });
    await expect(dismissButton).toBeVisible();
    await dismissButton.click();

    await expect(bannerMessage).not.toBeVisible();

    logStep('✅', 'Trial ending banner behavior verified (visible and dismissible)');
  });
});
