/**
 * Permission Grid Component
 * 
 * Displays team members with their roles and project assignments
 * Allows managers to edit roles, assign projects, and send invites
 * 
 * PRD v5.2 Section 3.1: Simplified Permission Grid
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Users, Mail, Plus, Settings } from 'lucide-react';
import { ProjectAssignmentModal } from './ProjectAssignmentModal';
import { InviteMemberModal } from './InviteMemberModal';

interface TeamMember {
  id: string;
  userId: string | null;
  teamId: string;
  role: 'account_manager' | 'project_owner' | 'objective_owner' | 'team_member';
  name: string;
  email: string | null;
  isVirtual: boolean;
  invitationStatus: 'pending' | 'accepted' | null;
  projectAssignments: number[];
  createdAt: string;
}

interface PermissionGridProps {
  teamId: string;
  projects: Array<{ id: number; name: string }>;
}

export function PermissionGrid({ teamId, projects }: PermissionGridProps) {
  const queryClient = useQueryClient();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddVirtual, setShowAddVirtual] = useState(false);
  const [virtualMemberName, setVirtualMemberName] = useState('');

  // Fetch team members
  const { data: members, isLoading, error } = useQuery<TeamMember[]>({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }

      return response.json();
    },
    enabled: !!teamId,
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const response = await fetch(`/api/team-members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update role');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
    },
  });

  // Add virtual member mutation
  const addVirtualMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name, isVirtual: true }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to add virtual member');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
      setShowAddVirtual(false);
      setVirtualMemberName('');
    },
  });

  const handleRoleChange = (memberId: string, role: string) => {
    updateRoleMutation.mutate({ memberId, role });
  };

  const handleOpenProjectModal = (memberId: string) => {
    setSelectedMemberId(memberId);
    setShowProjectModal(true);
  };

  const handleOpenInviteModal = (memberId: string) => {
    setSelectedMemberId(memberId);
    setShowInviteModal(true);
  };

  const handleAddVirtual = () => {
    if (virtualMemberName.trim()) {
      addVirtualMutation.mutate(virtualMemberName.trim());
    }
  };


  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Loading team members...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load team members. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members & Permissions
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setShowAddVirtual(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Virtual Persona
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddVirtual && (
            <div className="mb-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Virtual persona name..."
                  value={virtualMemberName}
                  onChange={(e) => setVirtualMemberName(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md"
                  disabled={addVirtualMutation.isPending}
                />
                <Button
                  onClick={handleAddVirtual}
                  disabled={!virtualMemberName.trim() || addVirtualMutation.isPending}
                >
                  Add
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddVirtual(false);
                    setVirtualMemberName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Name</th>
                  <th className="text-left p-3 font-semibold">Role</th>
                  <th className="text-left p-3 font-semibold">Assigned Projects</th>
                  <th className="text-left p-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members?.map((member) => (
                  <tr key={member.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.name}</span>
                        {member.isVirtual && (
                          <Badge variant="secondary">Virtual</Badge>
                        )}
                        {member.invitationStatus === 'pending' && (
                          <Badge variant="outline">Pending Invite</Badge>
                        )}
                      </div>
                      {member.email && (
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      )}
                    </td>
                    <td className="p-3">
                      <Select
                        value={member.role}
                        onValueChange={(value) => handleRoleChange(member.id, value)}
                        disabled={updateRoleMutation.isPending}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="account_manager">Account Manager</SelectItem>
                          <SelectItem value="project_owner">Project Owner</SelectItem>
                          <SelectItem value="objective_owner">Objective Owner</SelectItem>
                          <SelectItem value="team_member">Team Member</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenProjectModal(member.id)}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        {member.projectAssignments.length} Projects
                      </Button>
                    </td>
                    <td className="p-3">
                      {!member.isVirtual && !member.email && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenInviteModal(member.id)}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Send Invite
                        </Button>
                      )}
                      {member.invitationStatus === 'pending' && (
                        <span className="text-sm text-muted-foreground">
                          Invitation Sent
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {(!members || members.length === 0) && (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">No team members yet.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Project Assignment Modal */}
      {selectedMemberId && members && (
        (() => {
          const selectedMember = members.find((m: TeamMember) => m.id === selectedMemberId);
          return selectedMember ? (
            <ProjectAssignmentModal
              open={showProjectModal}
              onClose={() => {
                setShowProjectModal(false);
                setSelectedMemberId(null);
              }}
              memberId={selectedMemberId}
              member={selectedMember}
              projects={projects}
              teamId={teamId}
            />
          ) : null;
        })()
      )}

      {/* Invite Modal */}
      {selectedMemberId && members && (
        (() => {
          const selectedMember = members.find((m: TeamMember) => m.id === selectedMemberId);
          return selectedMember ? (
            <InviteMemberModal
              open={showInviteModal}
              onClose={() => {
                setShowInviteModal(false);
                setSelectedMemberId(null);
              }}
              memberId={selectedMemberId}
              member={selectedMember}
              teamId={teamId}
            />
          ) : null;
        })()
      )}
    </>
  );
}
