/**
 * Add Task Modal
 * 
 * Modal for creating a new task
 * Includes: Title, Description, Priority, Due Date, Assignees multi-select
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';

interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
  objectiveId: number;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
}

export function AddTaskModal({ open, onClose, objectiveId }: AddTaskModalProps) {
  const { profile, session } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [error, setError] = useState('');

  // Fetch team members for assignment
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
    enabled: open && !!profile?.teamId,
  });

  const createMutation = useMutation({
    mutationFn: async (taskData: {
      title: string;
      description?: string;
      priority: string;
      due_date?: string;
      assigned_member_ids: string[];
    }) => {
      const response = await fetch(`/api/objectives/${objectiveId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        credentials: 'include',
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create task');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', objectiveId] });
      handleClose();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      due_date: dueDate || undefined,
      assigned_member_ids: selectedAssignees,
    });
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate('');
    setSelectedAssignees([]);
    setError('');
    onClose();
  };

  const toggleAssignee = (memberId: string) => {
    setSelectedAssignees(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task to this objective
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title">Title *</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              disabled={createMutation.isPending}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description (optional)"
              rows={4}
              disabled={createMutation.isPending}
            />
          </div>

          {/* Priority and Due Date Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="task-priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as 'low' | 'medium' | 'high' | 'urgent')}
                disabled={createMutation.isPending}
              >
                <SelectTrigger id="task-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="task-due-date">Due Date</Label>
              <Input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={createMutation.isPending}
              />
            </div>
          </div>

          {/* Assignees Multi-Select */}
          <div className="space-y-2">
            <Label>Assign To (Multi-Select)</Label>
            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              {teamMembers && teamMembers.length > 0 ? (
                teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`member-${member.id}`}
                      checked={selectedAssignees.includes(member.id)}
                      onCheckedChange={() => toggleAssignee(member.id)}
                      disabled={createMutation.isPending}
                    />
                    <Label
                      htmlFor={`member-${member.id}`}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {member.name}
                      <span className="text-muted-foreground ml-2">({member.role})</span>
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Loading team members...</p>
              )}
            </div>
            {selectedAssignees.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedAssignees.length} member{selectedAssignees.length !== 1 ? 's' : ''} selected
              </p>
            )}
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
              {createMutation.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
