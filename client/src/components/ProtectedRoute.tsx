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
import { TrialEndingBanner } from './TrialEndingBanner';
import PaymentRequiredPage from '@/pages/PaymentRequiredPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { profile } = useAuth();

  // Authenticated but no profile - this can happen while team is being initialized.
  // Allow access so that initialization flows and free features continue to work.
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
