/**
 * Project Assignment Modal
 * 
 * Allows managers to assign/unassign projects to team members
 * 
 * PRD v5.2 Section 3.1: Project Assignment UI
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TeamMember {
  id: string;
  name: string;
  projectAssignments: number[];
}

interface Project {
  id: number;
  name: string;
}

interface ProjectAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  memberId: string;
  member: TeamMember;
  projects: Project[];
  teamId: string;
}

export function ProjectAssignmentModal({
  open,
  onClose,
  memberId,
  member,
  projects,
  teamId,
}: ProjectAssignmentModalProps) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);

  useEffect(() => {
    if (member) {
      setSelectedProjects(member.projectAssignments || []);
    }
  }, [member]);

  const updateAssignmentsMutation = useMutation({
    mutationFn: async (projectIds: number[]) => {
      const response = await fetch(`/api/team-members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        credentials: 'include',
        body: JSON.stringify({ projectAssignments: projectIds }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update project assignments');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
      onClose();
    },
  });

  const handleToggleProject = (projectId: number) => {
    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleSave = () => {
    updateAssignmentsMutation.mutate(selectedProjects);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Projects to {member?.name}</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {updateAssignmentsMutation.error && (
            <Alert variant="destructive">
              <AlertDescription>
                {updateAssignmentsMutation.error.message}
              </AlertDescription>
            </Alert>
          )}

          <p className="text-sm text-muted-foreground">
            Select which projects this team member should have access to:
          </p>

          <div className="space-y-3">
            {projects.map((project) => (
              <div key={project.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`project-${project.id}`}
                  checked={selectedProjects.includes(project.id)}
                  onCheckedChange={() => handleToggleProject(project.id)}
                  disabled={updateAssignmentsMutation.isPending}
                />
                <label
                  htmlFor={`project-${project.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {project.name}
                </label>
              </div>
            ))}
          </div>

          {projects.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No projects available. Create a project first.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={updateAssignmentsMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateAssignmentsMutation.isPending}
          >
            {updateAssignmentsMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
