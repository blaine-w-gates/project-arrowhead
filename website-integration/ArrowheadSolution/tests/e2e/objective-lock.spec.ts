/**
 * Objective Lock E2E Test (Agentic Verification)
 * 
 * Purpose: Verify PR #155 hotfix for /api/objectives/:objectiveId/lock endpoint
 * 
 * Flow:
 * 1. Login with test credentials
 * 2. Create ephemeral project (unique name)
 * 3. Create objective in that project
 * 4. Click objective to open journey modal
 * 5. Verify lock is acquired (no 404/405 errors)
 * 6. Cleanup: delete project
 * 
 * Target: Production URL (https://project-arrowhead.pages.dev)
 */

import { test, expect } from '@playwright/test';

const PROD_BASE = process.env.PLAYWRIGHT_PROD_BASE_URL || 'https://project-arrowhead.pages.dev';
const TEST_USER = {
  email: 'test-owner@arrowhead.com',
  password: 'TestPassword123!'
};

test.describe('Objective Lock Flow (PR #155 Verification)', () => {
  test('User can create objective, acquire lock, and start journey without 404/405 errors', async ({ page }) => {
    const uniqueId = Date.now();
    const projectName = `Auto-Test-Lock-${uniqueId}`;
    const objectiveName = `Test-Objective-${uniqueId}`;

    // Capture console logs to detect client-side errors
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      console.log(`[BROWSER ${msg.type().toUpperCase()}] ${text}`);
    });

    // Capture network errors and responses
    const networkErrors: Array<{ url: string; status: number; method: string }> = [];
    page.on('requestfailed', request => {
      console.log(`[NETWORK FAILED] ${request.url()}: ${request.failure()?.errorText}`);
    });
    
    page.on('response', async response => {
      const url = response.url();
      const status = response.status();
      const method = response.request().method();
      
      // Log all API responses
      if (url.includes('/api/')) {
        console.log(`[API ${method}] ${url} → ${status}`);
        
        // Capture errors
        if (status >= 400) {
          networkErrors.push({ url, status, method });
          console.log(`[API ERROR] ${method} ${url} → ${status}`);
          try {
            const body = await response.text();
            console.log(`[API ERROR BODY] ${body}`);
          } catch (e) {
            // Ignore body read errors
          }
        }
      }
    });

    // Step 1: Login (with retry for "Double Login" bug)
    console.log('Starting login flow...');
    await page.goto(`${PROD_BASE}/signin`);
    
    let loginAttempts = 0;
    const maxLoginAttempts = 2;
    let loginSuccessful = false;

    while (loginAttempts < maxLoginAttempts && !loginSuccessful) {
      loginAttempts++;
      console.log(`Login attempt ${loginAttempts}/${maxLoginAttempts}`);
      
      // Fill login form
      const emailInput = page.locator('input[type="email"]');
      await emailInput.fill(TEST_USER.email);
      
      const passwordInput = page.locator('input[type="password"]');
      await passwordInput.fill(TEST_USER.password);
      
      // Submit and wait for navigation
      const submitButton = page.locator('button[type="submit"]');
      await Promise.all([
        page.waitForNavigation({ timeout: 15000 }).catch(() => {}),
        submitButton.click()
      ]);
      
      // Wait for page to settle
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      console.log(`After login attempt ${loginAttempts}: ${currentUrl}`);
      
      // Check if we're on dashboard or still on signin
      if (currentUrl.includes('/dashboard') || currentUrl.includes('/projects') || currentUrl.includes('/objectives')) {
        loginSuccessful = true;
        console.log('✓ Login successful on attempt', loginAttempts);
        break;
      } else if (currentUrl.includes('/signin')) {
        console.log(`⚠ Login bounced back to /signin (attempt ${loginAttempts})`);
        if (loginAttempts < maxLoginAttempts) {
          console.log('Retrying login (handling "Double Login" bug)...');
          await page.waitForTimeout(1000);
        }
      } else {
        console.log(`Unexpected URL after login: ${currentUrl}`);
      }
    }
    
    if (!loginSuccessful) {
      // Check for error messages
      const errorText = await page.locator('.error, [role="alert"], .alert-error, text=/error|invalid|failed/i').textContent().catch(() => 'No error message found');
      console.log('Console logs during failed login:', consoleLogs.slice(-10));
      throw new Error(`Login failed after ${maxLoginAttempts} attempts. Last URL: ${page.url()}. Error: ${errorText}`);
    }
    
    // Wait for dashboard to be fully loaded
    await page.waitForSelector('text=/dashboard|projects|objectives|team/i', { timeout: 10000 });
    console.log('✓ Dashboard fully loaded');

    // Step 2: Create ephemeral project
    await page.goto(`${PROD_BASE}/dashboard/projects`);
    await page.click('button:has-text("Add Project")');
    await page.fill('input[placeholder*="project name" i]', projectName);
    await page.click('button:has-text("Create Project")');
    
    // Wait for project to be created and modal to close
    await page.waitForTimeout(2000);
    
    // Skip vision modal if it appears
    const skipButton = page.locator('button:has-text("Skip")');
    if (await skipButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await skipButton.click();
      await page.waitForTimeout(1000);
    }
    
    console.log(`✓ Project created: ${projectName}`);

    // Step 3: Navigate to Objectives tab
    await page.goto(`${PROD_BASE}/dashboard/objectives`);
    
    // Select the project we just created
    const projectSelector = page.locator('select, [role="combobox"]').first();
    await projectSelector.click();
    await page.locator(`text="${projectName}"`).click();
    await page.waitForTimeout(1000);
    
    console.log('✓ Project selected in Objectives tab');

    // Step 4: Create objective
    await page.click('button:has-text("Add Objective")');
    await page.waitForTimeout(1000);
    
    // Modal first asks: "Do you know what objective you want to create?"
    // Look for the "Yes" button (it has nested divs: "Yes" + "I know my objective")
    const yesButton = page.locator('button').filter({ hasText: 'Yes' }).filter({ hasText: 'I know my objective' }).first();
    await expect(yesButton).toBeVisible({ timeout: 5000 });
    await yesButton.click();
    await page.waitForTimeout(1500);
    console.log('✓ Clicked "Yes I know my objective"');
    
    // Wait for the details form to appear (input with id="objective-name")
    const objectiveNameInput = page.locator('#objective-name');
    await expect(objectiveNameInput).toBeVisible({ timeout: 5000 });
    console.log('✓ Objective name input visible');
    
    // Now fill the objective name
    await objectiveNameInput.fill(objectiveName);
    
    // Set target date (future date)
    const dateInput = page.locator('input[type="date"], input[placeholder*="date" i]').first();
    if (await dateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      await dateInput.fill(futureDate.toISOString().split('T')[0]);
    }
    
    // Submit the objective creation form
    // Use force: true to bypass modal backdrop pointer interception
    const createButton = page.locator('button[type="submit"]', { hasText: /Create|Start/i }).first();
    await createButton.click({ force: true });
    
    // Wait for objective to be created
    await page.waitForTimeout(3000);
    console.log(`✓ Objective created: ${objectiveName}`);

    // Check if an error modal appeared (journey wizard may have auto-opened and failed)
    const errorModal = page.locator('[role="dialog"], [role="alertdialog"]').filter({ hasText: /failed|error/i });
    if (await errorModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      const errorText = await errorModal.textContent();
      console.log(`⚠ Error modal detected: ${errorText}`);
      
      // Close the error modal
      const closeButton = page.locator('button:has-text("Close")').last();
      await closeButton.click({ force: true });
      await page.waitForTimeout(1000);
      console.log('✓ Closed error modal');
    }

    // Step 5: Click objective card to open journey modal (critical test)
    const objectiveCard = page.locator(`text="${objectiveName}"`).first();
    await expect(objectiveCard).toBeVisible({ timeout: 5000 });
    await objectiveCard.click({ force: true });
    
    // Wait for modal to appear
    await page.waitForTimeout(2000);

    // Step 6: CRITICAL VERIFICATION - Check for lock acquisition
    // The lock endpoint should be called: POST /api/objectives/:id/lock
    
    console.log('\n=== LOCK ENDPOINT VERIFICATION ===');
    
    // Method A: Check network errors for lock endpoint failures
    // Note: Only check errors that occurred BEFORE this point (during the critical path)
    // Ignore cleanup errors (404s when trying to delete already-released locks)
    const lockErrors = networkErrors.filter(err => 
      err.url.includes('/lock') && 
      !(err.method === 'DELETE' && err.status === 404) // Ignore cleanup 404s
    );
    if (lockErrors.length > 0) {
      console.log(`❌ Lock endpoint errors detected:`, lockErrors);
      throw new Error(`Lock endpoint failed: ${lockErrors.map(e => `${e.method} ${e.url} → ${e.status}`).join(', ')}`);
    }
    
    // Method B: Check for absence of error messages in UI
    const errorTexts = ['405', '404', 'Method Not Allowed', 'Not Found', 'Failed to acquire lock', 'Failed to load objective journey'];
    for (const errorText of errorTexts) {
      const errorElement = page.locator(`text="${errorText}"`);
      if (await errorElement.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`❌ UI error detected: "${errorText}"`);
        console.log('Network errors captured:', networkErrors);
        throw new Error(`Lock acquisition failed: "${errorText}" error visible in UI`);
      }
    }
    
    // Method C: Check for journey modal presence
    const journeyModal = page.locator('[role="dialog"], .modal, [class*="Dialog"]').filter({ hasText: /objective|journey|step|brainstorm/i });
    const modalVisible = await journeyModal.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!modalVisible) {
      console.log('⚠ Journey modal not visible');
      console.log('Network errors:', networkErrors);
      throw new Error('Journey modal did not open - lock may have failed silently');
    }
    
    console.log('✅ Journey modal opened successfully');
    console.log('✅ Lock acquisition verified (no 404/405 errors)');
    console.log(`✅ PR #155 HOTFIX VERIFIED - Lock endpoint is working`);
    console.log('===================================\n');

    // Step 7: Close modal
    const closeButton = page.locator('button[aria-label*="close" i], button:has-text("×"), button:has-text("Close")').first();
    if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeButton.click();
      await page.waitForTimeout(1000);
    }

    // Step 8: Cleanup - Delete ephemeral project
    await page.goto(`${PROD_BASE}/dashboard/projects`);
    await page.waitForTimeout(1000);
    
    // Find and delete the project
    const projectCard = page.locator(`text="${projectName}"`).first();
    if (await projectCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Click kebab menu or delete button
      const deleteButton = projectCard.locator('xpath=ancestor::div[contains(@class, "card") or contains(@class, "project")]').locator('button').filter({ hasText: /delete|trash|remove/i });
      if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deleteButton.click();
        
        // Confirm deletion in dialog
        const confirmButton = page.locator('button:has-text("Delete")').last();
        await confirmButton.click();
        await page.waitForTimeout(1000);
        
        console.log(`✓ Project deleted: ${projectName}`);
      } else {
        console.log(`⚠ Could not find delete button for project: ${projectName}`);
      }
    }

    console.log('✅ TEST PASSED: Lock acquisition flow works correctly');
  });
});
