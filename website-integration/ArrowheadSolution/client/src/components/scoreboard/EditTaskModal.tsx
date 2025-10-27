/**
 * Edit Task Modal
 * 
 * Modal for editing existing tasks
 * Includes: Edit title/description, Update status, Manage assignments, Delete task
 * 
 * PRD v5.2 Section 3.3: Task Management
 */

import { useState, useEffect } from 'react';
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
import { Trash2 } from 'lucide-react';

interface TaskAssignee {
  teamMemberId: string;
  name: string;
  role: string;
}

interface Task {
  id: number;
  title: string;
  description: string | null;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string | null;
  assignedMembers: TaskAssignee[];
}

interface EditTaskModalProps {
  open: boolean;
  onClose: () => void;
  task: Task;
  objectiveId: number;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
}

export function EditTaskModal({ open, onClose, task, objectiveId }: EditTaskModalProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'not_started' | 'in_progress' | 'completed' | 'blocked'>('not_started');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load task data into form
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
      setSelectedAssignees(task.assignedMembers.map(m => m.teamMemberId));
    }
  }, [task]);

  // Fetch team members for assignment
  const { data: teamMembers } = useQuery<TeamMember[]>({
    queryKey: ['teamMembers', profile?.teamId],
    queryFn: async () => {
      if (!profile?.teamId) throw new Error('No team ID');

      const response = await fetch(`/api/teams/${profile.teamId}/members`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }

      return response.json();
    },
    enabled: open && !!profile?.teamId,
  });

  // Update task mutation
  const updateMutation = useMutation({
    mutationFn: async (taskData: {
      title: string;
      description?: string;
      status: string;
      priority: string;
      due_date?: string;
      assigned_member_ids?: string[];
    }) => {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update task');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', objectiveId] });
      handleClose();
    },
  });

  // Delete task mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete task');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', objectiveId] });
      handleClose();
    },
  });

  const handleToggleAssignee = (memberId: string) => {
    setSelectedAssignees(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleUpdate = () => {
    if (!title.trim()) return;

    updateMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      due_date: dueDate || undefined,
      assigned_member_ids: selectedAssignees,
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const handleClose = () => {
    setShowDeleteConfirm(false);
    updateMutation.reset();
    deleteMutation.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update task details, status, or assignments
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {(updateMutation.error || deleteMutation.error) && (
            <Alert variant="destructive">
              <AlertDescription>
                {updateMutation.error?.message || deleteMutation.error?.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              disabled={updateMutation.isPending || deleteMutation.isPending}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add task details..."
              rows={3}
              disabled={updateMutation.isPending || deleteMutation.isPending}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={status}
              onValueChange={(value: Task['status']) => setStatus(value)}
              disabled={updateMutation.isPending || deleteMutation.isPending}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={priority}
              onValueChange={(value: Task['priority']) => setPriority(value)}
              disabled={updateMutation.isPending || deleteMutation.isPending}
            >
              <SelectTrigger id="priority">
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
            <Label htmlFor="dueDate">Due Date</Label>
            <input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={updateMutation.isPending || deleteMutation.isPending}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Assignees */}
          <div className="space-y-2">
            <Label>Assigned Team Members</Label>
            <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
              {teamMembers?.map((member) => (
                <div key={member.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`member-${member.id}`}
                    checked={selectedAssignees.includes(member.id)}
                    onCheckedChange={() => handleToggleAssignee(member.id)}
                    disabled={updateMutation.isPending || deleteMutation.isPending}
                  />
                  <label
                    htmlFor={`member-${member.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                  >
                    {member.name}
                    <span className="text-xs text-muted-foreground ml-2">
                      ({member.role.replace('_', ' ')})
                    </span>
                  </label>
                </div>
              ))}
              {(!teamMembers || teamMembers.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No team members available
                </p>
              )}
            </div>
          </div>

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <Alert variant="destructive">
              <AlertDescription className="flex items-center justify-between">
                <span>Are you sure you want to delete this task?</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleteMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={showDeleteConfirm || updateMutation.isPending || deleteMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Task
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={updateMutation.isPending || deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!title.trim() || updateMutation.isPending || deleteMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
