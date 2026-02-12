/**
 * Authentication Context Provider
 * 
 * Manages user authentication state across the application
 * Provides: userId, teamId, role, JWT token, login/logout functions
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface TeamMemberProfile {
  id: string;
  teamId: string;
  role: string;
  name: string;
  email: string;
  isVirtual: boolean;
  // Subscription info for trial logic
  subscriptionStatus?: string;
  trialEndsAt?: string | null;
  daysLeftInTrial?: number | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: TeamMemberProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<TeamMemberProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch team member profile from backend
  const fetchProfile = async (userId: string, token: string) => {
    try {
      const response = await fetch(`/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile({
          id: data.teamMemberId,
          teamId: data.teamId,
          role: data.role,
          name: data.name || '',
          email: data.email || '',
          isVirtual: data.isVirtual || false,
          subscriptionStatus: data.subscriptionStatus,
          trialEndsAt: data.trialEndsAt,
          daysLeftInTrial: data.daysLeftInTrial,
        });
      } else {
        // Profile fetch failed - this is OK, user can still use free features
        console.warn('Profile fetch failed - free features will work without auth');
        setProfile(null);
      }
    } catch (error) {
      // Network error or API not available - this is OK for free journey features
      console.warn('Profile fetch error (API may not be available):', error);
      setProfile(null);
    }
  };

  // Initialize session on mount
  useEffect(() => {
    // Get initial session, including team profile, before clearing loading state
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user && session?.access_token) {
          await fetchProfile(session.user.id, session.access_token);
        } else {
          setProfile(null);
        }
      })
      .catch((error) => {
        // Supabase not configured or error - this is OK for free features
        console.warn('Supabase session init failed (expected in E2E tests):', error);
        setSession(null);
        setUser(null);
        setProfile(null);
      })
      .finally(() => {
        setLoading(false);
      });

    // Listen for auth changes (login/logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user && session?.access_token) {
        await fetchProfile(session.user.id, session.access_token);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (session?.user && session?.access_token) {
      await fetchProfile(session.user.id, session.access_token);
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
