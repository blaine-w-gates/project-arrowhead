/**
 * RRGT Grid Component
 * 
 * Displays the 6-column RRGT grid with full CRUD operations
 * Shows RRGT items with add, edit, delete functionality
 * 
 * PRD v5.2 Section 3.4: RRGT Grid Structure & Item Management
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { RrgtItemModal } from './RrgtItemModal';

interface Task {
  id: string;
  title: string;
  objectiveId: string;
}

interface RrgtItem {
  id: string;
  taskId: string;
  teamMemberId: string;
  columnIndex: number; // 1-6
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface RrgtData {
  tasks: Task[];
  items: RrgtItem[];
  dial_state: {
    leftItemId: string | null;
    rightItemId: string | null;
    selectedItemId: string | null;
    isLeftPrivate: boolean;
    isRightPrivate: boolean;
  } | null;
}

interface RrgtGridProps {
  projectId: number | null;
  objectiveId: number | null;
  memberIds?: string[];
  currentUserId: string;
}

const COLUMN_CONFIG = [
  { index: 1, label: 'Red', color: 'bg-red-50 border-red-200' },
  { index: 2, label: 'Red/Yellow', color: 'bg-orange-50 border-orange-200' },
  { index: 3, label: 'Yellow', color: 'bg-yellow-50 border-yellow-200' },
  { index: 4, label: 'Yellow/Green', color: 'bg-lime-50 border-lime-200' },
  { index: 5, label: 'Green', color: 'bg-green-50 border-green-200' },
  { index: 6, label: 'Top Priority', color: 'bg-purple-50 border-purple-200' },
] as const;

export function RrgtGrid({ projectId, objectiveId, memberIds, currentUserId }: RrgtGridProps) {
  const queryClient = useQueryClient();
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<RrgtItem | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | null>(null);

  // Determine which endpoint to call based on filters
  const isGodView = memberIds && memberIds.length > 0;
  const endpoint = isGodView && memberIds.length === 1
    ? `/api/rrgt/${memberIds[0]}`
    : '/api/rrgt/mine';

  const { data: rrgtData, isLoading, error } = useQuery<RrgtData>({
    queryKey: ['rrgt', endpoint, projectId, objectiveId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId) params.append('project_id', projectId.toString());
      if (objectiveId) params.append('objective_id', objectiveId.toString());

      const url = `${endpoint}${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch RRGT data');
      }

      return response.json();
    },
  });

  // Delete item mutation
  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rrgt'] });
    },
  });

  // Filter tasks based on project/objective filters
  const filteredTasks = rrgtData?.tasks.filter(task => {
    if (objectiveId && task.objectiveId !== objectiveId.toString()) return false;
    return true;
  }) || [];

  // Group items by column (1-6)
  const itemsByColumn = COLUMN_CONFIG.reduce((acc, col) => {
    acc[col.index] = rrgtData?.items.filter(item => item.columnIndex === col.index) || [];
    return acc;
  }, {} as Record<number, RrgtItem[]>);

  const handleAddItem = (taskId: string, columnIndex: number) => {
    setSelectedTaskId(taskId);
    setSelectedColumnIndex(columnIndex);
    setEditingItem(null);
    setShowItemModal(true);
  };

  const handleEditItem = (item: RrgtItem) => {
    setEditingItem(item);
    setSelectedTaskId(null);
    setSelectedColumnIndex(null);
    setShowItemModal(true);
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      deleteMutation.mutate(itemId);
    }
  };

  const canModifyItem = (item: RrgtItem) => {
    return item.teamMemberId === currentUserId;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Loading RRGT data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load RRGT data. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  // Show message if viewing God-view with multiple members
  if (isGodView && memberIds && memberIds.length > 1) {
    return (
      <Alert>
        <AlertDescription>
          <strong>Multi-member God-view:</strong> Viewing {memberIds.length} team members.
          Full aggregation feature coming in next phase. Currently showing combined task titles.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Task List with Add Item Buttons */}
      {!isGodView && filteredTasks.length > 0 && (
        <div className="mb-4 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-semibold text-sm mb-3">Your Assigned Tasks</h4>
          <div className="space-y-2">
            {filteredTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between bg-background p-2 rounded">
                <span className="text-sm">{task.title}</span>
                <div className="flex gap-1">
                  {COLUMN_CONFIG.map(col => (
                    <Button
                      key={col.index}
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddItem(task.id, col.index)}
                      className="h-7 px-2"
                      title={`Add item to ${col.label}`}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid Header */}
      <div className="grid grid-cols-6 gap-2">
        {COLUMN_CONFIG.map((col) => (
          <div
            key={col.index}
            className={`p-3 rounded-t-lg border-b-4 ${col.color}`}
          >
            <h3 className="font-semibold text-sm text-center">
              {col.label}
            </h3>
            <div className="text-center mt-1">
              <Badge variant="secondary" className="text-xs">
                {itemsByColumn[col.index].length}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-6 gap-2 min-h-[400px]">
        {COLUMN_CONFIG.map((col) => (
          <div
            key={col.index}
            className={`border rounded-lg p-2 ${col.color}`}
          >
            <div className="space-y-2">
              {itemsByColumn[col.index].length > 0 ? (
                itemsByColumn[col.index].map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border rounded p-2 shadow-sm hover:shadow-md transition-shadow group relative"
                  >
                    <p className="text-sm font-medium line-clamp-2 pr-16">
                      {item.title}
                    </p>
                    {canModifyItem(item) && (
                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditItem(item)}
                          className="h-6 w-6 p-0"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteItem(item.id)}
                          className="h-6 w-6 p-0 text-destructive"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No items
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Total Count */}
      <div className="text-sm text-muted-foreground text-center pt-4">
        {rrgtData?.items.length || 0} total item{rrgtData?.items.length !== 1 ? 's' : ''} in RRGT
      </div>

      {/* Item Modal */}
      {showItemModal && (
        <RrgtItemModal
          open={showItemModal}
          onClose={() => setShowItemModal(false)}
          editingItem={editingItem}
          taskId={selectedTaskId}
          columnIndex={selectedColumnIndex}
        />
      )}
    </div>
  );
}
