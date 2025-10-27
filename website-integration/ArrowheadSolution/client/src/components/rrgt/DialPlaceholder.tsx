/**
 * Dial Component
 * 
 * Interactive Dial for comparing and prioritizing two RRGT items
 * Handles: PUT /api/dial/mine for all state changes
 * 
 * PRD v5.2 Section 3.4: Dial States & Privacy
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target } from 'lucide-react';

interface RrgtItem {
  id: string;
  title: string;
}

interface DialState {
  leftItemId: string | null;
  rightItemId: string | null;
  selectedItemId: string | null;
  isLeftPrivate: boolean;
  isRightPrivate: boolean;
}

interface DialPlaceholderProps {
  dialState: DialState | null;
  items: RrgtItem[];
}

export function DialPlaceholder({ dialState, items }: DialPlaceholderProps) {
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
        <div className="flex justify-center items-center gap-8">
          {/* Left Slot */}
          <div className={`
            w-48 min-h-32 border-4 rounded-lg p-4 bg-white flex items-center justify-center text-center
            transition-all
            ${isItemSelected(dialState?.leftItemId || null) ? 'border-purple-500 shadow-lg' : 'border-purple-300'}
            ${dialState?.isLeftPrivate ? 'bg-purple-50' : ''}
          `}>
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {getItemDisplay(leftItem, dialState?.isLeftPrivate || false)}
              </p>
              {isItemSelected(dialState?.leftItemId || null) && (
                <Badge className="bg-purple-600">Primary Focus</Badge>
              )}
            </div>
          </div>

          {/* VS Divider */}
          <div className="text-4xl font-bold text-purple-600">VS</div>

          {/* Right Slot */}
          <div className={`
            w-48 min-h-32 border-4 rounded-lg p-4 bg-white flex items-center justify-center text-center
            transition-all
            ${isItemSelected(dialState?.rightItemId || null) ? 'border-blue-500 shadow-lg' : 'border-blue-300'}
            ${dialState?.isRightPrivate ? 'bg-blue-50' : ''}
          `}>
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {getItemDisplay(rightItem, dialState?.isRightPrivate || false)}
              </p>
              {isItemSelected(dialState?.rightItemId || null) && (
                <Badge className="bg-blue-600">Primary Focus</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Drag items from the RRGT grid to compare priorities
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Click on an item to select it as your primary focus
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
