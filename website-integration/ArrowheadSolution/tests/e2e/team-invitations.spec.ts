/**
 * Team Invitations E2E Test
 * 
 * Tests the team member invitation flow:
 * 1. Create virtual team member
 * 2. Invite virtual member via email
 * 3. Verify permission checks (Account Owner/Manager only)
 * 4. Prevent duplicate email invitations
 * 
 * Based on: STRATEGIC_TESTING_PLAN.md Phase 2.2
 * 
 * Prerequisites:
 * - InviteMemberModal.tsx exists
 * - POST /api/team-members/:memberId/invite endpoint
 * - team_members.invite_status column
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Generate unique test email for idempotent test runs
 */
function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `arrowhead.test.user+${timestamp}-${random}@gmail.com`;
}

/**
 * Generate unique invitee email
 */
function generateInviteeEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `arrowhead.invitee+${timestamp}-${random}@gmail.com`;
}

/**
 * Test configuration
 */
const TEST_PASSWORD = 'TestPassword123!';
const TEST_TEAM_NAME = 'E2E Invitation Test Team';
const TEST_USER_NAME = 'Test Owner';
const VIRTUAL_MEMBER_NAME = 'Marketing Lead';

/**
 * Helper: Sign up a new user via Supabase
 */
async function signUpNewUser(page: Page, email: string, password: string) {
  await page.goto('/signup', { waitUntil: 'networkidle', timeout: 15000 });
  
  // Fill signup form
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByLabel(/confirm password/i).fill(password);
  
  // Submit form
  const signUpButton = page.getByRole('button', { name: /sign up/i });
  await expect(signUpButton).toBeEnabled({ timeout: 3000 });
  await signUpButton.click();
  
  // Wait for redirect to dashboard
  try {
    await page.waitForURL(/\/dashboard/, { timeout: 60000 });
    console.log('✅ Signup successful - redirected to dashboard');
  } catch (error) {
    const confirmationMessage = page.getByText(/check your email/i);
    const isConfirmationRequired = await confirmationMessage.isVisible().catch(() => false);
    
    if (isConfirmationRequired) {
      throw new Error('Email confirmation required. Configure Supabase to disable email confirmation for E2E tests.');
    }
    
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
  
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 60000 });
  await expect(page.getByText(/Welcome! Let's Get Started/i)).toBeVisible();
  
  console.log('📝 Filling team initialization form...');
  await page.getByLabel(/your name/i).fill(userName);
  await page.getByLabel(/team name/i).fill(teamName);
  
  const getStartedButton = page.getByRole('button', { name: /get started/i });
  await expect(getStartedButton).toBeEnabled();
  await getStartedButton.click();
  
  // Wait for page reload
  await page.waitForLoadState('networkidle', { timeout: 60000 });
  console.log('✅ Team initialized via UI');
}

/**
 * Helper: Create virtual team member via API
 * Returns the member ID
 */
async function createVirtualMember(
  page: Page,
  teamId: string,
  memberName: string
): Promise<string> {
  console.log(`👤 Creating virtual member: ${memberName}`);
  
  const response = await page.evaluate(async ({ teamId, memberName }) => {
    const res = await fetch(`/api/teams/${teamId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        name: memberName,
        isVirtual: true,
      }),
    });
    
    return {
      status: res.status,
      data: await res.json(),
    };
  }, { teamId, memberName });
  
  if (response.status !== 201 && response.status !== 200) {
    throw new Error(`Failed to create virtual member: ${JSON.stringify(response.data)}`);
  }
  
  console.log(`✅ Virtual member created: ${response.data.id}`);
  return response.data.id;
}

/**
 * Helper: Get team ID from profile
 */
async function getTeamId(page: Page): Promise<string> {
  const response = await page.evaluate(async () => {
    const res = await fetch('/api/auth/profile', {
      method: 'GET',
      credentials: 'include',
    });
    
    return {
      status: res.status,
      data: await res.json(),
    };
  });
  
  if (response.status !== 200) {
    throw new Error('Failed to fetch profile');
  }
  
  return response.data.teamId;
}

/**
 * Helper: Invite member via API
 */
async function inviteMemberViaAPI(
  page: Page,
  memberId: string,
  email: string
): Promise<{ status: number; data: unknown }> {
  return await page.evaluate(async ({ memberId, email }) => {
    const res = await fetch(`/api/team-members/${memberId}/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    
    return {
      status: res.status,
      data: await res.json(),
    };
  }, { memberId, email });
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
// TEST SUITE: Team Member Invitations
// ===================================================================

test.describe('Team Invitations Flow', () => {
  let testEmail: string;
  
  test.beforeEach(() => {
    testEmail = generateTestEmail();
    console.log(`📧 Test email: ${testEmail}`);
  });
  
  test.afterEach(async ({ page }) => {
    await cleanupTestData(testEmail, page);
  });
  
  // ===================================================================
  // TEST 1: Invite Virtual Member
  // ===================================================================
  
  test('Account Owner can create virtual member and send invitation', async ({ page }) => {
    // STEP 1: Sign up and initialize team
    console.log('📝 Step 1: Setting up Account Owner...');
    await signUpNewUser(page, testEmail, TEST_PASSWORD);
    await initializeTeamViaUI(page, TEST_TEAM_NAME, TEST_USER_NAME);
    
    await page.waitForLoadState('networkidle');
    
    // STEP 2: Get team ID
    console.log('🔍 Step 2: Fetching team ID...');
    const teamId = await getTeamId(page);
    console.log(`✅ Team ID: ${teamId}`);
    
    // STEP 3: Create virtual member
    console.log('👤 Step 3: Creating virtual member...');
    const memberId = await createVirtualMember(page, teamId, VIRTUAL_MEMBER_NAME);
    expect(memberId).toBeTruthy();
    
    // STEP 4: Send invitation
    console.log('📧 Step 4: Sending invitation...');
    const inviteeEmail = generateInviteeEmail();
    const inviteResponse = await inviteMemberViaAPI(page, memberId, inviteeEmail);
    
    // STEP 5: Verify invitation sent
    console.log('✅ Step 5: Verifying invitation...');
    expect(inviteResponse.status).toBe(200);
    expect(inviteResponse.data).toHaveProperty('message');
    expect((inviteResponse.data as { message: string }).message).toContain('Invitation sent');
    
    // Verify member status updated
    const memberData = (inviteResponse.data as { member: { invite_status: string } }).member;
    expect(memberData.invite_status).toBe('invite_pending');
    
    console.log('✅ Test complete: Virtual member invited successfully');
  });
  
  // ===================================================================
  // TEST 2: Permission Check - Only Account Owner/Manager Can Invite
  // ===================================================================
  
  test('Non-owner cannot invite team members', async ({ page }) => {
    // STEP 1: Create User A (Account Owner with team)
    console.log('📝 Step 1: Creating User A (Owner)...');
    const userAEmail = generateTestEmail();
    await signUpNewUser(page, userAEmail, TEST_PASSWORD);
    await initializeTeamViaUI(page, 'Team A', 'User A');
    await page.waitForLoadState('networkidle');
    
    const teamAId = await getTeamId(page);
    const memberAId = await createVirtualMember(page, teamAId, 'Virtual Member A');
    
    // Sign out User A
    console.log('🚪 Step 2: Signing out User A...');
    await page.goto('/signin');
    
    // STEP 3: Create User B (will be owner of Team B)
    console.log('📝 Step 3: Creating User B (separate team)...');
    const userBEmail = generateTestEmail();
    await signUpNewUser(page, userBEmail, TEST_PASSWORD);
    await initializeTeamViaUI(page, 'Team B', 'User B');
    await page.waitForLoadState('networkidle');
    
    // STEP 4: Try to invite to Team A (should fail - User B not in Team A)
    console.log('🚫 Step 4: User B attempting to invite to Team A...');
    const inviteeEmail = generateInviteeEmail();
    const inviteResponse = await inviteMemberViaAPI(page, memberAId, inviteeEmail);
    
    // STEP 5: Verify forbidden
    console.log('✅ Step 5: Verifying permission denied...');
    expect(inviteResponse.status).toBe(403);
    expect((inviteResponse.data as { error: string }).error).toContain('Account Owner');
    
    console.log('✅ Test complete: Non-owner correctly blocked from inviting');
    
    // Cleanup both users
    await cleanupTestData(userAEmail, page);
    await cleanupTestData(userBEmail, page);
  });
  
  // ===================================================================
  // TEST 3: Duplicate Email Prevention
  // ===================================================================
  
  test('Cannot invite same email twice', async ({ page }) => {
    // STEP 1: Sign up and initialize team
    console.log('📝 Step 1: Setting up Account Owner...');
    await signUpNewUser(page, testEmail, TEST_PASSWORD);
    await initializeTeamViaUI(page, TEST_TEAM_NAME, TEST_USER_NAME);
    await page.waitForLoadState('networkidle');
    
    const teamId = await getTeamId(page);
    
    // STEP 2: Create first virtual member
    console.log('👤 Step 2: Creating first virtual member...');
    const member1Id = await createVirtualMember(page, teamId, 'Member 1');
    
    // STEP 3: Send first invitation
    console.log('📧 Step 3: Sending first invitation...');
    const inviteeEmail = generateInviteeEmail();
    const invite1Response = await inviteMemberViaAPI(page, member1Id, inviteeEmail);
    expect(invite1Response.status).toBe(200);
    
    // STEP 4: Create second virtual member
    console.log('👤 Step 4: Creating second virtual member...');
    const member2Id = await createVirtualMember(page, teamId, 'Member 2');
    
    // STEP 5: Try to invite same email again (should fail)
    console.log('🚫 Step 5: Attempting duplicate invitation...');
    const invite2Response = await inviteMemberViaAPI(page, member2Id, inviteeEmail);
    
    // STEP 6: Verify duplicate prevention
    console.log('✅ Step 6: Verifying duplicate blocked...');
    expect(invite2Response.status).toBe(400);
    expect((invite2Response.data as { error: string }).error).toContain('already');
    
    console.log('✅ Test complete: Duplicate email correctly prevented');
  });
  
  // ===================================================================
  // TEST 4: Cannot Invite Non-Virtual Member
  // ===================================================================
  
  test('Cannot send invitation to real (non-virtual) member', async ({ page }) => {
    // STEP 1: Sign up and initialize team
    console.log('📝 Step 1: Setting up Account Owner...');
    await signUpNewUser(page, testEmail, TEST_PASSWORD);
    await initializeTeamViaUI(page, TEST_TEAM_NAME, TEST_USER_NAME);
    await page.waitForLoadState('networkidle');
    
    // STEP 2: Get the Account Owner's member ID (non-virtual)
    console.log('🔍 Step 2: Fetching Account Owner member ID...');
    const profileResponse = await page.evaluate(async () => {
      const res = await fetch('/api/auth/profile', {
        credentials: 'include',
      });
      return {
        status: res.status,
        data: await res.json(),
      };
    });
    
    const ownerId = (profileResponse.data as { teamMemberId: string }).teamMemberId;
    
    // STEP 3: Try to invite the real member (should fail)
    console.log('🚫 Step 3: Attempting to invite real member...');
    const inviteeEmail = generateInviteeEmail();
    const inviteResponse = await inviteMemberViaAPI(page, ownerId, inviteeEmail);
    
    // STEP 4: Verify rejection
    console.log('✅ Step 4: Verifying rejection...');
    expect(inviteResponse.status).toBe(400);
    expect((inviteResponse.data as { error: string }).error).toContain('virtual');
    
    console.log('✅ Test complete: Real member invitation correctly blocked');
  });
  
  // ===================================================================
  // TEST 5: Cannot Invite Already-Invited Member
  // ===================================================================
  
  test('Cannot re-invite member with pending invitation', async ({ page }) => {
    // STEP 1: Sign up and initialize team
    console.log('📝 Step 1: Setting up Account Owner...');
    await signUpNewUser(page, testEmail, TEST_PASSWORD);
    await initializeTeamViaUI(page, TEST_TEAM_NAME, TEST_USER_NAME);
    await page.waitForLoadState('networkidle');
    
    const teamId = await getTeamId(page);
    
    // STEP 2: Create virtual member
    console.log('👤 Step 2: Creating virtual member...');
    const memberId = await createVirtualMember(page, teamId, VIRTUAL_MEMBER_NAME);
    
    // STEP 3: Send first invitation
    console.log('📧 Step 3: Sending first invitation...');
    const inviteeEmail = generateInviteeEmail();
    const invite1Response = await inviteMemberViaAPI(page, memberId, inviteeEmail);
    expect(invite1Response.status).toBe(200);
    
    // STEP 4: Try to invite same member again (should fail)
    console.log('🚫 Step 4: Attempting to re-invite same member...');
    const invite2Response = await inviteMemberViaAPI(page, memberId, inviteeEmail);
    
    // STEP 5: Verify duplicate prevention
    console.log('✅ Step 5: Verifying re-invite blocked...');
    expect(invite2Response.status).toBe(400);
    expect((invite2Response.data as { error: string }).error).toContain('already been sent');
    
    console.log('✅ Test complete: Re-invitation correctly prevented');
  });
});
