/**
 * RRGT Tab (Tab 4 - My Work)
 * 
 * Displays "My Work" dashboard with RRGT columns and Dial
 * Features: 6-column RRGT, Dial comparison, Manager God-view
 * 
 * PRD v5.2 Section 3.4: RRGT UI & Dial Component
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Target, Users } from 'lucide-react';
import { RrgtGrid } from '@/components/rrgt/RrgtGrid';
import { DialPlaceholder } from '@/components/rrgt/DialPlaceholder';

interface Project {
  id: string;
  name: string;
  isArchived: boolean;
}

interface Objective {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
}

interface ProjectsResponse {
  projects: Project[];
  total: number;
}

interface ObjectivesResponse {
  objectives: Objective[];
  total: number;
}

export default function RRGTTab() {
  const { profile, session } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const isManager = profile?.role === 'Account Owner' || profile?.role === 'Account Manager';

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

  const projectList = projectsResponse?.projects ?? [];
  const activeProjects = projectList.filter(p => !p.isArchived);

  // Fetch objectives for selected project
  const { data: objectivesResponse, isLoading: objectivesLoading } = useQuery<ObjectivesResponse>({
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

  const objectiveList = objectivesResponse?.objectives ?? [];

  // Fetch team members (for Manager God-view)
  const { data: teamMembers } = useQuery<TeamMember[]>({
    queryKey: ['teamMembers', profile?.teamId],
    queryFn: async () => {
      if (!profile?.teamId) throw new Error('No team ID');

      const response = await fetch(`/api/teams/${profile.teamId}/members`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }

      return response.json();
    },
    enabled: isManager && !!profile?.teamId,
  });

  // Fetch RRGT data for dial state
  const isGodView = selectedMemberIds.length > 0;
  const rrgtEndpoint = isGodView && selectedMemberIds.length === 1
    ? `/api/rrgt/${selectedMemberIds[0]}`
    : '/api/rrgt/mine';

  const { data: rrgtData } = useQuery({
    queryKey: ['rrgt', rrgtEndpoint, selectedProjectId, selectedObjectiveId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedProjectId) params.append('project_id', selectedProjectId);
      if (selectedObjectiveId) params.append('objective_id', selectedObjectiveId);

      const url = `${rrgtEndpoint}${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch RRGT data');
      }

      return response.json();
    },
  });

  const handleProjectChange = (projectId: string | null) => {
    setSelectedProjectId(projectId || null);
    setSelectedObjectiveId(null);
  };

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  if (!profile) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertDescription>Please sign in to view your RRGT dashboard.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Work (RRGT)</h1>
        <p className="text-muted-foreground mt-2">
          Track your tasks across 6 priority columns and use the Dial for focus
        </p>
        {isManager && (
          <Badge variant="secondary" className="mt-2">
            <Users className="mr-1 h-3 w-3" />
            Manager God-view Enabled
          </Badge>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Project and Objective Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project Filter */}
            <div className="space-y-2">
              <Label>Project</Label>
              <Select
                value={selectedProjectId ?? 'all-projects'}
                onValueChange={(value) =>
                  handleProjectChange(value === 'all-projects' ? null : value)
                }
                disabled={projectsLoading || activeProjects.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    projectsLoading
                      ? 'Loading projects...'
                      : activeProjects.length === 0
                      ? 'No active projects'
                      : 'All Projects'
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-projects">All Projects</SelectItem>
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
              <Label>Objective</Label>
              <Select
                value={selectedObjectiveId ?? 'all-objectives'}
                onValueChange={(value) =>
                  setSelectedObjectiveId(value === 'all-objectives' ? null : value)
                }
                disabled={!selectedProjectId || objectivesLoading || !objectiveList || objectiveList.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !selectedProjectId
                      ? 'Select a project first'
                      : objectivesLoading
                      ? 'Loading objectives...'
                      : !objectiveList || objectiveList.length === 0
                      ? 'No objectives'
                      : 'All Objectives'
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-objectives">All Objectives</SelectItem>
                  {objectiveList?.map((objective) => (
                    <SelectItem key={objective.id} value={objective.id}>
                      {objective.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Team Member Filter (Manager God-view) */}
          {isManager && teamMembers && teamMembers.length > 0 && (
            <div className="space-y-2">
              <Label>Team Members (God-view)</Label>
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`rrgt-member-${member.id}`}
                      checked={selectedMemberIds.includes(member.id)}
                      onCheckedChange={() => toggleMember(member.id)}
                    />
                    <Label
                      htmlFor={`rrgt-member-${member.id}`}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {member.name}
                      <span className="text-muted-foreground ml-2">({member.role})</span>
                    </Label>
                  </div>
                ))}
              </div>
              {selectedMemberIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Viewing {selectedMemberIds.length} member{selectedMemberIds.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dial */}
      <DialPlaceholder 
        dialState={rrgtData?.dial_state || null}
        items={rrgtData?.items || []}
        tasks={rrgtData?.tasks || []}
      />

      {/* RRGT Grid */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            RRGT Grid (6 Priority Columns)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RrgtGrid
            projectId={selectedProjectId}
            objectiveId={selectedObjectiveId}
            memberIds={selectedMemberIds.length > 0 ? selectedMemberIds : undefined}
            currentUserId={profile.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
