import { test, expect } from '@playwright/test';
import { signUpAndGetTeam, ensureAuthToken } from '../fixtures/auth.fixture';
import { seedProject } from '../fixtures/api.fixture';
import { waitForNetworkIdle, logStep } from '../fixtures/data.fixture';

/**
 * Atomic RRGT Dial Test (T-3.5)
 *
 * Verifies that a user can compare two RRGT items using The Dial:
 * - Seed project, objective, and a task assigned to the current user
 * - Seed TWO RRGT items for that task via API (Red + Green columns)
 * - Initialize dial state via PUT /api/dial/mine (left/right slots)
 * - Navigate to RRGT tab and verify both items appear in the grid and dial
 * - Click the left dial slot to select Item A as Primary Focus
 * - Assert PUT /api/dial/mine payload and UI selection badge
 */

// Temporarily skip in CI and on WebKit while we harden Phase 3.0
// This test is intended to run locally in Chromium during development.
test.skip(
  ({ browserName }) => browserName === 'webkit' || !!process.env.CI,
  'Temporarily skip RRGT Dial atomic test in CI and on WebKit for Phase 3.0; tracked for Phase 3.1 hardening.'
);

const RED_COLUMN_INDEX = 1;
const GREEN_COLUMN_INDEX = 5;

 test.describe('RRGT - Atomic Dial (My Work)', () => {
  test('can select primary focus between two RRGT items via The Dial', async ({ page }) => {
    logStep('📝', 'Signing up user, initializing team');

    const { teamId, teamMemberId } = await signUpAndGetTeam(page, {
      teamName: 'RRGT Dial Team',
      userName: 'RRGT Dial User',
    });

    if (!teamId || !teamMemberId) {
      throw new Error('Missing teamId or teamMemberId for RRGT Dial test');
    }

    logStep('🌱', 'Seeding project, objective, and assigned task via API');

    const projectName = `RRGT Dial Project ${Date.now()}`;
    const { id: projectId, name: seededProjectName } = await seedProject(page, teamId, projectName);

    if (!projectId) {
      throw new Error('Failed to seed project for RRGT Dial test');
    }

    const objectiveName = `RRGT Dial Objective ${Date.now()}`;
    const token = await ensureAuthToken(page);

    // Seed objective via authenticated Express API
    const objectiveResponse = await page.request.post(`/api/projects/${projectId}/objectives`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        name: objectiveName,
        start_with_brainstorm: false,
      },
    });

    expect(objectiveResponse.ok()).toBeTruthy();
    const objectiveJson = (await objectiveResponse.json()) as any;
    const objectiveId: string | undefined = objectiveJson?.objective?.id;

    if (!objectiveId) {
      throw new Error('Failed to seed objective for RRGT Dial test');
    }

    // Seed a task assigned to the current team member via Tasks API
    const taskTitle = `RRGT Dial Task ${Date.now()}`;
    const createTaskResponse = await page.request.post(`/api/objectives/${objectiveId}/tasks`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        title: taskTitle,
        description: 'Task used for RRGT dial comparison test',
        priority: 2,
        assigned_team_member_ids: [teamMemberId],
      },
    });

    expect(createTaskResponse.ok()).toBeTruthy();
    const taskJson = (await createTaskResponse.json()) as any;
    const taskId: string | undefined = taskJson?.task?.id;

    if (!taskId) {
      throw new Error('Failed to seed assigned task for RRGT Dial test');
    }

    logStep('🌱', 'Seeding two RRGT items via API for dial comparison');

    const leftItemTitle = 'Dial Left Item';
    const rightItemTitle = 'Dial Right Item';

    const createItem = async (title: string, columnIndex: number): Promise<string> => {
      const response = await page.request.post(`/api/tasks/${taskId}/items`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        data: {
          title,
          column_index: columnIndex,
        },
      });

      expect(response.ok()).toBeTruthy();
      const json = (await response.json()) as any;
      const itemId: string | undefined = json?.item?.id;

      if (!itemId) {
        throw new Error('Failed to seed RRGT item via /api/tasks/:taskId/items');
      }

      return itemId;
    };

    const leftItemId = await createItem(leftItemTitle, GREEN_COLUMN_INDEX);
    const rightItemId = await createItem(rightItemTitle, RED_COLUMN_INDEX);

    logStep('🧭', 'Initializing dial state via /api/dial/mine');

    const dialInitResponse = await page.request.put('/api/dial/mine', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        left_item_id: leftItemId,
        right_item_id: rightItemId,
        selected_item_id: null,
        is_left_private: false,
        is_right_private: false,
      },
    });

    expect(dialInitResponse.ok()).toBeTruthy();

    logStep('📊', 'Navigating to RRGT tab');

    await page.goto('/dashboard/rrgt', { waitUntil: 'networkidle' });
    await waitForNetworkIdle(page);

    // Basic smoke: RRGT heading should be visible
    const rrgtHeading = page.getByRole('heading', { name: /my work \(rrgt\)/i });
    await expect(rrgtHeading).toBeVisible({ timeout: 15_000 });

    logStep('🎯', 'Ensuring seeded project is selected in RRGT filters');

    const projectFilterLabel = page.getByText(/^Project$/);
    const projectFilterSection = projectFilterLabel.locator(
      'xpath=ancestor::div[contains(@class,"space-y-2")][1]'
    );

    const projectSelectTrigger = projectFilterSection.getByRole('combobox').first();
    await expect(projectSelectTrigger).toBeVisible({ timeout: 15_000 });
    await expect(projectSelectTrigger).toBeEnabled({ timeout: 15_000 });
    await projectSelectTrigger.click();

    const projectOption = page.getByRole('option', { name: seededProjectName }).first();
    await expect(projectOption).toBeVisible({ timeout: 10_000 });
    await projectOption.click();

    logStep('🔍', 'Verifying both RRGT items are visible in the grid');

    const rrgtGridCard = page
      .getByText(/rrgt grid \(6 priority columns\)/i)
      .locator('xpath=ancestor::div[contains(@class,"rounded-lg") and contains(@class,"border")][1]');

    await expect(rrgtGridCard.getByText(leftItemTitle)).toBeVisible({ timeout: 15_000 });
    await expect(rrgtGridCard.getByText(rightItemTitle)).toBeVisible({ timeout: 15_000 });

    logStep('🕹', 'Verifying The Dial shows both items');

    const dialCard = page
      .getByText(/the dial/i)
      .locator('xpath=ancestor::div[contains(@class,"rounded-lg") and contains(@class,"border")][1]');

    await expect(dialCard).toBeVisible({ timeout: 15_000 });
    await expect(dialCard.getByText(leftItemTitle)).toBeVisible({ timeout: 15_000 });
    await expect(dialCard.getByText(rightItemTitle)).toBeVisible({ timeout: 15_000 });

    logStep('📡', 'Selecting left dial item as Primary Focus and capturing dial update');

    const leftSlot = dialCard
      .getByText(leftItemTitle)
      .locator('xpath=ancestor::div[contains(@class,"border-4") and contains(@class,"rounded-lg")][1]');

    const [dialRequest, dialResponse] = await Promise.all([
      page.waitForRequest((req) => req.method() === 'PUT' && req.url().includes('/api/dial/mine')),
      page.waitForResponse((res) => res.request().method() === 'PUT' && res.url().includes('/api/dial/mine')),
      leftSlot.click(),
    ]);

    const dialBody = dialRequest.postDataJSON() as any;
    const dialStatus = dialResponse.status();
    const dialBodyText = await dialResponse.text();
    console.log('Dial update response:', dialStatus, dialBodyText);

    expect(dialBody.left_item_id).toBe(leftItemId);
    expect(dialBody.right_item_id).toBe(rightItemId);
    expect(dialBody.selected_item_id).toBe(leftItemId);
    expect(dialStatus).toBe(200);

    logStep('✅', 'Verifying UI marks left item as Primary Focus');

    await expect(leftSlot.getByText(/primary focus/i)).toBeVisible({ timeout: 15_000 });
  });
});
