/**
 * Scoreboard Tab (Tab 3 - Tasks)
 * 
 * Displays tasks and team member status updates
 * Features: Multi-assignment, status tracking, touchbases
 * 
 * PRD v5.2 Section 3.3: Scoreboard UI & Task Management
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ClipboardList } from 'lucide-react';
import { ProjectTaskTable } from '@/components/scoreboard/ProjectTaskTable';
import { TouchbaseLog } from '@/components/scoreboard/TouchbaseLog';
import { AddTaskModal } from '@/components/scoreboard/AddTaskModal';
import { CompletionTracker } from '@/components/projects/CompletionTracker';

interface Project {
  id: string;
  name: string;
  isArchived: boolean;
}

interface ProjectsResponse {
  projects: Project[];
  total: number;
}

interface Objective {
  id: string;
  name: string;
  completionStatus: boolean | null;
  estimatedCompletionDate: string | null;
}

export default function ScoreboardTab() {
  const { profile, session } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);

  // Fetch projects
  const { data: projectsResponse, isLoading: projectsLoading } = useQuery<ProjectsResponse>({
    queryKey: ['projects', profile?.teamId],
    queryFn: async () => {
      if (!profile?.teamId) throw new Error('No team ID');
      
      const response = await fetch(`/api/teams/${profile.teamId}/projects`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      
      return response.json();
    },
    enabled: !!profile?.teamId,
  });

  // Fetch objectives for selected project
  const { data: objectives, isLoading: objectivesLoading } = useQuery<Objective[]>({
    queryKey: ['objectives', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) throw new Error('No project selected');
      
      const response = await fetch(`/api/projects/${selectedProjectId}/objectives`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch objectives');
      }
      
      return response.json();
    },
    enabled: !!selectedProjectId,
  });

  const projectList = projectsResponse?.projects ?? [];
  const activeProjects = projectList.filter(p => !p.isArchived);
  const selectedObjective = objectives?.find(o => o.id === selectedObjectiveId);
  const selectedProject = activeProjects.find(p => p.id === selectedProjectId) || null;

  // Reset objective selection when project changes
  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedObjectiveId(null);
  };

  if (!profile) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertDescription>Please sign in to view the scoreboard.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Scoreboard</h1>
        <p className="text-muted-foreground mt-2">
          View tasks, team member status, and weekly touchbases
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Select Context</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Project Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Project</label>
            <Select
              value={selectedProjectId || ''}
              onValueChange={handleProjectChange}
              disabled={projectsLoading || activeProjects.length === 0}
            >
              <SelectTrigger>
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
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Objective Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Objective</label>
            <Select
              value={selectedObjectiveId || ''}
              onValueChange={(value) => setSelectedObjectiveId(value)}
              disabled={!selectedProjectId || objectivesLoading || !objectives || objectives.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !selectedProjectId
                    ? 'Select a project first'
                    : objectivesLoading
                    ? 'Loading objectives...'
                    : !objectives || objectives.length === 0
                    ? 'No objectives'
                    : 'Select an objective'
                } />
              </SelectTrigger>
              <SelectContent>
                {objectives?.map((objective) => (
                  <SelectItem key={objective.id} value={objective.id}>
                    {objective.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content Area */}
      {selectedObjective ? (
        <div className="space-y-6">
          {/* Objective Header - compact row */}
          <div className="bg-white border border-gray-200 rounded-md px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground uppercase">Objective</span>
              <span className="font-semibold text-sm md:text-base">
                {selectedObjective.name}
              </span>
            </div>
            <div className="flex-1 md:ml-6">
              <CompletionTracker
                projectId={selectedProjectId!}
                completionStatus={selectedObjective.completionStatus}
                estimatedCompletionDate={selectedObjective.estimatedCompletionDate}
                variant="compact"
              />
            </div>
          </div>

          {/* Unified Task Table (Objective-focused) */}
          <ProjectTaskTable
            projectId={selectedProjectId!}
            projectName={selectedProject?.name}
            objectives={objectives ?? []}
            filterObjectiveId={selectedObjective.id}
            onAddTaskClick={() => setShowAddTaskModal(true)}
          />

          {/* Touchbase Log (below tasks) */}
          <TouchbaseLog objectiveId={selectedObjective.id} />
        </div>
      ) : selectedProjectId ? (
        <div className="space-y-6">
          {/* Project summary */}
          <Card>
            <CardHeader>
              <CardTitle>
                Project: {selectedProject?.name ?? 'Selected project'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Viewing tasks across all objectives in this project. Select a specific objective above for a focused view with completion tracking and touchbases.
              </p>
            </CardContent>
          </Card>

          {/* Project-level Task Table */}
          <ProjectTaskTable
            projectId={selectedProjectId}
            projectName={selectedProject?.name}
            objectives={objectives ?? []}
          />
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Select a project above to view tasks, or choose a specific objective for detailed status and touchbases
            </p>
          </CardContent>
        </Card>
      )}

      {/* Add Task Modal */}
      {selectedObjectiveId && (
        <AddTaskModal
          open={showAddTaskModal}
          onClose={() => setShowAddTaskModal(false)}
          objectiveId={selectedObjectiveId}
        />
      )}
    </div>
  );
}
