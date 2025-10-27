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

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Check if in a test environment (Vitest integration tests or Playwright E2E tests)
const isTestEnvironment = process.env.NODE_ENV === 'test' || !!process.env.VITEST;

// Validate required environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || (isTestEnvironment ? 'http://test-supabase.local' : '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || (isTestEnvironment ? 'test-service-role-key' : '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || (isTestEnvironment ? 'test-jwt-secret' : '');

// Only throw errors in non-test environments
if (!isTestEnvironment) {
  if (!SUPABASE_URL) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required for server-side operations');
  }

  if (!SUPABASE_JWT_SECRET) {
    console.warn('⚠️  SUPABASE_JWT_SECRET not set - JWT verification will use default (insecure for production)');
  }
} else {
  // Log warning in test environments
  console.warn('⚠️  Supabase admin client running in TEST mode with dummy credentials. Admin API calls will not work with real Supabase.');
}

/**
 * Server-side Supabase client with service role
 * Use for admin operations and database queries
 */
export const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
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
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
  if (isTestEnvironment && !process.env.SUPABASE_URL) {
    throw new Error('Supabase admin client requested but not initialized. Running in test mode without real Supabase credentials. Mock this function in tests or provide real credentials.');
  }
  return supabaseAdmin;
}

/**
 * JWT secret for manual verification (if needed)
 * Supabase JWTs are signed with this secret
 */
export const jwtSecret = SUPABASE_JWT_SECRET || '';

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
