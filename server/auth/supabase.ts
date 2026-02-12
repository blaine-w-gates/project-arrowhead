/**
 * Supabase Client Configuration
 * 
 * Creates a server-side Supabase client for:
 * - JWT verification
 * - Admin operations (invitations)
 * - Database queries with service role
 * 
 * Based on: SLAD v6.0 Final, Section 4.0 Security Model
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..', '..');
dotenv.config({ path: path.join(projectRoot, '.env.local') });
dotenv.config({ path: path.join(projectRoot, '.env') });

// Validate required environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

// Check if we have real credentials
const hasRealCredentials = !!SUPABASE_URL && !!SUPABASE_SERVICE_ROLE_KEY;

// Determine if we're in a test/CI environment
const isCI = process.env.CI === 'true';
const isVitest = !!process.env.VITEST;
const isTestEnvironment = process.env.NODE_ENV === 'test' || isCI || isVitest;

// Use dummy credentials ONLY if in test env AND real credentials are missing
const useDummyCredentials = isTestEnvironment && !hasRealCredentials;

// Set final values
const finalSupabaseUrl = SUPABASE_URL || (useDummyCredentials ? 'http://test-supabase.local' : '');
const finalServiceRoleKey = SUPABASE_SERVICE_ROLE_KEY || (useDummyCredentials ? 'test-service-role-key' : '');
const finalJwtSecret = SUPABASE_JWT_SECRET || (useDummyCredentials ? 'test-jwt-secret' : '');

// Validation and warnings
if (!hasRealCredentials && !useDummyCredentials) {
  // Production/non-test environment without credentials = ERROR
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
}

if (useDummyCredentials) {
  console.warn('⚠️  Supabase admin client using DUMMY credentials (test mode). Real Supabase operations will fail.');
} else if (isTestEnvironment) {
  console.log('✅ Supabase admin client initialized with REAL credentials in CI/test environment');
}

if (!SUPABASE_JWT_SECRET && hasRealCredentials) {
  console.warn('⚠️  SUPABASE_JWT_SECRET not set - JWT verification may fail');
}

/**
 * Server-side Supabase client with service role
 * Use for admin operations and database queries
 */
export const supabaseAdmin: SupabaseClient = createClient(
  finalSupabaseUrl,
  finalServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Supabase client with anon key (for public operations)
 * Rarely used server-side, but available if needed
 */
export const supabaseClient: SupabaseClient | null = SUPABASE_ANON_KEY
  ? createClient(finalSupabaseUrl, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  : null;

/**
 * Get Supabase admin client with validation
 * Throws error if used in test environment where real Supabase is not available
 * Use this when you need to ensure real Supabase admin access
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (useDummyCredentials) {
    throw new Error('Supabase admin client requested but running in TEST mode with dummy credentials. Mock this function in tests or provide real credentials.');
  }
  return supabaseAdmin;
}

/**
 * JWT secret for manual verification (if needed)
 * Supabase JWTs are signed with this secret
 */
export const jwtSecret = finalJwtSecret;

/**
 * Extract user ID from Supabase JWT
 * Supabase JWTs have the user ID in the 'sub' claim
 */
export function getUserIdFromJwt(jwt: string): string | null {
  try {
    const payload = jwt.split('.')[1];
    if (!payload) return null;

    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
    return decoded.sub || null;
  } catch {
    // Invalid JWT format, return null
    return null;
  }
}

/**
 * Verify Supabase JWT using the admin client
 * Returns user data if valid, null if invalid
 */
export async function verifySupabaseJwt(jwt: string): Promise<{
  valid: boolean;
  userId?: string;
  email?: string;
  role?: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(jwt);

    if (error || !data.user) {
      return {
        valid: false,
        error: error?.message || 'Invalid token',
      };
    }

    return {
      valid: true,
      userId: data.user.id,
      email: data.user.email,
      role: data.user.role,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
