import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Calendar, Edit, User, ClipboardList, Plus, GripVertical } from 'lucide-react';
import { DragDropContext, Draggable, Droppable, DropResult } from '@hello-pangea/dnd';
import { EditTaskModal } from './EditTaskModal';

interface TaskAssignee {
  teamMemberId: string;
  name: string;
  role: string;
}

interface ProjectTask {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'complete';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string | null;
  assignedMembers: TaskAssignee[];
  createdAt: string;
  updatedAt: string;
  objectiveId: string;
  objectiveName: string;
}

// Shape returned by GET /api/objectives/:objectiveId/tasks
interface RawTaskBase {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  assigned_team_members?: string[];
}

interface RawTaskWithObjective extends RawTaskBase {
  objectiveId: string;
  objectiveName: string;
}

interface ObjectiveSummary {
  id: string;
  name: string;
}

interface ProjectTaskTableProps {
  projectId: string;
  projectName?: string | null;
  objectives: ObjectiveSummary[];
  filterObjectiveId?: string;
  onAddTaskClick?: () => void;
}

export function ProjectTaskTable({
  projectId,
  projectName,
  objectives,
  filterObjectiveId,
  onAddTaskClick,
}: ProjectTaskTableProps) {
  const { session, profile } = useAuth();
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const queryClient = useQueryClient();

  const filteredObjectives = (objectives ?? []).filter((o) =>
    filterObjectiveId ? o.id === filterObjectiveId : true,
  );

  const objectiveIds = filteredObjectives.map((o) => o.id).filter(Boolean);

  const isObjectiveScoped = !!filterObjectiveId && objectiveIds.length === 1;

  const {
    data: rawTasks,
    isLoading,
    error,
  } = useQuery<RawTaskWithObjective[]>({
    queryKey: ['project-tasks', projectId, objectiveIds],
    queryFn: async () => {
      if (!projectId || objectiveIds.length === 0) return [];

      const allTasks: RawTaskWithObjective[] = [];

      for (const objectiveId of objectiveIds) {
        const response = await fetch(`/api/objectives/${objectiveId}/tasks`, {
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${session?.access_token ?? ''}`,
          },
        });

        let json: unknown = null;

        try {
          json = await response.json();
        } catch {
          json = null;
        }

        if (!response.ok) {
          // For 404/403, log and skip this objective instead of failing the whole table
          if (response.status === 404 || response.status === 403) {
            // eslint-disable-next-line no-console
            console.warn('Tasks API returned', response.status, 'for objective', objectiveId, json);
            continue;
          }

          let message: string | null = null;
          if (json && typeof json === 'object') {
            const jsonObj = json as { message?: unknown };
            if (typeof jsonObj.message === 'string') {
              message = jsonObj.message;
            }
          }

          if (!message) {
            message = `Failed to fetch tasks (status ${response.status})`;
          }

          // eslint-disable-next-line no-console
          console.error('Error fetching tasks for objective', objectiveId, {
            status: response.status,
            body: json,
          });

          throw new Error(message);
        }

        let tasksForObjective: RawTaskBase[] = [];

        if (Array.isArray(json)) {
          tasksForObjective = json as RawTaskBase[];
        } else if (json && typeof json === 'object') {
          const jsonObj = json as { tasks?: unknown };
          if (Array.isArray(jsonObj.tasks)) {
            tasksForObjective = jsonObj.tasks as RawTaskBase[];
          }
        }
        const objectiveName = filteredObjectives.find((o) => o.id === objectiveId)?.name ?? 'Objective';

        for (const task of tasksForObjective) {
          allTasks.push({
            ...task,
            objectiveId,
            objectiveName,
          });
        }
      }

      return allTasks;
    },
    enabled: !!projectId && objectiveIds.length > 0,
  });

  interface TeamMember {
    id: string;
    name: string;
    role: string;
  }

  const { data: teamMembers } = useQuery<TeamMember[]>({
    queryKey: ['teamMembers', profile?.teamId],
    queryFn: async () => {
      if (!profile?.teamId) throw new Error('No team ID');

      const response = await fetch(`/api/teams/${profile.teamId}/members`, {
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }

      return response.json();
    },
    enabled: !!profile?.teamId,
  });

  const tasks: ProjectTask[] = (rawTasks ?? []).map((task) => {
    const assignedIds: string[] = Array.isArray(task.assigned_team_members)
      ? task.assigned_team_members
      : [];

    const assignees: TaskAssignee[] = (teamMembers || [])
      .filter((member) => assignedIds.includes(member.id))
      .map((member) => ({
        teamMemberId: member.id,
        name: member.name,
        role: member.role,
      }));

    const priorityMap: Record<number, ProjectTask['priority']> = {
      1: 'high',
      2: 'medium',
      3: 'low',
    };

    const mappedPriority: ProjectTask['priority'] = priorityMap[task.priority] ?? 'medium';

    const mappedStatus: ProjectTask['status'] =
      task.status === 'todo' || task.status === 'in_progress' || task.status === 'complete'
        ? task.status
        : 'todo';

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: mappedStatus,
      priority: mappedPriority,
      dueDate: task.dueDate,
      assignedMembers: assignees,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      objectiveId: task.objectiveId,
      objectiveName: task.objectiveName,
    };
  });

  const [orderedTasks, setOrderedTasks] = useState<ProjectTask[]>([]);

  useEffect(() => {
    if (isObjectiveScoped) {
      setOrderedTasks(tasks);
    }
  }, [isObjectiveScoped, tasks]);

  const projectViewSortedTasks = [...tasks].sort((a, b) => {
    if (a.objectiveName.toLowerCase() < b.objectiveName.toLowerCase()) return -1;
    if (a.objectiveName.toLowerCase() > b.objectiveName.toLowerCase()) return 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const displayTasks = isObjectiveScoped
    ? (orderedTasks.length > 0 ? orderedTasks : tasks)
    : projectViewSortedTasks;

  const getStatusBadgeVariant = (status: ProjectTask['status']) => {
    switch (status) {
      case 'complete':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'todo':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityBadgeVariant = (priority: ProjectTask['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-600 text-white border-red-700';
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: ProjectTask['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'Urgent';
      case 'high':
        return 'High';
      case 'medium':
        return 'Medium';
      case 'low':
      default:
        return 'Low';
    }
  };

  const handleEditTask = (task: ProjectTask) => {
    setSelectedTask(task);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedTask(null);
  };

  const reorderMutation = useMutation({
    mutationFn: async (taskIds: string[]) => {
      if (!filterObjectiveId || taskIds.length === 0) return;

      const response = await fetch(`/api/objectives/${filterObjectiveId}/tasks/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        credentials: 'include',
        body: JSON.stringify({ task_ids: taskIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to reorder tasks');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !isObjectiveScoped) {
      return;
    }

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) {
      return;
    }

    setOrderedTasks((prev) => {
      const items = [...prev];
      const [moved] = items.splice(sourceIndex, 1);
      items.splice(destinationIndex, 0, moved);

      const ids = items.map((item) => item.id);
      reorderMutation.mutate(ids);

      return items;
    });
  };

  if (!projectId) {
    return null;
  }

  if (objectiveIds.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No objectives found for this project yet.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Loading tasks for {projectName ?? 'project'}...
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load project tasks. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!displayTasks || displayTasks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 w-full">
        <div className="bg-blue-600 px-6 py-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <ClipboardList className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Your Tasks</h2>
          </div>
          {onAddTaskClick && (
            <Button
              onClick={onAddTaskClick}
              className="bg-green-600 hover:bg-green-700 text-white"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          )}
        </div>
        <div className="p-6">
          <div className="py-8 text-center text-muted-foreground">
            No tasks yet for this context.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 w-full">
      <div className="bg-blue-600 px-6 py-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <ClipboardList className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Your Tasks</h2>
        </div>
        {onAddTaskClick && (
          <Button
            onClick={onAddTaskClick}
            className="bg-green-600 hover:bg-green-700 text-white"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        )}
      </div>
      <div className="p-6 overflow-x-auto">
        {isObjectiveScoped ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <table className="w-full table-fixed min-w-[640px]">
              <colgroup>
                <col style={{ width: '6%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '38%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '4%' }} />
              </colgroup>
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" />
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Person
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <Droppable droppableId="objective-tasks">
                {(provided) => (
                  <tbody
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="bg-white divide-y divide-gray-200"
                  >
                    {displayTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(draggableProvided, snapshot) => (
                          <tr
                            ref={draggableProvided.innerRef}
                            {...draggableProvided.draggableProps}
                            className={`hover:bg-gray-50 transition-colors${snapshot.isDragging ? ' bg-gray-100' : ''}`}
                          >
                            <td className="px-2 py-3 text-center align-top">
                              <button
                                type="button"
                                className="cursor-grab text-gray-400 hover:text-gray-600"
                                {...draggableProvided.dragHandleProps}
                                aria-label="Reorder task"
                              >
                                <GripVertical className="h-4 w-4" />
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 align-top">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={`${getStatusBadgeVariant(task.status)} cursor-pointer`}
                                  onClick={() => handleEditTask(task)}
                                  role="button"
                                  aria-label="Edit task status"
                                >
                                  {task.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 align-top">
                              <Badge
                                variant="outline"
                                className={getPriorityBadgeVariant(task.priority)}
                              >
                                {getPriorityLabel(task.priority)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 align-top">
                              <div className="font-medium break-words" style={{ overflowWrap: 'anywhere' }}>
                                {task.title}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Objective: {task.objectiveName}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 align-top">
                              {task.assignedMembers && task.assignedMembers.length > 0 ? (
                                <div className="flex items-center gap-2">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="flex -space-x-2">
                                      {task.assignedMembers.map((member, memberIndex) => (
                                        <Avatar
                                          key={`${member.teamMemberId}-${memberIndex}`}
                                          className="h-7 w-7 border-2 border-background"
                                          title={member.name}
                                        >
                                          <AvatarFallback className="text-xs">
                                            {member.name
                                              .split(' ')
                                              .map((n) => n[0])
                                              .join('')
                                              .toUpperCase()
                                              .slice(0, 2)}
                                          </AvatarFallback>
                                        </Avatar>
                                      ))}
                                    </div>
                                    <span className="text-xs text-gray-700 truncate max-w-[160px]">
                                      {task.assignedMembers.map((member) => member.name).join(', ')}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Unassigned</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 align-top">
                              {task.dueDate ? (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">No date</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 align-top">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditTask(task)}
                                aria-label="Edit task"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </tbody>
                )}
              </Droppable>
            </table>
          </DragDropContext>
        ) : (
          <table className="w-full table-fixed min-w-[640px]">
            <colgroup>
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '40%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '4%' }} />
            </colgroup>
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Person
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-900 align-top">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`${getStatusBadgeVariant(task.status)} cursor-pointer`}
                        onClick={() => handleEditTask(task)}
                        role="button"
                        aria-label="Edit task status"
                      >
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 align-top">
                    <Badge
                      variant="outline"
                      className={getPriorityBadgeVariant(task.priority)}
                    >
                      {getPriorityLabel(task.priority)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 align-top">
                    <div className="font-medium break-words" style={{ overflowWrap: 'anywhere' }}>
                      {task.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Objective: {task.objectiveName}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 align-top">
                    {task.assignedMembers && task.assignedMembers.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex -space-x-2">
                            {task.assignedMembers.map((member, index) => (
                              <Avatar
                                key={`${member.teamMemberId}-${index}`}
                                className="h-7 w-7 border-2 border-background"
                                title={member.name}
                              >
                                <AvatarFallback className="text-xs">
                                  {member.name
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .toUpperCase()
                                    .slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                          <span className="text-xs text-gray-700 truncate max-w-[160px]">
                            {task.assignedMembers.map((member) => member.name).join(', ')}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 align-top">
                    {task.dueDate ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No date</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 align-top">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditTask(task)}
                      aria-label="Edit task"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Task Modal */}
      {selectedTask && (
        <EditTaskModal
          open={showEditModal}
          onClose={handleCloseEditModal}
          task={selectedTask}
          objectiveId={selectedTask.objectiveId}
        />
      )}
    </div>
  );
}
