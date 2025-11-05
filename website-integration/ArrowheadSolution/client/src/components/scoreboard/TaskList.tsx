/**
 * Task List Component
 * 
 * Displays all tasks for a selected objective
 * Shows: Title, Assigned To, Status, Priority, Due Date
 * Supports multi-assignment including Virtual Personas
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, User, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EditTaskModal } from './EditTaskModal';

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
  createdAt: string;
  updatedAt: string;
}

interface TaskListProps {
  objectiveId: number;
}

export function TaskList({ objectiveId }: TaskListProps) {
  const { session } = useAuth();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const { data: tasks, isLoading, error } = useQuery<Task[]>({
    queryKey: ['tasks', objectiveId],
    queryFn: async () => {
      const response = await fetch(`/api/objectives/${objectiveId}/tasks`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      return response.json();
    },
    enabled: !!objectiveId,
  });

  if (isLoading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Loading tasks...
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load tasks. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground mb-2">No tasks yet</p>
        <p className="text-sm text-muted-foreground">
          Click "Add Task" to create your first task
        </p>
      </div>
    );
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'blocked':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'not_started':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedTask(null);
  };

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="border rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h4 className="font-semibold text-lg mb-1">{task.title}</h4>
              {task.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getPriorityColor(task.priority)}>
                {task.priority}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleEditTask(task)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Status */}
            <Badge className={getStatusColor(task.status)} variant="outline">
              {task.status.replace('_', ' ')}
            </Badge>

            {/* Due Date */}
            {task.dueDate && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
            )}

            {/* Assigned Members */}
            {task.assignedMembers && task.assignedMembers.length > 0 && (
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-muted-foreground" />
                <div className="flex -space-x-2">
                  {task.assignedMembers.map((member, index) => (
                    <Avatar
                      key={`${member.teamMemberId}-${index}`}
                      className="h-7 w-7 border-2 border-background"
                      title={member.name}
                    >
                      <AvatarFallback className="text-xs">
                        {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {task.assignedMembers.length} assigned
                </span>
              </div>
            )}
          </div>
        </div>
      ))}

      <div className="pt-4 text-sm text-muted-foreground text-center">
        {tasks.length} task{tasks.length !== 1 ? 's' : ''} total
      </div>

      {/* Edit Task Modal */}
      {selectedTask && (
        <EditTaskModal
          open={showEditModal}
          onClose={handleCloseEditModal}
          task={selectedTask}
          objectiveId={objectiveId}
        />
      )}
    </div>
  );
}
