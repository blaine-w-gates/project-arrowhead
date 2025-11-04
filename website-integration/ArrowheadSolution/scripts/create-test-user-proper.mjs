#!/usr/bin/env node

/**
 * CREATE TEST USER PROPERLY
 * 
 * This script uses Supabase Admin API to create a complete, valid user
 * that won't crash on login (unlike direct SQL inserts).
 * 
 * Usage:
 *   node scripts/create-test-user-proper.mjs
 */

import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const supabaseUrl = 'https://jzjkaxildffxhudeocvp.supabase.co';
const supabaseServiceRole = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6amtheGlsZGZmeGh1ZGVvY3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg3MTY4NSwiZXhwIjoyMDcxNDQ3Njg1fQ.DXszjrtSOIuypFC1p_GDWQ7QSZfZtub_B8Tak8nmwS8';

// Create Supabase Admin Client (bypasses RLS, creates proper users)
const supabase = createClient(supabaseUrl, supabaseServiceRole, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestUser() {
  console.log('🚀 Creating test user via Supabase Admin API...\n');

  try {
    // Step 1: Create user in auth.users (the proper way)
    console.log('📝 Step 1: Creating auth user...');
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'test-owner@arrowhead.com',
      password: 'TestPassword123!',
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        name: 'Test Owner'
      }
    });

    if (authError) {
      throw new Error(`Failed to create auth user: ${authError.message}`);
    }

    console.log(`✅ Auth user created: ${authUser.user.id}`);
    console.log(`   Email: ${authUser.user.email}`);
    console.log(`   Confirmed: ${authUser.user.email_confirmed_at ? 'Yes' : 'No'}\n`);

    // Step 2: Create test team
    console.log('📝 Step 2: Creating QA Test Team...');
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: 'QA Test Team',
        subscription_status: 'active',
        trial_ends_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      })
      .select()
      .single();

    if (teamError) {
      throw new Error(`Failed to create team: ${teamError.message}`);
    }

    console.log(`✅ Team created: ${team.id}`);
    console.log(`   Name: ${team.name}`);
    console.log(`   Status: ${team.subscription_status}`);
    console.log(`   Trial ends: ${team.trial_ends_at}\n`);

    // Step 3: Link user to team
    console.log('📝 Step 3: Linking user to team...');
    const { data: teamMember, error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: authUser.user.id,
        name: 'Test Owner',
        email: 'test-owner@arrowhead.com',
        role: 'Account Owner',
        invite_status: 'active',
        is_virtual: false
      })
      .select()
      .single();

    if (memberError) {
      throw new Error(`Failed to link user to team: ${memberError.message}`);
    }

    console.log(`✅ Team member created: ${teamMember.id}`);
    console.log(`   Role: ${teamMember.role}`);
    console.log(`   Status: ${teamMember.invite_status}\n`);

    // Success Summary
    console.log('🎉 SUCCESS! Test user setup complete.\n');
    console.log('📋 TEST CREDENTIALS:');
    console.log('   Email: test-owner@arrowhead.com');
    console.log('   Password: TestPassword123!');
    console.log('   Team: QA Test Team');
    console.log('   Role: Account Owner');
    console.log('   Subscription: Active (bypasses paywall)\n');
    console.log('🧪 NEXT STEP: Test login at:');
    console.log('   https://project-arrowhead.pages.dev/signin\n');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('\n📊 Troubleshooting:');
    console.error('   1. Verify Supabase service_role key is correct');
    console.error('   2. Ensure cleanup script was run first');
    console.error('   3. Check Supabase dashboard for error details\n');
    process.exit(1);
  }
}

// Run the script
createTestUser();
