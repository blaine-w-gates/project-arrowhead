/**
 * Scoreboard Tab (Tab 3 - Tasks)
 * 
 * Displays tasks and team member status updates
 * Features: Multi-assignment, status tracking, touchbases
 */

import { useAuth } from '@/contexts/AuthContext';

export default function ScoreboardTab() {
  const { profile } = useAuth();

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Scoreboard</h1>
        <p className="text-muted-foreground mt-2">
          View tasks, team member status, and weekly touchbases
        </p>
      </div>

      <div className="bg-card border rounded-lg p-8 text-center">
        <h2 className="text-xl font-semibold mb-4">Scoreboard Coming Soon</h2>
        <p className="text-muted-foreground mb-6">
          This tab will display all tasks with multi-assignment support,
          team member status updates, and touchbase (1-on-1) management.
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
