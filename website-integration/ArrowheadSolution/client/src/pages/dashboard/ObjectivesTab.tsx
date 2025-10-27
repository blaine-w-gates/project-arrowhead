/**
 * Objectives Tab (Tab 2)
 * 
 * Displays objectives and their 17-step journey
 * Features: Journey state management, Yes/No branching, locking
 * 
 * PRD v5.2 Section 3.2: Objectives UI & Journey Integration
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Target } from 'lucide-react';
import { ObjectivesList } from '@/components/objectives/ObjectivesList';
import { CompletionTracker } from '@/components/projects/CompletionTracker';
import { AddObjectiveModal } from '@/components/objectives/AddObjectiveModal';
import { ObjectiveJourneyWizard } from '@/components/objectives/ObjectiveJourneyWizard';

interface Project {
  id: number;
  name: string;
  isArchived: boolean;
  completionStatus: boolean | null;
  estimatedCompletionDate: string | null;
}

export default function ObjectivesTab() {
  const { profile } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showAddObjectiveModal, setShowAddObjectiveModal] = useState(false);
  const [journeyObjectiveId, setJourneyObjectiveId] = useState<number | null>(null);

  // Fetch projects for dropdown
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
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
  const selectedProject = activeProjects.find(p => p.id === selectedProjectId);

  if (!profile) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertDescription>Please sign in to view objectives.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Objectives</h1>
        <p className="text-muted-foreground mt-2">
          Track objective progress through the 17-step journey
        </p>
      </div>

      {/* Project Filter */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Select Project</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedProjectId?.toString() || ''}
            onValueChange={(value) => setSelectedProjectId(parseInt(value))}
            disabled={projectsLoading || activeProjects.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={
                projectsLoading
                  ? 'Loading projects...'
                  : activeProjects.length === 0
                  ? 'No active projects'
                  : 'Select a project'
              } />
            </SelectTrigger>
            <SelectContent>
              {activeProjects.map((project) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {activeProjects.length === 0 && !projectsLoading && (
            <p className="text-sm text-muted-foreground mt-2">
              Create a project in the Projects tab first
            </p>
          )}
        </CardContent>
      </Card>

      {/* Project Selected - Show Objectives */}
      {selectedProject ? (
        <div className="space-y-6">
          {/* Completion Tracker for selected project */}
          <Card>
            <CardHeader>
              <CardTitle>Project: {selectedProject.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <CompletionTracker
                projectId={selectedProject.id}
                completionStatus={selectedProject.completionStatus}
                estimatedCompletionDate={selectedProject.estimatedCompletionDate}
              />
            </CardContent>
          </Card>

          {/* Objectives List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Objectives
              </CardTitle>
              <Button size="sm" onClick={() => setShowAddObjectiveModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Objective
              </Button>
            </CardHeader>
            <CardContent>
              <ObjectivesList 
                projectId={selectedProject.id}
                onObjectiveClick={(objectiveId: number) => setJourneyObjectiveId(objectiveId)}
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Select a project above to view and manage its objectives
            </p>
          </CardContent>
        </Card>
      )}

      {/* Add Objective Modal */}
      {selectedProjectId && (
        <AddObjectiveModal
          open={showAddObjectiveModal}
          onClose={() => setShowAddObjectiveModal(false)}
          projectId={selectedProjectId}
          onObjectiveCreated={(objectiveId: number) => setJourneyObjectiveId(objectiveId)}
        />
      )}

      {/* Objective Journey Wizard */}
      {journeyObjectiveId && (
        <ObjectiveJourneyWizard
          open={!!journeyObjectiveId}
          onClose={() => setJourneyObjectiveId(null)}
          objectiveId={journeyObjectiveId}
        />
      )}
    </div>
  );
}
