/**
 * Supabase Client for Frontend
 * 
 * Creates browser-side Supabase client for:
 * - User authentication
 * - Session management
 * - API calls with JWT tokens
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'dummy-anon-key-for-testing';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('⚠️  Supabase credentials not configured. Using dummy values. Auth features will not work.');
}

/**
 * Supabase client for browser
 * Handles authentication and session persistence
 * 
 * Note: If credentials are not configured, this creates a dummy client
 * that won't block the app from rendering free features
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
