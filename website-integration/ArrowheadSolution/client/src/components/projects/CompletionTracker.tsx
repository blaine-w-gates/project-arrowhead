/**
 * Completion Tracker Component
 * 
 * Manual project completion tracker with Yes/No toggle and estimated date
 * PRD v5.2 Section 3.1.4: Manual Completion Tracker
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';

interface CompletionTrackerProps {
  projectId: string;
  completionStatus: boolean | 'not_started' | 'in_progress' | 'completed' | null;
  estimatedCompletionDate: string | null;
}

export function CompletionTracker({
  projectId,
  completionStatus,
  estimatedCompletionDate,
}: CompletionTrackerProps) {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  const initialIsComplete =
    typeof completionStatus === 'boolean'
      ? completionStatus
      : completionStatus === 'completed'
        ? true
        : false;

  const [isComplete, setIsComplete] = useState(initialIsComplete);
  const [estimatedDate, setEstimatedDate] = useState(
    estimatedCompletionDate ? estimatedCompletionDate.split('T')[0] : ''
  );
  const [hasChanges, setHasChanges] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          completion_status: isComplete,
          estimated_completion_date: estimatedDate || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update completion tracker');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setHasChanges(false);
    },
  });

  const handleStatusChange = (checked: boolean) => {
    setIsComplete(checked);
    setHasChanges(true);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEstimatedDate(e.target.value);
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate();
  };

  return (
    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
      <h4 className="font-semibold text-sm">Manual Completion Tracker</h4>
      
      <div className="flex items-center justify-between">
        <Label htmlFor={`complete-${projectId}`} className="text-sm">
          Mark as Complete
        </Label>
        <Switch
          id={`complete-${projectId}`}
          checked={isComplete}
          onCheckedChange={handleStatusChange}
          disabled={updateMutation.isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`date-${projectId}`} className="text-sm">
          Estimated Completion Date
        </Label>
        <div className="relative">
          <Input
            id={`date-${projectId}`}
            type="date"
            value={estimatedDate}
            onChange={handleDateChange}
            disabled={updateMutation.isPending}
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {hasChanges && (
        <Button
          size="sm"
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="w-full"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      )}
    </div>
  );
}
