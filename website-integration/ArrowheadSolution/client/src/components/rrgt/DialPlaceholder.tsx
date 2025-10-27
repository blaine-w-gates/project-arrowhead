/**
 * Dial Component
 * 
 * Interactive Dial for comparing and prioritizing two RRGT items
 * Handles: PUT /api/dial/mine for all state changes
 * 
 * PRD v5.2 Section 3.4: Dial States & Privacy
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RrgtItem {
  id: string;
  taskId: string;
  title: string;
}

interface DialState {
  leftItemId: string | null;
  rightItemId: string | null;
  selectedItemId: string | null;
  isLeftPrivate: boolean;
  isRightPrivate: boolean;
}

interface DialProps {
  dialState: DialState | null;
  items: RrgtItem[];
}

export function DialPlaceholder({ dialState, items }: DialProps) {
  const queryClient = useQueryClient();
  // Find the actual items in the dial
  const leftItem = dialState?.leftItemId
    ? items.find(item => item.id === dialState.leftItemId) ?? null
    : null;
  
  const rightItem = dialState?.rightItemId
    ? items.find(item => item.id === dialState.rightItemId) ?? null
    : null;

  const getItemDisplay = (item: RrgtItem | null, isPrivate: boolean) => {
    if (!item) return 'Empty Slot';
    if (isPrivate) return '[Private Task]';
    return item.title;
  };

  const isItemSelected = (itemId: string | null) => {
    return dialState?.selectedItemId === itemId;
  };

  // Mutation for updating dial state
  const updateDialMutation = useMutation({
    mutationFn: async (newState: {
      leftItemId: string | null;
      rightItemId: string | null;
      selectedItemId: string | null;
      isLeftPrivate: boolean;
      isRightPrivate: boolean;
    }) => {
      const response = await fetch('/api/dial/mine', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newState),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update dial');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rrgt'] });
    },
  });

  // Handler to select an item as primary focus
  const handleSelectItem = (itemId: string) => {
    if (!dialState) return;

    const newState = {
      leftItemId: dialState.leftItemId,
      rightItemId: dialState.rightItemId,
      selectedItemId: itemId === dialState.selectedItemId ? null : itemId,
      isLeftPrivate: dialState.isLeftPrivate,
      isRightPrivate: dialState.isRightPrivate,
    };

    updateDialMutation.mutate(newState);
  };

  // Handler to remove an item from the dial
  const handleRemoveItem = (slot: 'left' | 'right') => {
    if (!dialState) return;

    const newState = {
      leftItemId: slot === 'left' ? null : dialState.leftItemId,
      rightItemId: slot === 'right' ? null : dialState.rightItemId,
      selectedItemId: slot === 'left' && dialState.selectedItemId === dialState.leftItemId
        ? null
        : slot === 'right' && dialState.selectedItemId === dialState.rightItemId
        ? null
        : dialState.selectedItemId,
      isLeftPrivate: slot === 'left' ? false : dialState.isLeftPrivate,
      isRightPrivate: slot === 'right' ? false : dialState.isRightPrivate,
    };

    updateDialMutation.mutate(newState);
  };

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-600" />
          The Dial
          <Badge variant="secondary" className="ml-2">
            Priority Comparison
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {updateDialMutation.error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              {updateDialMutation.error.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-center items-center gap-8">
          {/* Left Slot */}
          <div className="relative group">
            <div 
              className={`
                w-48 min-h-32 border-4 rounded-lg p-4 bg-white flex items-center justify-center text-center
                transition-all relative
                ${leftItem && !dialState?.isLeftPrivate ? 'cursor-pointer hover:shadow-lg' : ''}
                ${isItemSelected(dialState?.leftItemId || null) ? 'border-purple-500 shadow-lg' : 'border-purple-300'}
                ${dialState?.isLeftPrivate ? 'bg-purple-50' : ''}
                ${updateDialMutation.isPending ? 'opacity-50' : ''}
              `}
              onClick={() => leftItem && dialState?.leftItemId && !dialState?.isLeftPrivate && handleSelectItem(dialState.leftItemId)}
            >
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {getItemDisplay(leftItem, dialState?.isLeftPrivate || false)}
                </p>
                {isItemSelected(dialState?.leftItemId || null) && (
                  <Badge className="bg-purple-600">Primary Focus</Badge>
                )}
              </div>
              
              {leftItem && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveItem('left');
                  }}
                  disabled={updateDialMutation.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* VS Divider */}
          <div className="text-4xl font-bold text-purple-600">VS</div>

          {/* Right Slot */}
          <div className="relative group">
            <div 
              className={`
                w-48 min-h-32 border-4 rounded-lg p-4 bg-white flex items-center justify-center text-center
                transition-all relative
                ${rightItem && !dialState?.isRightPrivate ? 'cursor-pointer hover:shadow-lg' : ''}
                ${isItemSelected(dialState?.rightItemId || null) ? 'border-blue-500 shadow-lg' : 'border-blue-300'}
                ${dialState?.isRightPrivate ? 'bg-blue-50' : ''}
                ${updateDialMutation.isPending ? 'opacity-50' : ''}
              `}
              onClick={() => rightItem && dialState?.rightItemId && !dialState?.isRightPrivate && handleSelectItem(dialState.rightItemId)}
            >
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {getItemDisplay(rightItem, dialState?.isRightPrivate || false)}
                </p>
                {isItemSelected(dialState?.rightItemId || null) && (
                  <Badge className="bg-blue-600">Primary Focus</Badge>
                )}
              </div>
              
              {rightItem && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveItem('right');
                  }}
                  disabled={updateDialMutation.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 text-center space-y-1">
          <p className="text-sm text-muted-foreground">
            Click an item in the Dial to select it as your primary focus
          </p>
          <p className="text-xs text-muted-foreground">
            Hover over items to reveal the remove button
          </p>
          <p className="text-xs text-muted-foreground italic">
            Note: Drag-and-drop from grid coming in next phase
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
