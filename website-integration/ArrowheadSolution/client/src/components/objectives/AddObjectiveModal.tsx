/**
 * Add Objective Modal
 * 
 * Modal with Yes/No flow for creating objectives
 * Yes: User knows the objective → Simple creation
 * No: User doesn't know → Start with brainstorm mode
 * 
 * PRD v5.2 Section 3.2: Yes/No Flow for Objective Creation
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { HelpCircle, Check, X } from 'lucide-react';

interface AddObjectiveModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onObjectiveCreated?: (objectiveId: string) => void;
}

type FlowStep = 'prompt' | 'details';

export function AddObjectiveModal({ open, onClose, projectId, onObjectiveCreated }: AddObjectiveModalProps) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [flowStep, setFlowStep] = useState<FlowStep>('prompt');
  const [knowsObjective, setKnowsObjective] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; target_date?: string; start_with_brainstorm: boolean }) => {
      // Map UI field names to backend schema: target_completion_date must be an ISO datetime string
      const payload: {
        name: string;
        start_with_brainstorm: boolean;
        target_completion_date?: string;
      } = {
        name: data.name,
        start_with_brainstorm: data.start_with_brainstorm,
      };

      if (data.target_date) {
        payload.target_completion_date = new Date(data.target_date).toISOString();
      }

      const response = await fetch(`/api/projects/${projectId}/objectives`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to create objective');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['objectives', projectId] });
      handleClose();
      // Transition to journey wizard after creation
      if (onObjectiveCreated && data.id) {
        onObjectiveCreated(data.id);
      }
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleYesNo = (knows: boolean) => {
    setKnowsObjective(knows);
    setFlowStep('details');
    if (!knows) {
      // Pre-fill placeholder name for "No" flow
      setName('Untitled Objective');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Objective name is required');
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      target_date: targetDate || undefined,
      start_with_brainstorm: !knowsObjective,
    });
  };

  const handleClose = () => {
    setFlowStep('prompt');
    setKnowsObjective(null);
    setName('');
    setTargetDate('');
    setError('');
    onClose();
  };

  const handleBack = () => {
    setFlowStep('prompt');
    setKnowsObjective(null);
    setName('');
    setError('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        {flowStep === 'prompt' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                New Objective
              </DialogTitle>
              <DialogDescription>
                Let's start by understanding where you are in your planning
              </DialogDescription>
            </DialogHeader>

            <div className="py-6">
              <p className="text-center text-lg font-medium mb-6">
                Do you know what objective you want to create?
              </p>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-32 flex flex-col gap-3"
                  onClick={() => handleYesNo(true)}
                >
                  <Check className="h-10 w-10 text-green-600" />
                  <div>
                    <div className="font-semibold">Yes</div>
                    <div className="text-xs text-muted-foreground">
                      I know my objective
                    </div>
                  </div>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="h-32 flex flex-col gap-3"
                  onClick={() => handleYesNo(false)}
                >
                  <X className="h-10 w-10 text-orange-600" />
                  <div>
                    <div className="font-semibold">No</div>
                    <div className="text-xs text-muted-foreground">
                      I need to brainstorm
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {knowsObjective ? 'Create Objective' : 'Start Brainstorming'}
              </DialogTitle>
              <DialogDescription>
                {knowsObjective
                  ? 'Enter the objective details'
                  : 'We\'ll guide you through the 17-step journey to define your objective'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {!knowsObjective && (
                <Alert>
                  <AlertDescription>
                    <strong>Brainstorm Mode:</strong> You can use a placeholder name for now.
                    The 17-step journey will help you refine it.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="objective-name">
                  Objective Name *
                </Label>
                <Input
                  id="objective-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={knowsObjective ? 'Enter objective name' : 'e.g., Untitled Objective'}
                  disabled={createMutation.isPending}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="target-date">Target Date (Optional)</Label>
                <Input
                  id="target-date"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  disabled={createMutation.isPending}
                />
              </div>

              <DialogFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBack}
                  disabled={createMutation.isPending}
                >
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={createMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending
                      ? 'Creating...'
                      : knowsObjective
                      ? 'Create Objective'
                      : 'Start Journey'}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
