/**
 * RRGT Grid Component
 * 
 * Displays the 6-column RRGT grid (Red, Red/Yellow, Yellow, Yellow/Green, Green, Top Priority)
 * Shows task titles for the selected view (self or God-view)
 * 
 * PRD v5.2 Section 3.4: RRGT Grid Structure
 */

import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface RrgtItem {
  id: number;
  taskTitle: string;
  column: 'red' | 'red_yellow' | 'yellow' | 'yellow_green' | 'green' | 'top_priority';
  position: number;
}

interface RrgtGridProps {
  projectId: number | null;
  objectiveId: number | null;
  memberIds?: string[];
  currentUserId: string;
}

const COLUMN_CONFIG = [
  { key: 'red', label: 'Red', color: 'bg-red-50 border-red-200' },
  { key: 'red_yellow', label: 'Red/Yellow', color: 'bg-orange-50 border-orange-200' },
  { key: 'yellow', label: 'Yellow', color: 'bg-yellow-50 border-yellow-200' },
  { key: 'yellow_green', label: 'Yellow/Green', color: 'bg-lime-50 border-lime-200' },
  { key: 'green', label: 'Green', color: 'bg-green-50 border-green-200' },
  { key: 'top_priority', label: 'Top Priority', color: 'bg-purple-50 border-purple-200' },
] as const;

export function RrgtGrid({ projectId, objectiveId, memberIds, currentUserId: _ }: RrgtGridProps) {
  // Determine which endpoint to call based on filters
  const isGodView = memberIds && memberIds.length > 0;
  const endpoint = isGodView && memberIds.length === 1
    ? `/api/rrgt/${memberIds[0]}`
    : '/api/rrgt/mine';

  const { data: rrgtItems, isLoading, error } = useQuery<RrgtItem[]>({
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

  // Group items by column
  const itemsByColumn = COLUMN_CONFIG.reduce((acc, col) => {
    acc[col.key] = rrgtItems?.filter(item => item.column === col.key).sort((a, b) => a.position - b.position) || [];
    return acc;
  }, {} as Record<string, RrgtItem[]>);

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
      {/* Grid Header */}
      <div className="grid grid-cols-6 gap-2">
        {COLUMN_CONFIG.map((col) => (
          <div
            key={col.key}
            className={`p-3 rounded-t-lg border-b-4 ${col.color}`}
          >
            <h3 className="font-semibold text-sm text-center">
              {col.label}
            </h3>
            <div className="text-center mt-1">
              <Badge variant="secondary" className="text-xs">
                {itemsByColumn[col.key].length}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-6 gap-2 min-h-[400px]">
        {COLUMN_CONFIG.map((col) => (
          <div
            key={col.key}
            className={`border rounded-lg p-2 ${col.color}`}
          >
            <div className="space-y-2">
              {itemsByColumn[col.key].length > 0 ? (
                itemsByColumn[col.key].map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border rounded p-2 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <p className="text-sm font-medium line-clamp-2">
                      {item.taskTitle}
                    </p>
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
        {rrgtItems?.length || 0} total item{rrgtItems?.length !== 1 ? 's' : ''} in RRGT
      </div>
    </div>
  );
}
