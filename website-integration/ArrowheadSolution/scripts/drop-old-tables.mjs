/**
 * Drop Old Application Tables
 * Prepares database for fresh Team MVP migration by removing old schema tables
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.join(__dirname, '..', 'server');

// Load env files
dotenv.config({ path: path.join(serverDir, '.env.local') });
dotenv.config({ path: path.join(serverDir, '.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

console.log('🔌 Connecting to database...');

// Create connection
const client = new pg.Client({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: true }
});

async function dropOldTables() {
  try {
    await client.connect();
    console.log('✓ Connected\n');
    console.log('🗑️  Dropping old application tables...\n');

    const tables = [
      'auth_events',
      'auth_totp',
      'auth_otp',
      'admin_audit_log',
      'admin_users',
      'tasks',
      'journey_sessions',
      'user_subscriptions',
      'email_subscribers',
      'blog_posts',
      'users',
    ];

    for (const table of tables) {
      try {
        await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        console.log(`  ✓ Dropped ${table}`);
      } catch (error) {
        console.log(`  ⚠️  Could not drop ${table}: ${error.message}`);
      }
    }

    console.log('\n✅ Database cleaned - ready for fresh Team MVP migration');
    console.log('📝 Note: drizzle_migrations table preserved for migration history\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

dropOldTables();
