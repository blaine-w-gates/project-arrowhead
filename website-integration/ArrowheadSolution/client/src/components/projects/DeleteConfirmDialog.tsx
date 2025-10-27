/**
 * Delete Confirm Dialog
 * 
 * Confirmation dialog for deleting a project
 * Enforces the empty project rule (no objectives)
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  projectName: string;
  teamId: string;
}

export function DeleteConfirmDialog({
  open,
  onClose,
  projectId,
  projectName,
  teamId,
}: DeleteConfirmDialogProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  // Check if project has objectives
  const { data: objectives, isLoading } = useQuery({
    queryKey: ['objectives', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/objectives`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch objectives');
      }

      return response.json();
    },
    enabled: open,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete project');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', teamId] });
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleDelete = () => {
    setError('');
    deleteMutation.mutate();
  };

  const hasObjectives = objectives && Array.isArray(objectives) && objectives.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Project
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-4 text-center text-muted-foreground">
            Checking project status...
          </div>
        ) : (
          <div className="space-y-4">
            {hasObjectives ? (
              <Alert variant="destructive">
                <AlertDescription>
                  <strong>Cannot delete this project</strong>
                  <p className="mt-2">
                    This project has {objectives.length} objective{objectives.length > 1 ? 's' : ''}. 
                    You must delete or move all objectives before deleting the project.
                  </p>
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Alert>
                  <AlertDescription>
                    <strong>Are you sure you want to delete "{projectName}"?</strong>
                    <p className="mt-2">
                      This will permanently delete the project and its vision statement.
                    </p>
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          {!hasObjectives && !isLoading && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Project'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
