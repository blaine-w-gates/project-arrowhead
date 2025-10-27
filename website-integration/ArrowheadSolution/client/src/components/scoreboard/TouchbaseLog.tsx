/**
 * Touchbase Log Component
 * 
 * Displays touchbase history for a selected objective
 * Collapsible section with date, participant, and preview
 * Includes "New Touchbase" button
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronDown, ChevronUp, Plus, Calendar, User } from 'lucide-react';

interface Touchbase {
  id: number;
  date: string;
  participantName: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface TouchbaseLogProps {
  objectiveId: number;
}

export function TouchbaseLog({ objectiveId }: TouchbaseLogProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: touchbases, isLoading, error } = useQuery<Touchbase[]>({
    queryKey: ['touchbases', objectiveId],
    queryFn: async () => {
      const response = await fetch(`/api/objectives/${objectiveId}/touchbases`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch touchbases');
      }

      return response.json();
    },
    enabled: !!objectiveId,
  });

  const handleNewTouchbase = () => {
    // TODO: Implement New Touchbase modal in future iteration
    alert('New Touchbase modal: Coming in next phase');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Touchbases
            {touchbases && touchbases.length > 0 && (
              <Badge variant="secondary">{touchbases.length}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleNewTouchbase}>
              <Plus className="mr-2 h-3 w-3" />
              New Touchbase
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="mr-2 h-4 w-4" />
                  Hide
                </>
              ) : (
                <>
                  <ChevronDown className="mr-2 h-4 w-4" />
                  Show
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          {isLoading ? (
            <div className="py-6 text-center text-muted-foreground">
              Loading touchbases...
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to load touchbases. Please try again.
              </AlertDescription>
            </Alert>
          ) : !touchbases || touchbases.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground mb-2">No touchbases yet</p>
              <p className="text-sm text-muted-foreground">
                Click "New Touchbase" to record your first 1-on-1 meeting
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {touchbases.map((touchbase) => (
                <div
                  key={touchbase.id}
                  className="border rounded-lg p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {new Date(touchbase.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{touchbase.participantName}</span>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {touchbase.notes}
                  </p>
                </div>
              ))}

              <div className="pt-2 text-sm text-muted-foreground text-center">
                {touchbases.length} touchbase{touchbases.length !== 1 ? 's' : ''} recorded
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
