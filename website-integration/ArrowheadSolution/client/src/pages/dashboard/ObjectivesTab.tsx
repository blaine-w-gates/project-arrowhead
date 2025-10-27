/**
 * Objectives Tab (Tab 2)
 * 
 * Displays objectives and their 17-step journey
 * Features: Journey state management, Yes/No branching, locking
 */

import { useAuth } from '@/contexts/AuthContext';

export default function ObjectivesTab() {
  const { profile } = useAuth();

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Objectives</h1>
        <p className="text-muted-foreground mt-2">
          Track objective progress through the 17-step journey
        </p>
      </div>

      <div className="bg-card border rounded-lg p-8 text-center">
        <h2 className="text-xl font-semibold mb-4">Objectives Journey Coming Soon</h2>
        <p className="text-muted-foreground mb-6">
          This tab will display objectives with their 17-step journey progress,
          Yes/No branching logic, and edit locking mechanisms.
        </p>
        
        {profile && (
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Logged in as:</strong> {profile.name}</p>
            <p><strong>Role:</strong> {profile.role}</p>
          </div>
        )}
      </div>
    </div>
  );
}
