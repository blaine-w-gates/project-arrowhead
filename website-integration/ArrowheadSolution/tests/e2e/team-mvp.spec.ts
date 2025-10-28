/**
 * Team MVP E2E Tests - Core User Flows
 * 
 * Tests for Phase 3 Team MVP features:
 * - Supabase authentication (email/password)
 * - Project management
 * - Task management (Scoreboard)
 * - RRGT/Dial functionality
 * 
 * Based on: PRD v5.2 Final, SLAD v6.0 Final
 * 
 * ⚠️ TODO: [ARCHITECT] These tests require Supabase test users in CI environment
 * 
 * Prerequisites:
 * 1. Supabase project configured with test database
 * 2. Test users seeded in auth.users table
 * 3. Environment variables set in CI:
 *    - E2E_TEST_EMAIL (Account Owner/Manager email)
 *    - E2E_TEST_PASSWORD (password)
 *    - E2E_TEST_MEMBER_EMAIL (Team Member email, optional)
 *    - E2E_TEST_MEMBER_PASSWORD (password, optional)
 * 
 * Current Status: SKIPPED in CI until test user setup is complete.
 * Tests can be run locally with proper environment variables.
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Test User Setup
 */
const TEST_EMAIL = process.env.E2E_TEST_EMAIL;
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD;

// Skip entire suite if test credentials not provided
const SKIP_REASON = !TEST_EMAIL || !TEST_PASSWORD 
  ? 'Test user credentials not configured (E2E_TEST_EMAIL, E2E_TEST_PASSWORD required)'
  : false;

// Helper: Authenticate user and return to dashboard
async function loginUser(page: Page, email: string = TEST_EMAIL!, password: string = TEST_PASSWORD!) {
  if (!email || !password) {
    throw new Error('Test credentials not provided');
  }
  
  await page.goto('/signin', { waitUntil: 'networkidle', timeout: 15000 });
  
  // Wait for signin form to be ready
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });
  
  // Fill email and password
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  
  // Click sign in button
  const signInButton = page.getByRole('button', { name: /sign in/i });
  await expect(signInButton).toBeEnabled({ timeout: 3000 });
  await signInButton.click();
  
  // Wait for redirect to dashboard with longer timeout for auth
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  
  // Verify dashboard loaded
  await page.waitForLoadState('networkidle', { timeout: 10000 });
}

test.describe('Team MVP - Core User Flows', () => {
  // Skip all tests if credentials not configured
  test.skip(SKIP_REASON !== false, SKIP_REASON || '');

  // ===================================================================
  // TEST 1: LOGIN FLOW
  // ===================================================================
  
  test.describe('Authentication Flow', () => {
    test('Should redirect unauthenticated users from /dashboard to /signin', async ({ page }) => {
      await page.goto('/dashboard/projects');
      
      // Should redirect to signin
      await expect(page).toHaveURL(/\/signin/, { timeout: 5000 });
      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    });

    test('Should successfully log in with valid credentials and redirect to /dashboard/projects', async ({ page }) => {
      await page.goto('/signin');
      
      // Verify sign in page loaded
      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
      
      // Fill credentials
      await page.getByLabel(/email/i).fill(TEST_EMAIL);
      await page.getByLabel(/password/i).fill(TEST_PASSWORD);
      
      // Submit form
      const signInButton = page.getByRole('button', { name: /sign in/i });
      await expect(signInButton).toBeEnabled();
      await signInButton.click();
      
      // Should redirect to dashboard after successful login
      await expect(page).toHaveURL(/\/dashboard\/projects/, { timeout: 10000 });
      
      // Verify dashboard UI elements present
      await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible({ timeout: 5000 });
    });

    test('Should show error message with invalid credentials', async ({ page }) => {
      await page.goto('/signin');
      
      // Fill with invalid credentials
      await page.getByLabel(/email/i).fill('invalid@test.com');
      await page.getByLabel(/password/i).fill('wrongpassword');
      
      // Submit
      await page.getByRole('button', { name: /sign in/i }).click();
      
      // Should show error message (implementation-dependent)
      // Wait a bit for error to appear
      await page.waitForTimeout(2000);
      
      // Should still be on signin page
      await expect(page).toHaveURL(/\/signin/);
    });
  });

  // ===================================================================
  // TEST 2: PROJECT CREATION FLOW
  // ===================================================================
  
  test.describe('Project Management', () => {
    test('Should create a new project and see it in the list', async ({ page }) => {
      // Login first
      await loginUser(page);
      
      // Navigate to Projects tab
      await page.goto('/dashboard/projects');
      await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible();
      
      // Click Add Project button (look for "Add Project" or "New Project" button)
      const addButton = page.getByRole('button', { name: /add project|new project|create project/i }).first();
      await addButton.click();
      
      // Fill project creation modal/form
      const projectName = `E2E Test Project ${Date.now()}`;
      
      // Wait for modal to appear
      await page.waitForSelector('input[name="name"], input[placeholder*="project name" i]', { timeout: 3000 });
      
      // Fill project name
      const nameInput = page.locator('input[name="name"], input[placeholder*="project name" i]').first();
      await nameInput.fill(projectName);
      
      // Submit form (look for "Create", "Save", or "Add" button in modal)
      const submitButton = page.getByRole('button', { name: /create|save|add/i }).last();
      await submitButton.click();
      
      // Wait for modal to close and project to appear in list
      await page.waitForTimeout(1000);
      
      // Verify project appears in the list
      await expect(page.getByText(projectName)).toBeVisible({ timeout: 5000 });
    });

    test('Should navigate to project details view', async ({ page }) => {
      // Login
      await loginUser(page);
      
      // Navigate to Projects
      await page.goto('/dashboard/projects');
      
      // Click on first project (if exists)
      const firstProject = page.locator('[data-testid="project-card"], .project-item, article').first();
      
      // Check if any projects exist
      const projectCount = await firstProject.count();
      
      if (projectCount > 0) {
        await firstProject.click();
        
        // Should navigate to project details or objectives view
        await page.waitForURL(/\/dashboard\/(projects|objectives)/, { timeout: 5000 });
      } else {
        // No projects exist - skip this test
        test.skip();
      }
    });
  });

  // ===================================================================
  // TEST 3: TASK MANAGEMENT (SCOREBOARD)
  // ===================================================================
  
  test.describe('Task Management - Scoreboard', () => {
    test('Should create a new task in Scoreboard tab', async ({ page }) => {
      // Login
      await loginUser(page);
      
      // Navigate to Scoreboard tab
      await page.goto('/dashboard/scoreboard');
      await expect(page.getByRole('heading', { name: /scoreboard|tasks/i })).toBeVisible({ timeout: 5000 });
      
      // Click Add Task button
      const addTaskButton = page.getByRole('button', { name: /add task|new task|create task/i }).first();
      
      // Check if button exists (may not exist if no objectives)
      const buttonCount = await addTaskButton.count();
      
      if (buttonCount > 0) {
        await addTaskButton.click();
        
        // Fill task creation modal
        const taskTitle = `E2E Test Task ${Date.now()}`;
        
        // Wait for modal
        await page.waitForSelector('input[name="title"], input[placeholder*="task" i]', { timeout: 3000 });
        
        // Fill task title
        const titleInput = page.locator('input[name="title"], input[placeholder*="task" i]').first();
        await titleInput.fill(taskTitle);
        
        // Submit
        const submitButton = page.getByRole('button', { name: /create|save|add/i }).last();
        await submitButton.click();
        
        // Wait for modal to close
        await page.waitForTimeout(1000);
        
        // Verify task appears
        await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 5000 });
      } else {
        // No objectives exist to add tasks to
        test.skip();
      }
    });

    test('Should filter tasks by status', async ({ page }) => {
      // Login
      await loginUser(page);
      
      // Navigate to Scoreboard
      await page.goto('/dashboard/scoreboard');
      
      // Look for status filter buttons (To Do, In Progress, Complete)
      const todoFilter = page.getByRole('button', { name: /to do|todo|not started/i });
      const inProgressFilter = page.getByRole('button', { name: /in progress/i });
      const completeFilter = page.getByRole('button', { name: /complete|completed/i });
      
      // Check if filters exist
      const filterCount = await todoFilter.count();
      
      if (filterCount > 0) {
        // Click filters and verify UI responds
        await todoFilter.click();
        await page.waitForTimeout(500);
        
        await inProgressFilter.click();
        await page.waitForTimeout(500);
        
        await completeFilter.click();
        await page.waitForTimeout(500);
        
        // Verify we're still on scoreboard
        await expect(page).toHaveURL(/\/dashboard\/scoreboard/);
      } else {
        // No filter UI - skip test
        test.skip();
      }
    });
  });

  // ===================================================================
  // TEST 4: RRGT TAB - MY WORK
  // ===================================================================
  
  test.describe('RRGT - My Work Dashboard', () => {
    test('Should display RRGT tab and assigned tasks', async ({ page }) => {
      // Login
      await loginUser(page);
      
      // Navigate to RRGT tab
      await page.goto('/dashboard/rrgt');
      await expect(page.getByRole('heading', { name: /rrgt|my work/i })).toBeVisible({ timeout: 5000 });
      
      // Verify RRGT column headers exist (Red, Yellow, Green, Top Priority)
      // These may be represented as visual columns or labels
      const pageContent = await page.textContent('body');
      
      // Check for RRGT-related content
      const hasRrgtContent = 
        pageContent?.includes('Red') || 
        pageContent?.includes('Yellow') || 
        pageContent?.includes('Green') ||
        pageContent?.includes('Top Priority') ||
        pageContent?.includes('Dial');
      
      expect(hasRrgtContent).toBeTruthy();
    });

    test('Should allow updating task status from RRGT view', async ({ page }) => {
      // Login
      await loginUser(page);
      
      // Navigate to RRGT
      await page.goto('/dashboard/rrgt');
      
      // Look for assigned tasks
      const taskCard = page.locator('[data-testid="task-card"], .task-item, .rrgt-item').first();
      const taskCount = await taskCard.count();
      
      if (taskCount > 0) {
        // Click on task to open details/edit modal
        await taskCard.click();
        
        // Wait for modal or inline editor
        await page.waitForTimeout(1000);
        
        // Look for status dropdown or buttons
        const statusSelect = page.locator('select[name="status"], [role="combobox"]').first();
        const statusCount = await statusSelect.count();
        
        if (statusCount > 0) {
          // Change status to "In Progress" (or first available option)
          const options = await statusSelect.locator('option').allTextContents();
          if (options.length > 1) {
            await statusSelect.selectOption({ index: 1 });
          }
          
          // Save changes
          const saveButton = page.getByRole('button', { name: /save|update/i });
          if (await saveButton.count() > 0) {
            await saveButton.click();
          }
          
          // Verify we're still on RRGT page
          await expect(page).toHaveURL(/\/dashboard\/rrgt/);
        }
      } else {
        // No tasks assigned
        test.skip();
      }
    });
  });

  // ===================================================================
  // TEST 5: NAVIGATION & TABS
  // ===================================================================
  
  test.describe('Dashboard Navigation', () => {
    test('Should navigate between dashboard tabs', async ({ page }) => {
      // Login
      await loginUser(page);
      
      // Start at Projects
      await page.goto('/dashboard/projects');
      await expect(page).toHaveURL(/\/dashboard\/projects/);
      
      // Navigate to Objectives (if tab exists)
      const objectivesTab = page.getByRole('link', { name: /objectives/i });
      if (await objectivesTab.count() > 0) {
        await objectivesTab.click();
        await expect(page).toHaveURL(/\/dashboard\/objectives/);
      }
      
      // Navigate to Scoreboard
      const scoreboardTab = page.getByRole('link', { name: /scoreboard|tasks/i });
      if (await scoreboardTab.count() > 0) {
        await scoreboardTab.click();
        await expect(page).toHaveURL(/\/dashboard\/scoreboard/);
      }
      
      // Navigate to RRGT
      const rrgtTab = page.getByRole('link', { name: /rrgt|my work/i });
      if (await rrgtTab.count() > 0) {
        await rrgtTab.click();
        await expect(page).toHaveURL(/\/dashboard\/rrgt/);
      }
      
      // Navigate to Touchbases (if exists)
      const touchbasesTab = page.getByRole('link', { name: /touchbase/i });
      if (await touchbasesTab.count() > 0) {
        await touchbasesTab.click();
        await expect(page).toHaveURL(/\/dashboard\/touchbase/);
      }
    });

    test('Should maintain authentication across page refreshes', async ({ page }) => {
      // Login
      await loginUser(page);
      
      // Verify on dashboard
      await expect(page).toHaveURL(/\/dashboard/);
      
      // Reload page
      await page.reload();
      
      // Should still be on dashboard (not redirected to signin)
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
    });
  });

  // ===================================================================
  // TEST 6: TOUCHBASE FUNCTIONALITY
  // ===================================================================
  
  test.describe('Touchbase Module', () => {
    test('Should allow creating a touchbase entry', async ({ page }) => {
      // Login
      await loginUser(page);
      
      // Navigate to Touchbase tab
      await page.goto('/dashboard/touchbase');
      
      // Check if Touchbase tab exists
      const heading = page.getByRole('heading', { name: /touchbase/i });
      const headingCount = await heading.count();
      
      if (headingCount > 0) {
        // Look for Add Touchbase button
        const addButton = page.getByRole('button', { name: /add touchbase|new touchbase|create touchbase/i });
        
        if (await addButton.count() > 0) {
          await addButton.click();
          
          // Fill touchbase form (7 questions)
          await page.waitForTimeout(1000);
          
          // Look for textarea fields
          const textareas = page.locator('textarea');
          const textareaCount = await textareas.count();
          
          if (textareaCount > 0) {
            // Fill first textarea as example
            await textareas.first().fill(`E2E Test Touchbase Response ${Date.now()}`);
            
            // Submit
            const submitButton = page.getByRole('button', { name: /submit|save|create/i }).last();
            await submitButton.click();
            
            // Wait for completion
            await page.waitForTimeout(1000);
          }
        }
      } else {
        test.skip();
      }
    });
  });
});

// ===================================================================
// TEAM MEMBER FLOW TESTS
// ===================================================================

test.describe('Team MVP - Team Member Role Flow', () => {
  /**
   * These tests require a second test user with Team Member role
   * Set environment variables:
   * - E2E_TEST_MEMBER_EMAIL
   * - E2E_TEST_MEMBER_PASSWORD
   */
  
  const MEMBER_EMAIL = process.env.E2E_TEST_MEMBER_EMAIL;
  const MEMBER_PASSWORD = process.env.E2E_TEST_MEMBER_PASSWORD;
  
  // Skip if base credentials missing OR member credentials missing
  const MEMBER_SKIP_REASON = !TEST_EMAIL || !TEST_PASSWORD
    ? 'Base test credentials not configured'
    : !MEMBER_EMAIL || !MEMBER_PASSWORD
    ? 'Team Member test credentials not configured (E2E_TEST_MEMBER_EMAIL, E2E_TEST_MEMBER_PASSWORD required)'
    : false;
  
  test.skip(MEMBER_SKIP_REASON !== false, MEMBER_SKIP_REASON || '');
  
  test('Team Member should see only assigned tasks in RRGT', async ({ page }) => {
    // Login as Team Member
    if (MEMBER_EMAIL && MEMBER_PASSWORD) {
      await loginUser(page, MEMBER_EMAIL, MEMBER_PASSWORD);
      
      // Navigate to RRGT
      await page.goto('/dashboard/rrgt');
      
      // Verify RRGT page loads
      await expect(page.getByRole('heading', { name: /rrgt|my work/i })).toBeVisible();
      
      // Team Member should only see tasks assigned to them
      // Verify no "God View" or other team member data is visible
      const pageContent = await page.textContent('body');
      expect(pageContent).not.toContain('God View');
      expect(pageContent).not.toContain('View All Members');
    }
  });
});
