/**
 * RRGT Tab (Tab 4 - My Work)
 * 
 * Displays "My Work" dashboard with RRGT columns and Dial
 * Features: 6-column RRGT, Dial comparison, Manager God-view
 * 
 * PRD v5.2 Section 3.4: RRGT UI & Dial Component
 */

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Target, Users } from 'lucide-react';
import { RrgtGrid } from '@/components/rrgt/RrgtGrid';
import { Dial, type DialApiState, type DialUpdatePayload } from '@/components/rrgt/Dial';
import { Button } from '@/components/ui/button';
import { LocalRrgtStore } from '@/lib/rrgt-local-store';
import type { EnrichedPlan, RrgtResponse } from '@/types';

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

// Objectives endpoint returns a bare array (see server/api/objectives.ts)
type ObjectivesResponse = Objective[];

export default function RRGTTab() {
  const { profile, session } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [incognitoPlans, setIncognitoPlans] = useState<EnrichedPlan[]>([]);
  const [targetingSlot, setTargetingSlot] = useState<'left' | 'right' | null>(null);
  const [localRightText, setLocalRightText] = useState<string | null>(null);

  const isManager = profile?.role === 'Account Owner' || profile?.role === 'Account Manager';

  useEffect(() => {
    try {
      const plans = LocalRrgtStore.getPlans();
      setIncognitoPlans(plans);
    } catch (error) {
      console.error('Failed to load incognito RRGT plans', error);
    }
  }, []);

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

      // Endpoint returns Objective[] directly
      return response.json();
    },
    enabled: !!selectedProjectId,
  });

  const objectiveList = objectivesResponse ?? [];

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

  // Fetch RRGT data (Matrix plans)
  const { data: rrgtData } = useQuery<RrgtResponse>({
    queryKey: ['rrgt-matrix', selectedProjectId, selectedObjectiveId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedProjectId) params.append('project_id', selectedProjectId);
      if (selectedObjectiveId) params.append('objective_id', selectedObjectiveId);

      const url = `/api/rrgt/mine${params.toString() ? `?${params.toString()}` : ''}`;
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

  const serverPlans = rrgtData?.plans ?? [];

  // God View: fetch enriched plans for each selected team member
  interface GodViewResponse {
    plans: EnrichedPlan[];
    total: number;
    ownerName: string;
  }

  const memberQueries = useQueries({
    queries: selectedMemberIds.map((memberId) => ({
      queryKey: ['rrgt-godview', memberId],
      queryFn: async (): Promise<GodViewResponse> => {
        const response = await fetch(`/api/rrgt/${memberId}`, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${session?.access_token ?? ''}`,
          },
        });
        if (!response.ok) throw new Error('Failed to fetch member RRGT data');
        return response.json();
      },
      enabled: isManager && !!memberId,
    })),
  });

  const memberPlans = useMemo(() => {
    const plans: EnrichedPlan[] = [];
    for (const query of memberQueries) {
      if (query.data) {
        for (const plan of query.data.plans) {
          plans.push({ ...plan, ownerName: query.data.ownerName });
        }
      }
    }
    return plans;
  }, [memberQueries]);

  const isViewingMembers = selectedMemberIds.length > 0;

  const allPlans = useMemo(
    () => [...serverPlans, ...memberPlans, ...incognitoPlans],
    [serverPlans, memberPlans, incognitoPlans]
  );

  const moveRabbitMutation = useMutation({
    mutationFn: async (vars: { planId: string; columnIndex: number }) => {
      const response = await fetch(`/api/rrgt/plans/${vars.planId}/rabbit`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ column_index: vars.columnIndex }),
      });

      if (!response.ok) {
        throw new Error('Failed to update RRGT rabbit');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rrgt-matrix'] });
    },
  });

  const handleMoveRabbit = (planId: string, columnIndex: number) => {
    if (planId.startsWith('incognito:')) {
      LocalRrgtStore.moveRabbit(planId, columnIndex);
      try {
        const plans = LocalRrgtStore.getPlans();
        setIncognitoPlans(plans);
      } catch (error) {
        console.error('Failed to update incognito RRGT rabbit', error);
      }
      return;
    }

    moveRabbitMutation.mutate({ planId, columnIndex });
  };

  const saveSubtaskMutation = useMutation({
    mutationFn: async (vars: { planId: string; columnIndex: number; text: string }) => {
      const response = await fetch(`/api/rrgt/plans/${vars.planId}/subtasks`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          column_index: vars.columnIndex,
          text: vars.text,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save RRGT subtask');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rrgt-matrix'] });
    },
  });

  const handleSaveSubtask = (planId: string, columnIndex: number, text: string) => {
    if (planId.startsWith('incognito:')) {
      LocalRrgtStore.updateSubtask(planId, columnIndex, text);
      try {
        const plans = LocalRrgtStore.getPlans();
        setIncognitoPlans(plans);
      } catch (error) {
        console.error('Failed to update incognito RRGT subtask', error);
      }
      return;
    }

    saveSubtaskMutation.mutate({ planId, columnIndex, text });
  };

  const handleAddPrivateTask = () => {
    try {
      const newPlan = LocalRrgtStore.createPlan('New Private Task');
      setIncognitoPlans(prev => [...prev, newPlan]);
    } catch (error) {
      console.error('Failed to create incognito RRGT plan', error);
    }
  };

  // Dial state
  interface DialResponse {
    dial_state: DialApiState | null;
  }

  const { data: dialResponse, isLoading: dialLoading } = useQuery<DialResponse>({
    queryKey: ['dial-state'],
    queryFn: async () => {
      const response = await fetch('/api/dial/mine', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dial state');
      }

      return response.json();
    },
  });

  const dialState = dialResponse?.dial_state ?? null;

  const hydratedDialState: DialApiState | null = useMemo(
    () => {
      if (!dialState) return null;

      return {
        ...dialState,
        right_text:
          dialState.is_right_private && localRightText !== null
            ? localRightText
            : dialState.right_text,
      };
    },
    [dialState, localRightText],
  );

  const updateDialMutation = useMutation({
    mutationFn: async (payload: DialUpdatePayload) => {
      const response = await fetch('/api/dial/mine', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to update dial state');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dial-state'] });
    },
  });

  const handleUpdateDial = (payload: DialUpdatePayload) => {
    updateDialMutation.mutate(payload);
  };

  const handleCellClick = (
    planId: string,
    columnIndex: number,
    text: string,
    isPrivate: boolean,
  ) => {
    if (!targetingSlot) return;

    const isIncognito = planId.startsWith('incognito:');

    if (targetingSlot === 'left') {
      if (isIncognito) {
        handleUpdateDial({
          left_plan_id: null,
          left_column_index: null,
          left_text: text,
          is_left_private: true,
        });
      } else {
        handleUpdateDial({
          left_plan_id: planId,
          left_column_index: columnIndex,
          left_text: text,
          is_left_private: isPrivate,
        });
      }
    } else {
      if (isIncognito) {
        handleUpdateDial({
          right_plan_id: null,
          right_column_index: null,
          right_text: text,
          is_right_private: true,
        });
      } else {
        handleUpdateDial({
          right_plan_id: planId,
          right_column_index: columnIndex,
          right_text: text,
          is_right_private: isPrivate,
        });
      }

      if (isPrivate) {
        setLocalRightText(text);
      } else {
        setLocalRightText(null);
      }
    }

    setTargetingSlot(null);
  };

  const handleSlotClick = (slot: 'left' | 'right') => {
    const state = hydratedDialState ?? dialState;

    if (targetingSlot === slot) {
      setTargetingSlot(null);
      return;
    }

    const hasValue = slot === 'left'
      ? !!(state?.left_plan_id || state?.left_text || state?.is_left_private)
      : !!(state?.right_plan_id || state?.right_text || state?.is_right_private);

    // Empty slot: enter targeting mode
    if (!hasValue) {
      setTargetingSlot(slot);
      return;
    }

    // Filled slot: toggle primary focus
    const current = state?.selected_slot;
    const next = current === slot ? null : slot;
    handleUpdateDial({ selected_slot: next });
  };

  const handleClearSlot = (slot: 'left' | 'right') => {
    if (targetingSlot === slot) {
      setTargetingSlot(null);
    }

    if (slot === 'left') {
      handleUpdateDial({
        left_plan_id: null,
        left_column_index: null,
        left_text: '',
        is_left_private: false,
        selected_slot: dialState?.selected_slot === 'left' ? null : dialState?.selected_slot ?? null,
      });
    } else {
      setLocalRightText(null);
      handleUpdateDial({
        right_plan_id: null,
        right_column_index: null,
        right_text: '',
        is_right_private: false,
        selected_slot: dialState?.selected_slot === 'right' ? null : dialState?.selected_slot ?? null,
      });
    }
  };

  const handleResetDial = () => {
    setTargetingSlot(null);
    setLocalRightText(null);
    handleUpdateDial({
      left_plan_id: null,
      left_column_index: null,
      left_text: '',
      is_left_private: false,
      right_plan_id: null,
      right_column_index: null,
      right_text: '',
      is_right_private: false,
      selected_slot: null,
    });
  };

  const handleRenamePlan = (planId: string, title: string) => {
    if (!planId.startsWith('incognito:')) {
      return;
    }
    try {
      LocalRrgtStore.renamePlan(planId, title);
      const plans = LocalRrgtStore.getPlans();
      setIncognitoPlans(plans);
    } catch (error) {
      console.error('Failed to rename incognito RRGT plan', error);
    }
  };

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

      {/* RRGT Grid */}
      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            RRGT Matrix (Rabbit Race)
            {isViewingMembers && (
              <Badge variant="outline" className="ml-2 text-xs">
                Showing {selectedMemberIds.length} team member{selectedMemberIds.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddPrivateTask}
          >
            Add Private Task
          </Button>
        </CardHeader>
        <CardContent>
          <RrgtGrid
            plans={allPlans}
            onMoveRabbit={handleMoveRabbit}
            onSaveSubtask={handleSaveSubtask}
            onRenamePlan={handleRenamePlan}
            targetingSlot={targetingSlot}
            onCellClick={handleCellClick}
          />
        </CardContent>
      </Card>

      {/* Dial (hidden when viewing other members — Dial is personal) */}
      {!isViewingMembers && (
        <Dial
          dialState={hydratedDialState}
          targetingSlot={targetingSlot}
          onSlotClick={handleSlotClick}
          onClearSlot={handleClearSlot}
          onReset={handleResetDial}
          onUpdate={handleUpdateDial}
          isLoading={dialLoading || updateDialMutation.isPending}
        />
      )}
    </div>
  );
}
