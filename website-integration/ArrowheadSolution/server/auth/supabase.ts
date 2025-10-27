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

// Validate required environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

if (!SUPABASE_URL) {
  throw new Error('SUPABASE_URL environment variable is required');
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required for server-side operations');
}

if (!SUPABASE_JWT_SECRET) {
  console.warn('⚠️  SUPABASE_JWT_SECRET not set - JWT verification will use default (insecure for production)');
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
