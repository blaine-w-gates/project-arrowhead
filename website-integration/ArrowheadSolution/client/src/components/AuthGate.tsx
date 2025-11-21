import React, { useEffect, useState } from 'react';
import { Redirect } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGateProps {
  children: React.ReactNode;
}

/**
 * AuthGate
 *
 * Centralizes basic authentication gating for client routes.
 * - While auth state is loading, shows a blocking spinner.
 * - If there is no authenticated user/session, redirects to /signin.
 * - If authenticated, renders children.
 */
export function AuthGate({ children }: AuthGateProps) {
  const { user, session, loading } = useAuth();

  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !session)) {
      setShouldRedirect(true);
    }
  }, [loading, user, session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (shouldRedirect) {
    return <Redirect to="/signin" />;
  }

  return <>{children}</>;
}
