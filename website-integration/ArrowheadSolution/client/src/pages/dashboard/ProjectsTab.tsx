/**
 * Projects Tab (Tab 1)
 * 
 * Displays all projects for the team
 * Features: CRUD, Vision statements, Completion tracking
 * 
 * PRD v5.2 Section 3.1: Project Vision & Completion Tracker
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { AddProjectModal } from '@/components/projects/AddProjectModal';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Project {
  id: number;
  name: string;
  isArchived: boolean;
  visionData: {
    question1?: string;
    question2?: string;
    question3?: string;
    question4?: string;
    question5?: string;
  } | null;
  completionStatus: boolean | null;
  estimatedCompletionDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ProjectsTab() {
  const { profile } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Fetch projects
  const { data: projects, isLoading, error } = useQuery<Project[]>({
    queryKey: ['projects', profile?.teamId],
    queryFn: async () => {
      if (!profile?.teamId) throw new Error('No team ID');
      
      const response = await fetch(`/api/teams/${profile.teamId}/projects`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      
      return response.json();
    },
    enabled: !!profile?.teamId,
  });

  const activeProjects = projects?.filter(p => !p.isArchived) || [];
  const archivedProjects = projects?.filter(p => p.isArchived) || [];

  if (!profile) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertDescription>Please sign in to view projects.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-2">
            Manage your team's projects and track vision statements
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Project
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            Failed to load projects. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      ) : (
        <>
          {/* Active Projects */}
          <div className="space-y-4 mb-8">
            {activeProjects.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">No active projects yet.</p>
                  <Button onClick={() => setShowAddModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Project
                  </Button>
                </CardContent>
              </Card>
            ) : (
              activeProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  teamId={profile.teamId}
                />
              ))
            )}
          </div>

          {/* Archived Projects Toggle */}
          {archivedProjects.length > 0 && (
            <div className="mt-8">
              <Button
                variant="outline"
                onClick={() => setShowArchived(!showArchived)}
                className="w-full mb-4"
              >
                {showArchived ? (
                  <>
                    <ChevronUp className="mr-2 h-4 w-4" />
                    Hide Archived Projects ({archivedProjects.length})
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-2 h-4 w-4" />
                    Show Archived Projects ({archivedProjects.length})
                  </>
                )}
              </Button>

              {showArchived && (
                <div className="space-y-4">
                  {archivedProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      teamId={profile.teamId}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Add Project Modal */}
      <AddProjectModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        teamId={profile.teamId}
      />
    </div>
  );
}
