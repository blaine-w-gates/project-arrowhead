/**
 * Authentication Fixtures for E2E Tests
 * 
 * Provides reusable authentication helpers:
 * - signUpNewUser: Create and auto-confirm new user
 * - initializeTeam: Complete team initialization flow
 * - signUpAndGetTeam: Complete signup + team setup (returns team context)
 * 
 * Uses Supabase Admin API for email auto-confirmation
 */

import { Page, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../..');

// Load .env file only in local development (CI sets env vars directly)
if (!process.env.CI) {
  dotenv.config({ path: path.join(projectRoot, '.env') });
}

// --- Setup Supabase Admin Client ---
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY - ensure GitHub secrets are configured or .env file exists locally');
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

let __lastEmail: string | null = null;
let __lastPassword: string | null = null;
let __lastToken: string | null = null;

async function ensureAuthToken(page: Page): Promise<string> {
  const grab = async (): Promise<string> => {
    return await page.evaluate(() => {
      try {
        for (let idx = 0; idx < localStorage.length; idx++) {
          const key = localStorage.key(idx) || '';
          if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            try {
              const parsed: any = JSON.parse(raw);
              const tok = parsed?.access_token || parsed?.currentSession?.access_token;
              if (tok) return String(tok);
            } catch (_e) { void _e; }
          }
        }
      } catch (_e) { void _e; }
      return '';
    });
  };
  for (let i = 0; i < 30; i++) {
    const t = await grab();
    if (t) return t;
    await page.waitForTimeout(1000);
  }
  if (__lastEmail && __lastPassword) {
    await page.goto('/signin');
    await page.getByLabel(/^email$/i).fill(__lastEmail);
    await page.getByLabel(/^password$/i).fill(__lastPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    for (let i = 0; i < 30; i++) {
      const t = await grab();
      if (t) return t;
      await page.waitForTimeout(1000);
    }
  }
  throw new Error('No Supabase token available');
}

/**
 * Generate unique test email for idempotent test runs
 * Format: arrowhead.test.user+{timestamp}-{random}@gmail.com
 */
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `arrowhead.test.user+${timestamp}-${random}@gmail.com`;
}

/**
 * Sign up a new user with auto-confirmation via Supabase Admin API
 * 
 * @param page - Playwright page object
 * @param email - User email (use generateTestEmail())
 * @param password - User password
 * @returns Promise that resolves when user is signed up, confirmed, and logged in
 */
export async function signUpNewUser(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  console.log(`📝 Signing up new user: ${email}`);
  __lastEmail = email;
  __lastPassword = password;
  
  // Pre-flight: Verify Supabase Admin API is responsive
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) {
      throw new Error(`Supabase Admin API error: ${error.message}`);
    }
    console.log(`   ✅ Supabase Admin API operational (${data.users.length} existing users)`);
  } catch (err) {
    console.error(`❌ Supabase Admin API pre-flight check FAILED:`, err);
    throw new Error(`Cannot proceed with signup - Supabase Admin API not accessible: ${err}`);
  }
  
  console.log(`   Env: CI=${process.env.CI ?? ''} E2E_BYPASS_UI_SIGNUP=${process.env.E2E_BYPASS_UI_SIGNUP ?? ''}`);
  if (process.env.CI || process.env.E2E_BYPASS_UI_SIGNUP === '1') {
    console.log('⏭️ Bypassing UI signup (CI or E2E_BYPASS_UI_SIGNUP=1) - creating user via Supabase Admin');
    const { error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) {
      throw new Error(`Admin createUser failed: ${createError.message}`);
    }
  } else {
    // Navigate to signup page
    await page.goto('/signup', { waitUntil: 'networkidle', timeout: 15000 });
    
    // Fill signup form
    await page.getByLabel(/^email$/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByLabel(/confirm password/i).fill(password);
    
    // Submit form and WAIT FOR NETWORK REQUEST
    // Critical: In CI, React hydration can be slow. We must verify the form actually submits.
    const signUpButton = page.getByRole('button', { name: /sign up/i });
    await expect(signUpButton).toBeEnabled({ timeout: 3000 });
    
    console.log('🔘 Clicking signup button and waiting for network request...');

    // Add random jitter to prevent thundering herd on Supabase Auth in parallel CI tests
    const jitter = Math.floor(Math.random() * 2000); // 0-2000ms
    if (process.env.CI) {
      console.log(`   ⏳ Jitter wait: ${jitter}ms`);
      await page.waitForTimeout(jitter);
    }
    
    // CRITICAL: Webkit in CI is slow. Give ample time for:
    // 1. Click event propagation (hydration delay)
    // 2. Network request to Supabase
    // 3. Response from Supabase (free tier can be slow)
    const [request, response] = await Promise.all([
      page.waitForRequest(req => 
        req.url().includes('/auth/v1/signup') && req.method() === 'POST',
        { timeout: 60000 }
      ),
      page.waitForResponse(resp => 
        resp.url().includes('/auth/v1/signup') && resp.status() >= 200 && resp.status() < 400,
        { timeout: 60000 }
      ),
      signUpButton.click()
    ]);
    
    console.log(`✅ Signup request sent: ${request.method()} ${request.url()}`);
    console.log(`✅ Signup response received: ${response.status()} ${response.statusText()}`);
    
    // Wait for success confirmation or redirect
    await expect(
      page.getByText(/check your email/i).or(page.getByText(/dashboard/i))
    ).toBeVisible({ timeout: 15000 });
  }

  // Auto-confirm user via Supabase Admin API
  console.log('🔧 Auto-confirming user via Supabase Admin API...');
  console.log(`   Supabase URL: ${supabaseUrl?.substring(0, 30)}...`);
  console.log(`   Service Role Key present: ${!!serviceRoleKey}`);
  
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error('❌ Error listing users:', listError);
    console.error(`   Error details: ${JSON.stringify(listError, null, 2)}`);
    throw new Error(`Failed to list users: ${listError.message}`);
  }

  console.log(`   Total users in Supabase: ${users?.length || 0}`);
  const user = users?.find(u => u.email === email);
  if (!user) {
    console.error(`❌ User not found in Supabase after signup`);
    console.error(`   Searched for: ${email}`);
    console.error(`   Available users (last 3): ${users?.slice(-3).map(u => u.email).join(', ')}`);
    throw new Error(`Could not find user ${email} in Supabase to auto-confirm. User may not have been created.`);
  }

  if (!user.email_confirmed_at) {
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id, 
      { email_confirm: true }
    );

    if (updateError) {
      throw new Error(`Failed to auto-confirm user: ${updateError.message}`);
    }
    console.log('✅ User auto-confirmed via API');
  } else {
    console.log('ℹ️ User already confirmed');
  }

  // Log in with confirmed account
  console.log('🔐 Logging in with confirmed account...');
  await page.goto('/signin');
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  
  const signInButton = page.getByRole('button', { name: /sign in/i });
  // Attempt 1: click and verify auth token exchange
  const doLoginAttempt = async () => {
    await signInButton.click();

    // Detect Supabase session via localStorage (sb-*-auth-token)
    let authed = false;
    for (let i = 0; i < 30; i++) {
      const hasSession = await page.evaluate(() => {
        try {
          for (let idx = 0; idx < localStorage.length; idx++) {
            const key = localStorage.key(idx) || '';
            if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
              const raw = localStorage.getItem(key);
              if (!raw) continue;
              try {
                const parsed = JSON.parse(raw);
                if (parsed?.access_token || parsed?.currentSession?.access_token) return true;
              } catch (_e) { void _e; }
            }
          }
        } catch (_e) { void _e; }
        return false;
      });
      if (hasSession) { authed = true; break; }
      await new Promise(r => setTimeout(r, 1000));
    }
    console.log(`✅ Supabase session ${authed ? 'detected' : 'not found yet'}`);

    // Warm profile endpoint until it returns 200 to ensure session is active
    let ok = false;
    for (let i = 0; i < 10; i++) {
      const res = await page.request.get('/api/auth/profile');
      if (res.ok()) { ok = true; break; }
      await page.waitForTimeout(1000);
    }
    console.log(`✅ Profile warmup: ${ok ? 'ready' : 'not ready'}`);
  };

  await doLoginAttempt();

  // If still on /signin after first attempt, try once more (handles known double-login bounce)
  if (/\/signin(\b|\/)/.test(page.url())) {
    console.warn('⚠ Login bounced back to /signin (attempt 1) - retrying');
    await page.getByLabel(/^email$/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await doLoginAttempt();
  }

  // Navigate to dashboard explicitly and verify
  await page.goto('/dashboard/projects');
  try {
    await page.waitForURL(/\/dashboard\//, { timeout: 60000 });
    console.log('✅ Login successful - redirected to dashboard');
  } catch (error) {
    console.error('❌ Failed to redirect to dashboard after login');
    throw error;
  }
  try {
    __lastToken = await ensureAuthToken(page);
  } catch (_e) { void _e; }
}

/**
 * Initialize team via UI modal
 * 
 * @param page - Playwright page object
 * @param teamName - Name for the team
 * @param userName - User's display name
 */
export async function initializeTeam(
  page: Page,
  teamName: string,
  userName: string
): Promise<void> {
  console.log('🏢 Waiting for team initialization modal...');
  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  // Fast path: team may already exist (rare). Check profile.
  try {
    const res = await page.request.get('/api/auth/profile');
    if (res.ok()) {
      const json = await res.json();
      if (json?.teamId || json?.team_id) {
        await expect(page).toHaveURL(/\/dashboard\//, { timeout: 60000 });
        console.log('ℹ️ Team already initialized');
        return;
      }
    }
  } catch (_e) { void _e; }

  const dialog = page.getByRole('dialog');
  let uiVisible = false;
  try {
    await expect(dialog).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Welcome! Let's Get Started/i)).toBeVisible();
    uiVisible = true;
  } catch (_e) { void _e; }

  if (!uiVisible) {
    console.warn('⚠ Team init modal not found - using API fallback');
    let token = '';
    try {
      token = await ensureAuthToken(page);
    } catch (_e) {
      token = __lastToken || '';
    }
    if (!token) throw new Error('Initialize team API failed: no Supabase token available');

    // Perform API call via page.request with explicit Authorization header
    const resp = await page.request.post('/api/auth/initialize-team', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      data: { teamName, userName },
    });
    if (!resp.ok()) {
      const body = await resp.text();
      throw new Error(`Initialize team API failed: HTTP ${resp.status()}${body ? ` - ${body}` : ''}`);
    }

    // Poll profile via page.request until teamId present
    for (let i = 0; i < 20; i++) {
      const r = await page.request.get('/api/auth/profile', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (r.ok()) {
        try {
          const p = await r.json();
          if (p?.teamId || p?.team_id) break;
        } catch (_e) { void _e; }
      }
      await page.waitForTimeout(500);
    }

    await page.goto('/dashboard/projects');
    await expect(page).toHaveURL(/\/dashboard\//, { timeout: 60000 });
    console.log('✅ Team initialized via API fallback');
    return;
  }

  console.log('📝 Filling team initialization form...');
  await page.getByLabel(/your name/i).fill(userName);
  await page.getByLabel(/team name/i).fill(teamName);
  
  const getStartedButton = page.getByRole('button', { name: /get started/i });
  await expect(getStartedButton).toBeEnabled();
  await getStartedButton.click();
  
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 60000 });
  await expect(page).toHaveURL(/\/dashboard\//, { timeout: 60000 });
  console.log('✅ Team initialized via UI');
}

/**
 * Complete signup flow and return team context
 * 
 * This is the recommended fixture for most tests. It handles:
 * - User signup with unique email
 * - Email auto-confirmation
 * - Login
 * - Team initialization
 * - Direct database query for team ID (bypasses auth issues)
 * 
 * @param page - Playwright page object
 * @param options - Configuration options
 * @returns Object with page, teamId, userId, email
 */
export async function signUpAndGetTeam(
  page: Page,
  options?: {
    teamName?: string;
    userName?: string;
    password?: string;
  }
): Promise<{
  page: Page;
  email: string;
  teamId: string | null;
  userId: string | null;
  teamMemberId: string | null;
}> {
  const email = generateTestEmail();
  const password = options?.password || 'TestPassword123!';
  const teamName = options?.teamName || 'E2E Test Team';
  const userName = options?.userName || 'Test User';

  // Sign up and log in (this also auto-confirms via admin API)
  await signUpNewUser(page, email, password);
  
  // Initialize team via UI
  await initializeTeam(page, teamName, userName);
  
  // Wait for page to settle after team initialization
  await page.waitForLoadState('networkidle');
  
  // Use Supabase Admin to query database directly (God Mode)
  // This bypasses all HTTP/Cookie/Auth issues with the profile API
  let teamId: string | null = null;
  let userId: string | null = null;
  let teamMemberId: string | null = null;
  
  try {
    console.log('🔍 Querying database directly for team ID and member ID...');
    
    // Get user from Supabase Auth Admin (we need the user.id)
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }

    const user = users?.find(u => u.email === email);
    if (!user) {
      throw new Error(`Could not find user ${email} in Supabase.`);
    }
    
    userId = user.id;
    console.log(`✅ Found user ID: ${userId}`);

    // Query team_members table directly using Service Role
    // Get both team_id and the team_member id (which is the primary key)
    const { data: member, error: memberError } = await supabaseAdmin
      .from('team_members')
      .select('id, team_id')
      .eq('user_id', userId)
      .single();

    if (memberError) {
      console.warn(`⚠️ Error querying team_members: ${memberError.message}`);
      // Try to query without .single() in case there are multiple records
      const { data: members, error: multiError } = await supabaseAdmin
        .from('team_members')
        .select('id, team_id')
        .eq('user_id', userId)
        .limit(1);
      
      if (!multiError && members && members.length > 0) {
        teamId = members[0].team_id;
        teamMemberId = members[0].id;
      }
    } else if (member) {
      teamId = member.team_id;
      teamMemberId = member.id;
    }

    if (teamId && teamMemberId) {
      console.log(`✅ Retrieved from database - Team ID: ${teamId}, Team Member ID: ${teamMemberId}`);
    } else {
      console.warn('⚠️ Warning: Could not retrieve team ID or member ID from database');
    }
  } catch (error) {
    console.error('❌ Error querying database:', error instanceof Error ? error.message : error);
  }

  return {
    page,
    email,
    teamId,
    userId,
    teamMemberId,
  };
}

/**
 * Test configuration constants
 */
export const TEST_CONFIG = {
  PASSWORD: 'TestPassword123!',
  DEFAULT_TEAM_NAME: 'E2E Test Team',
  DEFAULT_USER_NAME: 'Test User',
  TIMEOUTS: {
    AUTH: 30000,
    NAVIGATION: 5000,
    MODAL: 10000,
  }
} as const;
