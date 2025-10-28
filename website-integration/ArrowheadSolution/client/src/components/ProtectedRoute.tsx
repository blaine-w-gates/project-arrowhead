/**
 * Protected Route Component
 * 
 * Wraps routes that require authentication and active subscription
 * 
 * Business Logic:
 * 1. Redirects to /signin if user is not authenticated
 * 2. Redirects to /payment-required if trial has expired or subscription is inactive
 * 3. Shows trial ending banner if 3 days or less remain
 * 4. Allows access if subscription is active or trial is valid
 */

import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'wouter';
import { TrialEndingBanner } from './TrialEndingBanner';
import PaymentRequiredPage from '@/pages/PaymentRequiredPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to signin
  if (!user) {
    return <Redirect to="/signin" />;
  }

  // Authenticated but no profile - this shouldn't happen, but allow access
  // (User might be in the process of initializing their team)
  if (!profile) {
    return <>{children}</>;
  }

  // Check subscription status
  const subscriptionStatus = profile.subscriptionStatus || 'inactive';
  const daysLeftInTrial = profile.daysLeftInTrial;

  // If on trial
  if (subscriptionStatus === 'trialing') {
    // Trial expired - require payment
    if (daysLeftInTrial !== null && daysLeftInTrial !== undefined && daysLeftInTrial <= 0) {
      return <PaymentRequiredPage />;
    }

    // Trial ending soon (3 days or less) - show banner
    if (daysLeftInTrial !== null && daysLeftInTrial !== undefined && daysLeftInTrial <= 3) {
      return (
        <>
          <TrialEndingBanner daysLeft={daysLeftInTrial} />
          {children}
        </>
      );
    }

    // Trial still active with >3 days - allow access
    return <>{children}</>;
  }

  // If active subscription - allow access
  if (subscriptionStatus === 'active') {
    return <>{children}</>;
  }

  // All other statuses (inactive, expired, canceled, past_due, etc.) - require payment
  return <PaymentRequiredPage />;
}
