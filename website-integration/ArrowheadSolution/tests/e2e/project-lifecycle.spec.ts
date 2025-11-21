/**
 * Project Lifecycle E2E Test
 * 
 * Tests the complete CRUD lifecycle for projects:
 * 1. Create project with vision
 * 2. Archive and restore project
 * 3. Delete protection (business rule: cannot delete non-empty projects)
 * 
 * Based on: STRATEGIC_TESTING_PLAN.md Phase 2.3
 * 
 * REFACTORED: Now uses auth.fixture.ts for reliable God Mode signup/confirmation
 */

import { test, expect } from '@playwright/test';
import { generateTestEmail, signUpNewUser, initializeTeam } from './fixtures/auth.fixture';
import { cleanupTestData } from './fixtures/data.fixture';

/**
 * Test configuration
 */
const TEST_PASSWORD = 'TestPassword123!';
const TEST_TEAM_NAME = 'E2E Project Test Team';
const TEST_USER_NAME = 'Test Project Owner';

// Keep these test-specific helpers that aren't in fixtures
async function createProjectViaUI(page: any, projectName: string): Promise<void> {
  console.log(`📁 Creating project: ${projectName}`);
  const addProjectButton = page.getByRole('button', { name: /add project/i });
  await expect(addProjectButton).toBeVisible({ timeout: 5000 });
  await addProjectButton.click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  const projectNameInput = page.getByLabel(/project name/i);
  await projectNameInput.fill(projectName);
  const createButton = page.getByRole('button', { name: /^create$/i }).last();
  await expect(createButton).toBeEnabled();
  await createButton.click();
  await expect(page.getByText(projectName)).toBeVisible({ timeout: 5000 });
  console.log(`✅ Project created: ${projectName}`);
}

async function fillVisionViaUI(page: any, projectName: string, visionData: any): Promise<void> {
  console.log(`📝 Filling vision for: ${projectName}`);
  const projectCard = page.locator('.card, [data-testid="project-card"]', { hasText: projectName }).first();
  await expect(projectCard).toBeVisible({ timeout: 5000 });
  const visionButton = projectCard.getByRole('button', { name: /vision/i });
  await visionButton.click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  await expect(page.getByText(/vision/i).first()).toBeVisible();
  const inputs = page.locator('textarea, input[type="text"]').filter({ hasNot: page.locator('[data-testid="hidden"]') });
  const visibleInputs = await inputs.all();
  if (visibleInputs.length >= 5) {
    await visibleInputs[0].fill(visionData.purpose);
    await visibleInputs[1].fill(visionData.achieve);
    await visibleInputs[2].fill(visionData.market);
    await visibleInputs[3].fill(visionData.customers);
    await visibleInputs[4].fill(visionData.win);
  }
  const saveButton = page.getByRole('button', { name: /save|submit/i });
  await expect(saveButton).toBeEnabled();
  await saveButton.click();
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
  console.log('✅ Vision saved');
}

async function createObjectiveViaAPI(page: any, projectId: string, objectiveName: string): Promise<string> {
  const response = await page.evaluate(async ({ projectId, objectiveName }: any) => {
    const res = await fetch(`/api/projects/${projectId}/objectives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: objectiveName, description: 'E2E test objective' }),
    });
    return { status: res.status, data: await res.json() };
  }, { projectId, objectiveName });
  if (response.status !== 201 && response.status !== 200) {
    throw new Error(`Failed to create objective: ${JSON.stringify(response.data)}`);
  }
  return response.data.id;
}

async function getProjectIdByName(page: any, projectName: string): Promise<string | null> {
  return await page.evaluate(async ({ projectName }: any) => {
    const profileRes = await fetch('/api/auth/profile', { credentials: 'include' });
    const profile = await profileRes.json();
    const teamId = profile.teamId;
    const projectsRes = await fetch(`/api/teams/${teamId}/projects`, { credentials: 'include' });
    const projects = await projectsRes.json();
    const project = projects.find((p: { name: string }) => p.name === projectName);
    return project ? project.id : null;
  }, { projectName });
}

async function deleteProjectViaAPI(page: any, projectId: string): Promise<{ status: number; data: unknown }> {
  return await page.evaluate(async ({ projectId }: any) => {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return { status: res.status, data: await res.json() };
  }, { projectId });
}

// ===================================================================
// TEST SUITE: Project Lifecycle
// ===================================================================

test.describe.skip('Project Lifecycle', () => {
  let testEmail: string;
  
  test.beforeEach(() => {
    testEmail = generateTestEmail();
    console.log(`📧 Test email: ${testEmail}`);
  });
  
  test.afterEach(async ({ page }) => {
    await cleanupTestData(testEmail, page);
  });
  
  // ===================================================================
  // TEST 1: Create Project & Vision
  // ===================================================================
  
  test('Can create project and fill out 5-question vision', async ({ page }) => {
    // STEP 1: Sign up and initialize team
    console.log('📝 Step 1: Setting up Account Owner...');
    await signUpNewUser(page, testEmail, TEST_PASSWORD);
    await initializeTeam(page, TEST_TEAM_NAME, TEST_USER_NAME);
    await page.waitForLoadState('networkidle');
    
    // STEP 2: Navigate to Projects tab
    console.log('📂 Step 2: Navigating to Projects...');
    const projectsTab = page.getByRole('link', { name: /projects/i }).first();
    await projectsTab.click();
    await page.waitForLoadState('networkidle');
    
    // STEP 3: Create project
    console.log('📁 Step 3: Creating project...');
    const projectName = 'Strategic Plan 2025';
    await createProjectViaUI(page, projectName);
    
    // STEP 4: Fill vision
    console.log('📝 Step 4: Filling vision...');
    const visionData = {
      purpose: 'To establish market leadership in our sector',
      achieve: 'Increase market share by 25% and launch 3 new products',
      market: 'B2B SaaS companies in North America',
      customers: 'Mid-market enterprises with 100-1000 employees',
      win: 'Superior product quality, exceptional customer support, and competitive pricing',
    };
    await fillVisionViaUI(page, projectName, visionData);
    
    // STEP 5: Verify vision status
    console.log('✅ Step 5: Verifying vision saved...');
    const projectCard = page.locator('.card, [data-testid="project-card"]', { hasText: projectName }).first();
    
    // Check for "Edit Vision" button (indicates vision exists)
    const editVisionButton = projectCard.getByRole('button', { name: /edit vision/i });
    await expect(editVisionButton).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Test complete: Project created with vision');
  });
  
  // ===================================================================
  // TEST 2: Archive & Restore
  // ===================================================================
  
  test('Can archive and restore project', async ({ page }) => {
    // STEP 1: Sign up and initialize team
    console.log('📝 Step 1: Setting up Account Owner...');
    await signUpNewUser(page, testEmail, TEST_PASSWORD);
    await initializeTeam(page, TEST_TEAM_NAME, TEST_USER_NAME);
    await page.waitForLoadState('networkidle');
    
    // STEP 2: Create project
    console.log('📁 Step 2: Creating project...');
    const projectName = 'Test Archive Project';
    await createProjectViaUI(page, projectName);
    
    // STEP 3: Archive project
    console.log('🗄️ Step 3: Archiving project...');
    const projectCard = page.locator('.card, [data-testid="project-card"]', { hasText: projectName }).first();
    
    // Open three-dot menu
    const moreButton = projectCard.getByRole('button', { name: /more/i }).or(projectCard.locator('button').filter({ has: page.locator('svg') })).last();
    await moreButton.click();
    
    // Click "Archive Project"
    const archiveMenuItem = page.getByRole('menuitem', { name: /archive project/i });
    await expect(archiveMenuItem).toBeVisible({ timeout: 3000 });
    await archiveMenuItem.click();
    
    // Wait for project to disappear from active list
    await expect(projectCard).not.toBeVisible({ timeout: 5000 });
    console.log('✅ Project archived');
    
    // STEP 4: Toggle "Show Archived"
    console.log('👁️ Step 4: Showing archived projects...');
    const showArchivedToggle = page.getByRole('checkbox', { name: /show archived/i }).or(
      page.getByText(/show archived/i)
    );
    
    if (await showArchivedToggle.isVisible()) {
      await showArchivedToggle.click();
      await page.waitForTimeout(1000);
    }
    
    // STEP 5: Verify archived badge
    console.log('🏷️ Step 5: Verifying archived badge...');
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 5000 });
    const archivedBadge = page.getByText(/archived/i);
    await expect(archivedBadge).toBeVisible({ timeout: 3000 });
    
    // STEP 6: Restore project
    console.log('♻️ Step 6: Restoring project...');
    const archivedCard = page.locator('.card, [data-testid="project-card"]', { hasText: projectName }).first();
    const restoreMoreButton = archivedCard.getByRole('button', { name: /more/i }).or(archivedCard.locator('button').filter({ has: page.locator('svg') })).last();
    await restoreMoreButton.click();
    
    // Click "Restore Project"
    const restoreMenuItem = page.getByRole('menuitem', { name: /restore project/i });
    await expect(restoreMenuItem).toBeVisible({ timeout: 3000 });
    await restoreMenuItem.click();
    
    // STEP 7: Verify project back in active list
    console.log('✅ Step 7: Verifying project restored...');
    await page.waitForTimeout(1000);
    
    // Hide archived projects
    if (await showArchivedToggle.isVisible()) {
      await showArchivedToggle.click();
      await page.waitForTimeout(500);
    }
    
    // Verify project is visible
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Test complete: Project archived and restored');
  });
  
  // ===================================================================
  // TEST 3: Delete Protection (Business Rule)
  // ===================================================================
  
  test('Cannot delete project with objectives (delete protection)', async ({ page }) => {
    // STEP 1: Sign up and initialize team
    console.log('📝 Step 1: Setting up Account Owner...');
    await signUpNewUser(page, testEmail, TEST_PASSWORD);
    await initializeTeam(page, TEST_TEAM_NAME, TEST_USER_NAME);
    await page.waitForLoadState('networkidle');
    
    // STEP 2: Create empty project
    console.log('📁 Step 2: Creating empty project...');
    const emptyProjectName = 'Empty Project';
    await createProjectViaUI(page, emptyProjectName);
    
    // STEP 3: Delete empty project (should succeed)
    console.log('🗑️ Step 3: Deleting empty project...');
    const emptyProjectId = await getProjectIdByName(page, emptyProjectName);
    expect(emptyProjectId).toBeTruthy();
    
    const deleteEmptyResponse = await deleteProjectViaAPI(page, emptyProjectId!);
    expect(deleteEmptyResponse.status).toBe(200);
    console.log('✅ Empty project deleted successfully');
    
    // Verify project no longer visible
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByText(emptyProjectName)).not.toBeVisible({ timeout: 3000 });
    
    // STEP 4: Create project with objective
    console.log('📁 Step 4: Creating project with objective...');
    const busyProjectName = 'Busy Project';
    await createProjectViaUI(page, busyProjectName);
    
    const busyProjectId = await getProjectIdByName(page, busyProjectName);
    expect(busyProjectId).toBeTruthy();
    
    // STEP 5: Add objective to project
    console.log('🎯 Step 5: Adding objective...');
    await createObjectiveViaAPI(page, busyProjectId!, 'Test Objective');
    
    // STEP 6: Attempt to delete project (should fail)
    console.log('🚫 Step 6: Attempting to delete non-empty project...');
    const deleteBusyResponse = await deleteProjectViaAPI(page, busyProjectId!);
    
    // STEP 7: Verify delete protection
    console.log('✅ Step 7: Verifying delete protection...');
    expect(deleteBusyResponse.status).toBe(400);
    expect((deleteBusyResponse.data as { message?: string }).message).toContain('objective');
    
    // STEP 8: Verify project still exists
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByText(busyProjectName)).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Test complete: Delete protection verified');
  });
});
