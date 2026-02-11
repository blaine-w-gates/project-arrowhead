/**
 * Data Fixtures for E2E Tests
 * 
 * Provides reusable data management helpers:
 * - cleanupTestData: Remove test user and associated data
 * - waitForElement: Robust element waiting utilities
 * 
 * Cleanup is non-fatal - test failures won't block cleanup errors
 */

import { Page } from '@playwright/test';

/**
 * Cleanup test user and all associated data
 * 
 * Uses POST /api/test/cleanup endpoint with E2E_TEST_SECRET
 * 
 * @param email - Email of user to clean up
 * @param page - Playwright page object
 * @param options - Cleanup options
 */
export async function cleanupTestData(
  email: string, 
  page: Page,
  options?: {
    verbose?: boolean;
    throwOnError?: boolean;
  }
): Promise<void> {
  const verbose = options?.verbose ?? true;
  const throwOnError = options?.throwOnError ?? false;

  if (verbose) {
    console.log(`🧹 Starting cleanup for: ${email}`);
  }

  try {
    const response = await page.request.post('/api/test/cleanup', {
      headers: {
        'Content-Type': 'application/json',
        'X-E2E-Test-Secret': process.env.E2E_TEST_SECRET || 'test-secret-local',
      },
      data: { email },
      timeout: 10000,
    });

    // Parse response safely
    let result: any;
    try {
      const text = await response.text();
      result = text ? JSON.parse(text) : {};
    } catch (parseError) {
      if (verbose) {
        console.warn('⚠️ Could not parse cleanup response (non-fatal)');
      }
      result = {};
    }

    // Handle different response scenarios
    if (response.status() === 404) {
      if (verbose) {
        console.log('ℹ️ Cleanup endpoint not available (development mode)');
      }
      return;
    }

    if (response.status() === 403) {
      if (verbose) {
        console.log('ℹ️ Cleanup skipped (production environment)');
      }
      return;
    }

    if (!response.ok()) {
      const errorMsg = result?.error || `HTTP ${response.status()}`;
      if (verbose) {
        console.warn(`⚠️ Cleanup request failed: ${errorMsg}`);
      }
      if (throwOnError) {
        throw new Error(`Cleanup failed: ${errorMsg}`);
      }
      return;
    }

    if (verbose) {
      console.log(`✅ Cleanup successful:`, {
        user: result.deleted?.user ? 'deleted' : 'not found',
        teamMembers: result.deleted?.teamMembers || 0,
        teams: result.deleted?.teams || 0,
      });
    }
  } catch (error) {
    if (verbose) {
      console.warn('⚠️ Cleanup error (non-fatal):', error instanceof Error ? error.message : error);
    }
    if (throwOnError) {
      throw error;
    }
  }
}

/**
 * Wait for network to be idle
 * 
 * @param page - Playwright page object
 * @param timeout - Timeout in milliseconds
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for navigation and network idle
 * 
 * @param page - Playwright page object  
 * @param urlPattern - Expected URL pattern
 * @param timeout - Timeout in milliseconds
 */
export async function waitForNavigation(
  page: Page, 
  urlPattern: string | RegExp,
  timeout = 30000
): Promise<void> {
  await page.waitForURL(urlPattern, { timeout });
  await page.waitForLoadState('networkidle', { timeout: 5000 });
}

/**
 * Reload page and wait for network idle
 * 
 * @param page - Playwright page object
 */
export async function reloadAndWait(page: Page): Promise<void> {
  await page.reload({ waitUntil: 'networkidle' });
}

/**
 * Test data generators
 */
export const DataGenerators = {
  /**
   * Generate unique project name
   */
  projectName: (prefix = 'Test Project'): string => {
    const timestamp = Date.now();
    return `${prefix} ${timestamp}`;
  },

  /**
   * Generate unique objective name
   */
  objectiveName: (prefix = 'Test Objective'): string => {
    const timestamp = Date.now();
    return `${prefix} ${timestamp}`;
  },

  /**
   * Generate unique task name
   */
  taskName: (prefix = 'Test Task'): string => {
    const timestamp = Date.now();
    return `${prefix} ${timestamp}`;
  },

  /**
   * Generate RRGT item name
   */
  rrgtItemName: (prefix = 'Test Item'): string => {
    const timestamp = Date.now();
    return `${prefix} ${timestamp}`;
  },
} as const;

/**
 * Common test timeouts (milliseconds)
 */
export const TIMEOUTS = {
  /** Short timeout for fast operations */
  SHORT: 3000,
  /** Medium timeout for normal operations */
  MEDIUM: 5000,
  /** Long timeout for auth and navigation */
  LONG: 10000,
  /** Extra long for slow operations */
  EXTRA_LONG: 30000,
} as const;

/**
 * Helper to log test step
 */
export function logStep(emoji: string, message: string): void {
  console.log(`${emoji} ${message}`);
}
