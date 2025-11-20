/**
 * Team Initialization Modal
 * 
 * Appears after successful signup when user has no team yet.
 * Prompts for team name and user name, then calls initialize-team API.
 * 
 * Trigger Conditions:
 * - User is authenticated (session exists)
 * - User profile is null (no team membership)
 * - Not in loading state
 * 
 * Non-dismissible: User must complete team initialization to proceed.
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export function TeamInitializationModal() {
  const { session, profile, loading, refreshProfile } = useAuth();
  const [, setLocation] = useLocation();
  const [userName, setUserName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Determine if modal should be open
  // Show when: authenticated + not loading + no profile
  const isOpen = !!session && !loading && !profile;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!userName.trim()) {
      setError('Your name is required');
      return;
    }

    if (!teamName.trim()) {
      setError('Team name is required');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/initialize-team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          userName: userName.trim(),
          teamName: teamName.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to initialize team');
      }

      // Success! Refresh profile to fetch updated team membership
      // Using refreshProfile instead of window.location.reload() to preserve session
      await refreshProfile();
      
      // Explicitly navigate to dashboard to ensure proper routing
      // This prevents any potential redirect issues from stale auth state
      setLocation('/dashboard/projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSubmitting(false);
    }
  };

  // Don't render anything if conditions aren't met
  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {/* Non-dismissible */}}>
      <DialogContent 
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Welcome! Let's Get Started</DialogTitle>
          <DialogDescription>
            Create your team to start collaborating on projects and objectives.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="userName">Your Name</Label>
            <Input
              id="userName"
              type="text"
              placeholder="John Doe"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              disabled={submitting}
              required
              autoFocus
            />
            <p className="text-sm text-muted-foreground">
              This is how you'll appear to your team members.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="teamName">Team Name</Label>
            <Input
              id="teamName"
              type="text"
              placeholder="Acme Inc."
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              disabled={submitting}
              required
            />
            <p className="text-sm text-muted-foreground">
              You can change this later in team settings.
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating your team...
              </>
            ) : (
              'Get Started'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
