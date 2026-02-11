/**
 * Add Project Modal
 * 
 * Modal for creating a new project
 * Includes option to fill out vision immediately
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VisionModal } from './VisionModal';

interface AddProjectModalProps {
  open: boolean;
  onClose: () => void;
  teamId: string;
}

export function AddProjectModal({ open, onClose, teamId }: AddProjectModalProps) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [fillVisionNow, setFillVisionNow] = useState(false);
  const [error, setError] = useState('');
  const [showVisionModal, setShowVisionModal] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async (projectName: string) => {
      const response = await fetch(`/api/teams/${teamId}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        credentials: 'include',
        body: JSON.stringify({ name: projectName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create project');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects', teamId] });

      const projectId = (data && (data.project?.id ?? data.id)) ? String(data.project?.id ?? data.id) : null;

      if (fillVisionNow && projectId) {
        setCreatedProjectId(projectId);
        setShowVisionModal(true);
      } else {
        handleClose();
      }
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    createMutation.mutate(name.trim());
  };

  const handleClose = () => {
    setName('');
    setFillVisionNow(false);
    setError('');
    setCreatedProjectId(null);
    onClose();
  };

  const handleVisionClose = () => {
    setShowVisionModal(false);
    handleClose();
  };

  return (
    <>
      <Dialog open={open && !showVisionModal} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Add a new project to your team's workspace
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter project name"
                disabled={createMutation.isPending}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="fill-vision"
                checked={fillVisionNow}
                onCheckedChange={(checked) => setFillVisionNow(checked as boolean)}
                disabled={createMutation.isPending}
              />
              <Label
                htmlFor="fill-vision"
                className="text-sm font-normal cursor-pointer"
              >
                Fill out Vision now
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Vision Modal - opened after project creation if checkbox was checked */}
      {typeof createdProjectId === 'string' && (
        <VisionModal
          open={showVisionModal}
          onClose={handleVisionClose}
          projectId={createdProjectId}
          teamId={teamId}
          isNew={true}
        />
      )}
    </>
  );
}
