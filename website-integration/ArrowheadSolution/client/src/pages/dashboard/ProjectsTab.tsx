/**
 * Projects Tab (Tab 1)
 * 
 * Displays all projects for the team
 * Features: CRUD, Vision statements, Completion tracking
 */

import { useAuth } from '@/contexts/AuthContext';

export default function ProjectsTab() {
  const { profile } = useAuth();

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Projects</h1>
        <p className="text-muted-foreground mt-2">
          Manage your team's projects and track vision statements
        </p>
      </div>

      <div className="bg-card border rounded-lg p-8 text-center">
        <h2 className="text-xl font-semibold mb-4">Projects Dashboard Coming Soon</h2>
        <p className="text-muted-foreground mb-6">
          This tab will display all projects for your team with CRUD operations,
          vision statements, and completion tracking.
        </p>
        
        {profile && (
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Logged in as:</strong> {profile.name}</p>
            <p><strong>Role:</strong> {profile.role}</p>
            <p><strong>Team ID:</strong> {profile.teamId}</p>
          </div>
        )}
      </div>
    </div>
  );
}
