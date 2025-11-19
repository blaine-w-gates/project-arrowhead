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
 * Prerequisites:
 * - AddProjectModal.tsx exists
 * - VisionModal.tsx exists
 * - ProjectCard.tsx with archive/delete actions
 * - projects table has vision_data and is_archived columns
 */

import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..', '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

// --- Setup Supabase Admin Client ---
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Generate unique test email for idempotent test runs
 */
function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `arrowhead.test.user+${timestamp}-${random}@gmail.com`;
}

/**
 * Test configuration
 */
const TEST_PASSWORD = 'TestPassword123!';
const TEST_TEAM_NAME = 'E2E Project Test Team';
const TEST_USER_NAME = 'Test Project Owner';

/**
 * Helper: Sign up a new user via Supabase with Auto-Confirmation
 */
async function signUpNewUser(page: Page, email: string, password: string) {
  console.log(`📝 Step 1: Signing up Account Owner with email: ${email}`);
  
  await page.goto('/signup', { waitUntil: 'networkidle', timeout: 15000 });
  
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByLabel(/confirm password/i).fill(password);
  
  const signUpButton = page.getByRole('button', { name: /sign up/i });
  await expect(signUpButton).toBeEnabled({ timeout: 3000 });
  await signUpButton.click();
  
  // Wait for the "Check your email" message or redirect
  // This ensures the user is created in the database before we try to verify them
  await expect(page.getByText(/check your email/i).or(page.getByText(/dashboard/i))).toBeVisible({ timeout: 10000 });

  // --- Programmatic Confirmation ---
  console.log('🔧 Auto-confirming user via Supabase Admin API...');
  
  // 1. Find the user ID by email
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error('❌ Error listing users:', listError);
    throw new Error(`Failed to list users: ${listError.message}`);
  }

  const user = users?.find(u => u.email === email);
  if (!user) {
    throw new Error(`Could not find user ${email} in Supabase to auto-confirm.`);
  }

  if (!user.email_confirmed_at) {
    // 2. Manually confirm the email
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id, 
      { email_confirm: true }
    );

    if (updateError) {
      throw new Error(`Failed to auto-confirm user: ${updateError.message}`);
    }
    console.log('✅ User auto-confirmed via API.');
  } else {
    console.log('ℹ️ User already confirmed.');
  }

  // 3. Log in fresh (since verification usually requires a new session or link click)
  console.log('🔐 Logging in with confirmed account...');
  await page.goto('/signin');
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  
  const signInButton = page.getByRole('button', { name: /sign in/i });
  await signInButton.click();

  try {
    await page.waitForURL(/\/dashboard\//, { timeout: 30000 });
    console.log('✅ Login successful - redirected to dashboard');
  } catch (error) {
    console.error('❌ Failed to redirect to dashboard after login');
    throw error;
  }
}

/**
 * Helper: Initialize team via UI modal
 */
async function initializeTeamViaUI(
  page: Page,
  teamName: string,
  userName: string
): Promise<void> {
  console.log('🏢 Waiting for team initialization modal...');
  
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/Welcome! Let's Get Started/i)).toBeVisible();
  
  console.log('📝 Filling team initialization form...');
  await page.getByLabel(/your name/i).fill(userName);
  await page.getByLabel(/team name/i).fill(teamName);
  
  const getStartedButton = page.getByRole('button', { name: /get started/i });
  await expect(getStartedButton).toBeEnabled();
  await getStartedButton.click();
  
  // Wait for modal to close (it calls refreshProfile() instead of reload now)
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
  
  // Verify we're still on dashboard (session preserved)
  // The app redirects to /dashboard/projects after team initialization
  await expect(page).toHaveURL(/\/dashboard\//, { timeout: 5000 });
  console.log('✅ Team initialized via UI');
}

/**
 * Helper: Create project via UI
 * Returns the project name for verification
 */
async function createProjectViaUI(
  page: Page,
  projectName: string
): Promise<void> {
  console.log(`📁 Creating project: ${projectName}`);
  
  // Click "Add Project" button
  const addProjectButton = page.getByRole('button', { name: /add project/i });
  await expect(addProjectButton).toBeVisible({ timeout: 5000 });
  await addProjectButton.click();
  
  // Wait for modal
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  
  // Fill project name
  const projectNameInput = page.getByLabel(/project name/i);
  await projectNameInput.fill(projectName);
  
  // Click create button
  const createButton = page.getByRole('button', { name: /^create$/i }).last();
  await expect(createButton).toBeEnabled();
  await createButton.click();
  
  // Wait for project to appear
  await expect(page.getByText(projectName)).toBeVisible({ timeout: 5000 });
  console.log(`✅ Project created: ${projectName}`);
}

/**
 * Helper: Fill vision via UI
 */
async function fillVisionViaUI(
  page: Page,
  projectName: string,
  visionData: {
    purpose: string;
    achieve: string;
    market: string;
    customers: string;
    win: string;
  }
): Promise<void> {
  console.log(`📝 Filling vision for: ${projectName}`);
  
  // Find project card
  const projectCard = page.locator('.card, [data-testid="project-card"]', { hasText: projectName }).first();
  await expect(projectCard).toBeVisible({ timeout: 5000 });
  
  // Click "Add Vision" or "Edit Vision" button
  const visionButton = projectCard.getByRole('button', { name: /vision/i });
  await visionButton.click();
  
  // Wait for Vision Modal
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  await expect(page.getByText(/vision/i).first()).toBeVisible();
  
  // Fill all 5 vision questions
  // Note: Actual input selectors may vary based on implementation
  const inputs = page.locator('textarea, input[type="text"]').filter({ hasNot: page.locator('[data-testid="hidden"]') });
  const visibleInputs = await inputs.all();
  
  if (visibleInputs.length >= 5) {
    await visibleInputs[0].fill(visionData.purpose);
    await visibleInputs[1].fill(visionData.achieve);
    await visibleInputs[2].fill(visionData.market);
    await visibleInputs[3].fill(visionData.customers);
    await visibleInputs[4].fill(visionData.win);
  } else {
    console.warn('⚠️ Vision inputs may have changed. Attempting alternative selectors...');
    // Try alternative approach: look for labeled inputs
    await page.getByLabel(/purpose|why/i).fill(visionData.purpose);
    await page.getByLabel(/achieve|what/i).fill(visionData.achieve);
    await page.getByLabel(/market|where/i).fill(visionData.market);
    await page.getByLabel(/customers|who/i).fill(visionData.customers);
    await page.getByLabel(/win|how/i).fill(visionData.win);
  }
  
  // Save vision
  const saveButton = page.getByRole('button', { name: /save|submit/i });
  await expect(saveButton).toBeEnabled();
  await saveButton.click();
  
  // Wait for modal to close
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
  console.log('✅ Vision saved');
}

/**
 * Helper: Create objective via API
 * Used for testing delete protection
 */
async function createObjectiveViaAPI(
  page: Page,
  projectId: string,
  objectiveName: string
): Promise<string> {
  console.log(`🎯 Creating objective: ${objectiveName}`);
  
  const response = await page.evaluate(async ({ projectId, objectiveName }) => {
    const res = await fetch(`/api/projects/${projectId}/objectives`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        name: objectiveName,
        description: 'E2E test objective',
      }),
    });
    
    return {
      status: res.status,
      data: await res.json(),
    };
  }, { projectId, objectiveName });
  
  if (response.status !== 201 && response.status !== 200) {
    throw new Error(`Failed to create objective: ${JSON.stringify(response.data)}`);
  }
  
  console.log(`✅ Objective created: ${response.data.id}`);
  return response.data.id;
}

/**
 * Helper: Get project ID by name via API
 */
async function getProjectIdByName(
  page: Page,
  projectName: string
): Promise<string | null> {
  const response = await page.evaluate(async ({ projectName }) => {
    // Get team ID from profile first
    const profileRes = await fetch('/api/auth/profile', {
      credentials: 'include',
    });
    const profile = await profileRes.json();
    const teamId = profile.teamId;
    
    // Fetch projects
    const projectsRes = await fetch(`/api/teams/${teamId}/projects`, {
      credentials: 'include',
    });
    const projects = await projectsRes.json();
    
    // Find project by name
    const project = projects.find((p: { name: string }) => p.name === projectName);
    return project ? project.id : null;
  }, { projectName });
  
  return response;
}

/**
 * Helper: Delete project via API
 * Returns response for assertion
 */
async function deleteProjectViaAPI(
  page: Page,
  projectId: string
): Promise<{ status: number; data: unknown }> {
  return await page.evaluate(async ({ projectId }) => {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    
    return {
      status: res.status,
      data: await res.json(),
    };
  }, { projectId });
}

/**
 * Helper: Cleanup test user and team
 */
async function cleanupTestData(email: string, page: Page) {
  if (!email) {
    console.warn('⚠️ No email provided - skipping cleanup');
    return;
  }
  
  console.log(`🧹 Starting cleanup for: ${email}`);
  
  const secret = process.env.E2E_TEST_SECRET || 'test-secret-local';
  
  try {
    const response = await page.evaluate(async ({ email, secret }) => {
      const res = await fetch('/api/test/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-e2e-secret': secret,
        },
        body: JSON.stringify({ email }),
      });
      
      // Safe JSON parsing - handle empty/error responses
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : { error: 'Empty response' };
      } catch (e) {
        data = { error: 'Invalid JSON', body: text };
      }
      
      return {
        status: res.status,
        data,
      };
    }, { email, secret });
    
    if (response.status === 200) {
      console.log('✅ Cleanup successful:', response.data);
    } else if (response.status === 404 && response.data?.message?.includes('not available')) {
      // Expected for production tests - cleanup endpoint disabled in production
      console.log('ℹ️ Cleanup skipped (production environment)');
    } else {
      console.warn('⚠️ Cleanup failed:', {
        status: response.status,
        data: response.data,
      });
    }
  } catch (error) {
    // Cleanup failures should not fail tests - just log for debugging
    console.warn('⚠️ Cleanup error (non-fatal):', error instanceof Error ? error.message : error);
  }
}

// ===================================================================
// TEST SUITE: Project Lifecycle
// ===================================================================

test.describe('Project Lifecycle', () => {
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
    await initializeTeamViaUI(page, TEST_TEAM_NAME, TEST_USER_NAME);
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
    await initializeTeamViaUI(page, TEST_TEAM_NAME, TEST_USER_NAME);
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
    await initializeTeamViaUI(page, TEST_TEAM_NAME, TEST_USER_NAME);
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
