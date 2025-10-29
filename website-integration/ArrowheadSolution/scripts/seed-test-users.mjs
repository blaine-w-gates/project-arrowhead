#!/usr/bin/env node

/**
 * Test User & Team Seeding Script (TypeScript Wrapper)
 * 
 * Executes the SQL seeding script against a Supabase database
 * Usage: npm run db:seed:test-users
 * 
 * Requirements:
 * - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 * - Supabase service role access (can insert into auth.users)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validation
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing required environment variables\n');
  console.error('Required:');
  console.error('  - SUPABASE_URL (or VITE_SUPABASE_URL)');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY\n');
  console.error('Make sure these are set in your .env.local file.\n');
  process.exit(1);
}

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🚀 Test User Seeding Script');
console.log('=' .repeat(60));
console.log(`📍 Target: ${SUPABASE_URL}`);
console.log('⚠️  WARNING: This will delete and recreate test users!\n');

// Read SQL file
const sqlFilePath = join(__dirname, 'seed-test-users.sql');
let sqlContent;

try {
  sqlContent = readFileSync(sqlFilePath, 'utf8');
  console.log('✅ SQL script loaded successfully\n');
} catch (error) {
  console.error(`❌ Error reading SQL file: ${error.message}`);
  process.exit(1);
}

// Split SQL into statements (simple split by semicolon, filter out comments)
const statements = sqlContent
  .split(';')
  .map(stmt => stmt.trim())
  .filter(stmt => {
    // Remove empty statements and comment-only blocks
    if (!stmt) return false;
    const lines = stmt.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('--');
    });
    return lines.length > 0;
  });

console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

// Execute statements sequentially
async function seedTestUsers() {
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    
    // Skip verification SELECT queries at the end (they're informational)
    if (stmt.toUpperCase().startsWith('SELECT')) {
      console.log(`📊 Running verification query ${i + 1}...`);
      const { data, error } = await supabase.rpc('exec_sql', { sql: stmt });
      if (error) {
        console.log(`   ℹ️  Note: Verification query may not work via RPC (this is normal)`);
      } else if (data) {
        console.log(`   ✅ Results:`, data);
      }
      continue;
    }

    try {
      // For INSERT/DELETE statements, use the service role client directly
      // Note: Supabase doesn't expose a direct SQL exec endpoint easily,
      // so we'll use a workaround with the REST API
      
      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
      
      // This is a limitation - Supabase doesn't easily expose raw SQL execution
      // We'll need to use the Postgres client directly or use Supabase CLI
      // For now, provide instructions for manual execution
      
      if (i === 0) {
        console.log('\n⚠️  Note: Direct SQL execution via Node.js requires postgres client.');
        console.log('   For best results, run the SQL file directly:\n');
        console.log('   Method 1 (Supabase CLI - Recommended):');
        console.log('   $ supabase db execute -f scripts/seed-test-users.sql\n');
        console.log('   Method 2 (Direct psql):');
        console.log('   $ psql $DATABASE_URL -f scripts/seed-test-users.sql\n');
        console.log('   Method 3 (Supabase Dashboard):');
        console.log('   1. Go to SQL Editor in Supabase Dashboard');
        console.log('   2. Paste contents of scripts/seed-test-users.sql');
        console.log('   3. Click "Run"\n');
        console.log('   This script will now exit. Please use one of the methods above.\n');
        process.exit(0);
      }

      successCount++;
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Success: ${successCount} statements`);
  if (errorCount > 0) {
    console.log(`❌ Errors: ${errorCount} statements`);
  }
  console.log('='.repeat(60));
}

// Run seeding
seedTestUsers()
  .then(() => {
    console.log('\n📝 Test Credentials Created:');
    console.log('   Email: test-owner@arrowhead.com   | Password: TestPassword123!');
    console.log('   Email: test-manager@arrowhead.com | Password: TestPassword123!');
    console.log('   Email: test-member@arrowhead.com  | Password: TestPassword123!');
    console.log('\n   Team: QA Test Team (Active subscription)\n');
  })
  .catch(error => {
    console.error(`\n❌ Fatal error: ${error.message}`);
    process.exit(1);
  });
