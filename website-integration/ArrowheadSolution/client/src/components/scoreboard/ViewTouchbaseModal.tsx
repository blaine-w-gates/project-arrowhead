/**
 * View Touchbase Modal
 * 
 * Read-only view of touchbase responses with 24-hour edit button
 * Displays all 7 question responses in full detail
 * 
 * PRD v5.2 Section 3.3: Touchbase Viewing
 */

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Edit2, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Touchbase {
  id: number;
  objectiveId: number;
  teamMemberId: string;
  teamMemberName: string;
  touchbaseDate: string;
  responses: Record<string, string>;
  createdAt: string;
  createdBy: string;
}

interface ViewTouchbaseModalProps {
  open: boolean;
  onClose: () => void;
  touchbase: Touchbase;
}

const TOUCHBASE_QUESTIONS = [
  {
    key: 'question1',
    label: '1. What are you working on this week?',
  },
  {
    key: 'question2',
    label: '2. What blockers or challenges are you facing?',
  },
  {
    key: 'question3',
    label: '3. What support do you need from the team?',
  },
  {
    key: 'question4',
    label: '4. What wins or accomplishments do you want to share?',
  },
  {
    key: 'question5',
    label: '5. How are you feeling about your workload?',
  },
  {
    key: 'question6',
    label: '6. What are your goals for next week?',
  },
  {
    key: 'question7',
    label: '7. Any other topics or concerns to discuss?',
  },
];

export function ViewTouchbaseModal({ open, onClose, touchbase }: ViewTouchbaseModalProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [responses, setResponses] = useState<Record<string, string>>({});

  // Load touchbase responses
  useEffect(() => {
    if (touchbase) {
      setResponses(touchbase.responses || {});
    }
  }, [touchbase]);

  // Check if within 24 hours and user is creator
  const canEdit = () => {
    if (!touchbase || !profile) return false;
    
    const createdAt = new Date(touchbase.createdAt);
    const now = new Date();
    const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceCreation < 24 && touchbase.createdBy === profile.id;
  };

  // Update touchbase mutation
  const updateMutation = useMutation({
    mutationFn: async (updatedResponses: Record<string, string>) => {
      const response = await fetch(`/api/touchbases/${touchbase.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ responses: updatedResponses }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update touchbase');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['touchbases', touchbase.objectiveId] });
      setIsEditing(false);
    },
  });

  const handleResponseChange = (key: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    updateMutation.mutate(responses);
  };

  const handleCancel = () => {
    setResponses(touchbase.responses || {});
    setIsEditing(false);
  };

  const handleClose = () => {
    setIsEditing(false);
    setResponses(touchbase.responses || {});
    updateMutation.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Touchbase Details
            {canEdit() && (
              <Badge variant="secondary" className="ml-2">
                Editable for {Math.floor(24 - (new Date().getTime() - new Date(touchbase.createdAt).getTime()) / (1000 * 60 * 60))}h
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {updateMutation.error && (
            <Alert variant="destructive">
              <AlertDescription>
                {updateMutation.error.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Touchbase Info */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {new Date(touchbase.touchbaseDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{touchbase.teamMemberName}</span>
            </div>
          </div>

          {/* 7 Questions and Responses */}
          <div className="space-y-4">
            {TOUCHBASE_QUESTIONS.map((question) => (
              <div key={question.key} className="space-y-2">
                <Label className="text-base font-semibold">{question.label}</Label>
                {isEditing ? (
                  <Textarea
                    value={responses[question.key] || ''}
                    onChange={(e) => handleResponseChange(question.key, e.target.value)}
                    disabled={updateMutation.isPending}
                    rows={3}
                    className="resize-none"
                  />
                ) : (
                  <div className="border rounded-md p-3 bg-muted/50 min-h-[80px]">
                    <p className="text-sm whitespace-pre-wrap">
                      {responses[question.key] || <span className="text-muted-foreground italic">No response provided</span>}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Metadata */}
          <div className="pt-4 border-t text-xs text-muted-foreground">
            <p>Created: {new Date(touchbase.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <DialogFooter>
          {isEditing ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                <Check className="mr-2 h-4 w-4" />
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              {canEdit() && (
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
