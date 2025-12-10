import { Target, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DialApiState {
  team_member_id: string;
  left_plan_id: string | null;
  left_column_index: number | null;
  left_text: string | null;
  right_plan_id: string | null;
  right_column_index: number | null;
  right_text: string | null;
  selected_slot: 'left' | 'right' | null;
  is_left_private: boolean;
  is_right_private: boolean;
  leftTaskTitle: string | null;
  rightTaskTitle: string | null;
}

export interface DialUpdatePayload {
  left_plan_id?: string | null;
  left_column_index?: number | null;
  left_text?: string | null;
  is_left_private?: boolean;
  right_plan_id?: string | null;
  right_column_index?: number | null;
  right_text?: string | null;
  is_right_private?: boolean;
  selected_slot?: 'left' | 'right' | null;
}

interface DialProps {
  dialState: DialApiState | null;
  targetingSlot: 'left' | 'right' | null;
  onSlotClick: (side: 'left' | 'right') => void;
  onClearSlot: (side: 'left' | 'right') => void;
  onReset: () => void;
  onUpdate: (payload: DialUpdatePayload) => void;
  isLoading?: boolean;
  className?: string;
}

export function Dial({
  dialState,
  targetingSlot,
  onSlotClick,
  onClearSlot,
  onReset,
  onUpdate: _onUpdate, // currently not used directly, but kept for future flexibility
  isLoading,
  className,
}: DialProps) {
  const leftSelected = dialState?.selected_slot === 'left';
  const rightSelected = dialState?.selected_slot === 'right';

  const isTargetingLeft = targetingSlot === 'left';
  const isTargetingRight = targetingSlot === 'right';

  const leftTitle = dialState?.leftTaskTitle || 'Click to choose a Matrix cell';
  const rightTitle = dialState?.rightTaskTitle || 'Click to choose a Matrix cell';

  const leftText = dialState?.left_text || '';
  const rightText = dialState?.right_text || '';

  const leftDisplay = dialState?.is_left_private
    ? (leftText || 'Private Task')
    : leftText || leftTitle;

  const rightDisplay = dialState?.is_right_private
    ? (rightText || 'Private Task')
    : rightText || rightTitle;

  const leftHasValue = !!(dialState?.left_plan_id || dialState?.left_text || dialState?.is_left_private);
  const rightHasValue = !!(dialState?.right_plan_id || dialState?.is_right_private);
  const dialHasAnyValue = leftHasValue || rightHasValue || !!dialState?.selected_slot;

  return (
    <Card className={cn('mt-6 bg-gradient-to-r from-purple-50 to-blue-50', className)}>
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
        <div className="flex justify-center items-center gap-8">
          {/* Left Slot */}
          <div className="relative">
            <div
              className={cn(
                'w-52 min-h-32 border-4 rounded-lg p-4 bg-white flex flex-col items-center justify-center text-center transition-all relative',
                leftSelected
                  ? 'border-amber-400 bg-amber-50 shadow-lg'
                  : 'border-purple-300',
                dialState?.is_left_private ? 'bg-purple-50' : '',
                isTargetingLeft ? 'ring-2 ring-purple-400 animate-pulse' : '',
                isLoading ? 'opacity-60 pointer-events-none' : 'cursor-pointer hover:shadow-lg',
              )}
              onClick={() => onSlotClick('left')}
            >
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Left</p>
                <p className="text-sm font-medium break-words whitespace-pre-wrap">
                  {leftDisplay}
                </p>
                {leftSelected && (
                  <Badge className="bg-purple-600">Primary Focus</Badge>
                )}
              </div>

              {leftHasValue && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 p-0"
                  onClick={(event) => {
                    event.stopPropagation();
                    onClearSlot('left');
                  }}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="text-4xl font-bold text-purple-600">VS</div>

          {/* Right Slot */}
          <div className="relative">
            <div
              className={cn(
                'w-52 min-h-32 border-4 rounded-lg p-4 bg-white flex flex-col items-center justify-center text-center transition-all relative',
                rightSelected
                  ? 'border-amber-400 bg-amber-50 shadow-lg'
                  : 'border-blue-300',
                dialState?.is_right_private ? 'bg-blue-50' : '',
                isTargetingRight ? 'ring-2 ring-blue-400 animate-pulse' : '',
                isLoading ? 'opacity-60 pointer-events-none' : 'cursor-pointer hover:shadow-lg',
              )}
              onClick={() => onSlotClick('right')}
            >
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Right</p>
                <p className="text-sm font-medium break-words whitespace-pre-wrap">
                  {rightDisplay}
                </p>
                {rightSelected && (
                  <Badge className="bg-blue-600">Primary Focus</Badge>
                )}
              </div>

              {rightHasValue && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 p-0"
                  onClick={(event) => {
                    event.stopPropagation();
                    onClearSlot('right');
                  }}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 text-center space-y-1">
          <p className="text-sm text-muted-foreground">
            Click a Dial slot to enter targeting mode, then click a Matrix cell to assign it.
            Click a filled slot to toggle your Primary Focus.
          </p>
          {dialHasAnyValue && (
            <div className="mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onReset}
                disabled={isLoading}
              >
                Reset Dial
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
