/**
 * New Touchbase Modal
 * 
 * Modal form for creating touchbase records with 7 standard questions
 * 
 * PRD v5.2 Section 3.3: Touchbase Module Spec
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TeamMember {
  id: string;
  name: string;
}

interface NewTouchbaseModalProps {
  open: boolean;
  onClose: () => void;
  objectiveId: string;
  teamId: string;
}

const TOUCHBASE_QUESTIONS = [
  {
    key: 'question1',
    label: '1. What are you working on this week?',
    placeholder: 'Describe current tasks and priorities...',
  },
  {
    key: 'question2',
    label: '2. What blockers or challenges are you facing?',
    placeholder: 'List any obstacles or issues...',
  },
  {
    key: 'question3',
    label: '3. What support do you need from the team?',
    placeholder: 'Specify resources or assistance needed...',
  },
  {
    key: 'question4',
    label: '4. What wins or accomplishments do you want to share?',
    placeholder: 'Celebrate recent successes...',
  },
  {
    key: 'question5',
    label: '5. How are you feeling about your workload?',
    placeholder: 'Describe work-life balance and stress levels...',
  },
  {
    key: 'question6',
    label: '6. What are your goals for next week?',
    placeholder: 'Outline upcoming priorities and targets...',
  },
  {
    key: 'question7',
    label: '7. Any other topics or concerns to discuss?',
    placeholder: 'Share additional thoughts or feedback...',
  },
];

export function NewTouchbaseModal({ open, onClose, objectiveId, teamId }: NewTouchbaseModalProps) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [touchbaseDate, setTouchbaseDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [responses, setResponses] = useState<Record<string, string>>({});

  // Fetch team members
  const { data: members } = useQuery<TeamMember[]>({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      const response = await fetch(`/api/teams/${teamId}/members`, {
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
    enabled: open && !!teamId,
  });

  // Create touchbase mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      teamMemberId: string;
      touchbaseDate: string;
      responses: Record<string, string>;
    }) => {
      // Map UI responses (question1-7) to backend JSONB schema (q1_working_on - q7_timeline_change)
      const backendResponses: Record<string, string> = {};

      const q1 = data.responses['question1'];
      if (q1 && q1.trim()) backendResponses['q1_working_on'] = q1;

      const q2 = data.responses['question2'];
      if (q2 && q2.trim()) backendResponses['q2_help_needed'] = q2;

      const q3 = data.responses['question3'];
      if (q3 && q3.trim()) backendResponses['q3_blockers'] = q3;

      const q4 = data.responses['question4'];
      if (q4 && q4.trim()) backendResponses['q4_wins'] = q4;

      const q5 = data.responses['question5'];
      if (q5 && q5.trim()) backendResponses['q5_priorities'] = q5;

      const q6 = data.responses['question6'];
      if (q6 && q6.trim()) backendResponses['q6_resource_needs'] = q6;

      const q7 = data.responses['question7'];
      if (q7 && q7.trim()) backendResponses['q7_timeline_change'] = q7;

      // Convert UI date (YYYY-MM-DD) to ISO 8601 datetime for API
      const touchbaseDateIso = new Date(data.touchbaseDate).toISOString();

      const payload = {
        team_member_id: data.teamMemberId,
        touchbase_date: touchbaseDateIso,
        responses: backendResponses,
      };

      const response = await fetch(`/api/objectives/${objectiveId}/touchbases`, {
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
        throw new Error(result.error || 'Failed to create touchbase');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['touchbases', objectiveId] });
      handleClose();
    },
  });

  const handleResponseChange = (key: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = () => {
    if (selectedMemberId && touchbaseDate) {
      createMutation.mutate({
        teamMemberId: selectedMemberId,
        touchbaseDate,
        responses,
      });
    }
  };

  const handleClose = () => {
    setSelectedMemberId('');
    setTouchbaseDate(new Date().toISOString().split('T')[0]);
    setResponses({});
    createMutation.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Touchbase / 1-on-1 Meeting</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {createMutation.error && (
            <Alert variant="destructive">
              <AlertDescription>
                {createMutation.error.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Team Member Selection */}
          <div className="space-y-2">
            <Label htmlFor="team-member">Team Member</Label>
            <Select
              value={selectedMemberId}
              onValueChange={setSelectedMemberId}
              disabled={createMutation.isPending}
            >
              <SelectTrigger id="team-member">
                <SelectValue placeholder="Select team member..." />
              </SelectTrigger>
              <SelectContent>
                {members?.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select the team member this touchbase is with
            </p>
          </div>

          {/* Touchbase Date */}
          <div className="space-y-2">
            <Label htmlFor="touchbase-date">Date</Label>
            <input
              id="touchbase-date"
              type="date"
              value={touchbaseDate}
              onChange={(e) => setTouchbaseDate(e.target.value)}
              disabled={createMutation.isPending}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* 7 Questions */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Touchbase Questions</h3>
            {TOUCHBASE_QUESTIONS.map((question) => (
              <div key={question.key} className="space-y-2">
                <Label htmlFor={question.key}>{question.label}</Label>
                <Textarea
                  id={question.key}
                  placeholder={question.placeholder}
                  value={responses[question.key] || ''}
                  onChange={(e) => handleResponseChange(question.key, e.target.value)}
                  disabled={createMutation.isPending}
                  rows={3}
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedMemberId || !touchbaseDate || createMutation.isPending}
          >
            {createMutation.isPending ? 'Saving...' : 'Create Touchbase'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
