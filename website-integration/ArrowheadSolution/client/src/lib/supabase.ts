/**
 * Supabase Client for Frontend
 * 
 * Creates browser-side Supabase client for:
 * - User authentication
 * - Session management
 * - API calls with JWT tokens
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Supabase credentials not configured. Auth features will not work.');
}

/**
 * Supabase client for browser
 * Handles authentication and session persistence
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
