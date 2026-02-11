/**
 * Trial Ending Banner Component
 * 
 * Displays a persistent banner when trial is ending soon (3 days or less)
 */

import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { AlertCircle, X } from 'lucide-react';
import { useState } from 'react';

interface TrialEndingBannerProps {
  daysLeft: number;
}

export function TrialEndingBanner({ daysLeft }: TrialEndingBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  const getMessage = () => {
    if (daysLeft === 0) {
      return 'Your trial ends today!';
    } else if (daysLeft === 1) {
      return 'Your trial ends tomorrow!';
    } else {
      return `Your trial ends in ${daysLeft} days`;
    }
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">
                {getMessage()}{' '}
                <span className="text-amber-700">
                  Subscribe now to keep your team's access uninterrupted.
                </span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/pricing">Subscribe Now</Link>
            </Button>
            <button
              onClick={() => setDismissed(true)}
              className="text-amber-600 hover:text-amber-900 p-1"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
