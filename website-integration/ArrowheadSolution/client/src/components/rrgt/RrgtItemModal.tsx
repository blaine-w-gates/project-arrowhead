/**
 * RRGT Item Modal
 * 
 * Modal for creating and editing RRGT items
 * Handles: POST /api/tasks/:taskId/items and PUT /api/items/:itemId
 */

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

interface RrgtItem {
  id: string;
  taskId: string;
  teamMemberId: string;
  columnIndex: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface RrgtItemModalProps {
  open: boolean;
  onClose: () => void;
  editingItem: RrgtItem | null;
  taskId: string | null;
  columnIndex: number | null;
}

export function RrgtItemModal({
  open,
  onClose,
  editingItem,
  taskId,
  columnIndex,
}: RrgtItemModalProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const isEditing = !!editingItem;

  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title);
    } else {
      setTitle('');
    }
  }, [editingItem, open]);

  // Create item mutation
  const createMutation = useMutation({
    mutationFn: async (data: { title: string; column_index: number }) => {
      if (!taskId) throw new Error('Task ID is required');

      const response = await fetch(`/api/tasks/${taskId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to create item');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rrgt'] });
      handleClose();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Update item mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { title: string }) => {
      if (!editingItem) throw new Error('Editing item is required');

      const response = await fetch(`/api/items/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update item');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rrgt'] });
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
      setError('Item title is required');
      return;
    }

    if (isEditing) {
      updateMutation.mutate({ title: title.trim() });
    } else {
      if (columnIndex === null) {
        setError('Column index is required');
        return;
      }
      createMutation.mutate({
        title: title.trim(),
        column_index: columnIndex,
      });
    }
  };

  const handleClose = () => {
    setTitle('');
    setError('');
    onClose();
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Item' : 'Create New Item'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the item title' : 'Add a new item to your RRGT grid'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="item-title">Item Title *</Label>
            <Input
              id="item-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter item title"
              disabled={isPending}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
