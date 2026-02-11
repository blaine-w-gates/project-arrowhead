/**
 * Journey Upgrade Banner Component
 * 
 * Displays a persistent banner on journey pages for unauthenticated users
 * promoting the Team MVP features
 */

import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Users, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function JourneyUpgradeBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { user } = useAuth();

  // Don't show banner if user is authenticated or banner is dismissed
  if (user || dismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-primary/10 to-blue-50 border-b border-primary/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="hidden sm:flex w-10 h-10 bg-primary/10 rounded-full items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                <span className="font-semibold">Working with your team?</span>{' '}
                <span className="hidden sm:inline text-muted-foreground">
                  Sign in to sync progress or start a free trial to collaborate on tasks.
                </span>
                <span className="sm:hidden text-muted-foreground">
                  Collaborate with your team!
                </span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
              <Link href="/signin">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/signup">
                <span className="hidden sm:inline">Start Free Trial</span>
                <span className="sm:hidden">Get Started</span>
              </Link>
            </Button>
            <button
              onClick={() => setDismissed(true)}
              className="text-muted-foreground hover:text-foreground p-1"
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
