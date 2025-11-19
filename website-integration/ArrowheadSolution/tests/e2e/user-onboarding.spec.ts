/**
 * User Onboarding & Team Initialization E2E Test
 * 
 * Tests the complete new user journey:
 * 1. Sign up with unique email
 * 2. Initialize team via UI
 * 3. Verify 14-day trial status
 * 4. Create first project
 * 
 * Based on: STRATEGIC_TESTING_PLAN.md Phase 2, Section 1
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
const TEST_TEAM_NAME = 'E2E Test Team';
const TEST_USER_NAME = 'E2E Test User';

// ===================================================================
// TEST SUITE: User Onboarding & Team Initialization
// ===================================================================

test.describe('User Onboarding Flow', () => {
  let testEmail: string;
  
  test.beforeEach(() => {
    // Generate unique email for each test run
    testEmail = generateTestEmail();
    console.log(`📧 Test email: ${testEmail}`);
  });
  
  test.afterEach(async ({ page }) => {
    // Cleanup test data
    await cleanupTestData(testEmail, page);
  });
  
  // ===================================================================
  // TEST 1: Complete Signup and Team Initialization
  // ===================================================================
  
  test('New user can sign up, initialize team via UI, and access dashboard', async ({ page }) => {
    // STEP 1: Sign up new user
    console.log('📝 Step 1: Signing up new user...');
    await signUpNewUser(page, testEmail, TEST_PASSWORD);
    
    // Verify we're on the dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
    
    // STEP 2: Initialize team via UI modal
    console.log('🏢 Step 2: Initializing team via UI...');
    await initializeTeam(page, TEST_TEAM_NAME, TEST_USER_NAME);
    
    // STEP 3: Verify dashboard loads with profile
    console.log('✅ Step 3: Verifying dashboard loaded...');
    
    // Wait for dashboard to fully load
    await page.waitForLoadState('networkidle');
    
    // Verify we can see the dashboard layout
    await expect(page.getByText('Team MVP')).toBeVisible();
    await expect(page.getByText(TEST_USER_NAME)).toBeVisible();
    await expect(page.getByText(/Account Owner/i)).toBeVisible();
    
    console.log('✅ Test complete: User onboarding successful');
  });
  
  // ===================================================================
  // TEST 2: Create First Project After Team Initialization
  // ===================================================================
  
  test('New user can create their first project', async ({ page }) => {
    // STEP 1: Sign up and initialize team via UI
    console.log('📝 Setting up new user...');
    await signUpNewUser(page, testEmail, TEST_PASSWORD);
    await initializeTeam(page, TEST_TEAM_NAME, TEST_USER_NAME);
    
    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');
    
    // STEP 2: Navigate to Projects tab (should already be there)
    console.log('📂 Step 2: Navigating to Projects tab...');
    const projectsTab = page.getByRole('link', { name: /projects/i }).first();
    await projectsTab.click();
    await page.waitForLoadState('networkidle');
    
    // STEP 3: Click "Add Project" button
    console.log('➕ Step 3: Creating first project...');
    const addProjectButton = page.getByRole('button', { name: /add project/i });
    await expect(addProjectButton).toBeVisible({ timeout: 5000 });
    await addProjectButton.click();
    
    // Wait for modal to open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/create new project/i)).toBeVisible();
    
    // STEP 4: Fill out project form
    const projectName = 'My First Project';
    const projectNameInput = page.getByLabel(/project name/i);
    await projectNameInput.fill(projectName);
    
    // Submit form
    const createButton = page.getByRole('button', { name: /create project/i });
    await expect(createButton).toBeEnabled();
    await createButton.click();
    
    // STEP 5: Verify project appears in list
    console.log('✅ Step 5: Verifying project created...');
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Test complete: First project created successfully');
  });
  
  // ===================================================================
  // TEST 3: Trial Banner Displays Correctly (Mock Trial Ending Soon)
  // ===================================================================
  
  test('Trial ending banner displays when 3 days or less remain', async ({ page }) => {
    // STEP 1: Sign up and initialize team
    console.log('📝 Setting up new user...');
    await signUpNewUser(page, testEmail, TEST_PASSWORD);
    await initializeTeam(page, TEST_TEAM_NAME, TEST_USER_NAME);
    
    // STEP 2: Mock profile response to show trial ending in 2 days
    console.log('🎭 Step 2: Mocking profile with 2 days left in trial...');
    
    await page.route('**/api/auth/profile', async (route) => {
      // Fetch real profile first
      const response = await route.fetch();
      const json = await response.json();
      
      // Modify to show trial ending soon
      const mockedProfile = {
        ...json,
        subscriptionStatus: 'trialing',
        daysLeftInTrial: 2,
        trialEndsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      };
      
      await route.fulfill({ json: mockedProfile });
    });
    
    // STEP 3: Reload to trigger profile fetch with mock
    console.log('🔄 Step 3: Reloading to apply mock...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    // STEP 4: Verify trial banner appears
    console.log('🎗️ Step 4: Checking for trial banner...');
    const trialBanner = page.locator('text=/trial ends in 2 days/i').first();
    await expect(trialBanner).toBeVisible({ timeout: 5000 });
    
    // STEP 5: Verify Subscribe Now button
    const subscribeButton = page.getByRole('link', { name: /subscribe now/i });
    await expect(subscribeButton).toBeVisible();
    
    console.log('✅ Test complete: Trial banner displays correctly');
  });
});

// ===================================================================
// TEST SUITE: Edge Cases & Error Handling
// ===================================================================

test.describe('Onboarding Edge Cases', () => {
  // ===================================================================
  // TEST 4: Cannot Initialize Team Twice
  // ===================================================================
  
  test('User cannot initialize team twice', async ({ page }) => {
    const localTestEmail = generateTestEmail();
    
    // Sign up and initialize team via UI
    await signUpNewUser(page, localTestEmail, TEST_PASSWORD);
    await initializeTeam(page, TEST_TEAM_NAME, TEST_USER_NAME);
    
    // Attempt to initialize team again
    const response = await page.evaluate(async ({ teamName, userName }) => {
      const res = await fetch('/api/auth/initialize-team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamName, userName }),
      });
      
      return {
        status: res.status,
        data: await res.json(),
      };
    }, { teamName: 'Second Team', userName: 'Second User' });
    
    // Should return 400 error
    expect(response.status).toBe(400);
    expect(response.data.error).toContain('already belongs to a team');
    
    console.log('✅ Correctly prevented duplicate team initialization');
    
    // Cleanup
    await cleanupTestData(localTestEmail, page);
  });
  
  // ===================================================================
  // TEST 5: Team Initialization Requires Authentication
  // ===================================================================
  
  test('Unauthenticated user cannot initialize team', async ({ page: testPage }) => {
    // Navigate to homepage (not authenticated)
    await testPage.goto('/');
    
    // Attempt to call initialize-team API without auth
    const response = await testPage.evaluate(async ({ teamName, userName }) => {
      const res = await fetch('/api/auth/initialize-team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamName, userName }),
      });
      
      return {
        status: res.status,
        data: await res.json(),
      };
    }, { teamName: TEST_TEAM_NAME, userName: TEST_USER_NAME });
    
    // Should return 401 Unauthorized
    expect(response.status).toBe(401);
    
    console.log('✅ Correctly rejected unauthenticated team initialization');
  });
});
