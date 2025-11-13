/**
 * Objectives List Component
 * 
 * Displays all objectives for a selected project
 * Shows name, status, and completion information
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Circle, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Objective {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'paused';
  completionStatus: boolean | null;
  estimatedCompletionDate: string | null;
  actualCompletionDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ObjectivesListProps {
  projectId: string;
  onObjectiveClick?: (objectiveId: string) => void;
}

export function ObjectivesList({ projectId, onObjectiveClick }: ObjectivesListProps) {
  const { session } = useAuth();
  const { data: objectives, isLoading, error } = useQuery<Objective[]>({
    queryKey: ['objectives', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/objectives`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch objectives');
      }

      return response.json();
    },
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Loading objectives...
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load objectives. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!objectives || objectives.length === 0) {
    return (
      <div className="py-12 text-center">
        <Circle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-2">No objectives yet</p>
        <p className="text-sm text-muted-foreground">
          Click "Add Objective" to start the 17-step journey
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {objectives.map((objective) => (
        <Card 
          key={objective.id}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onObjectiveClick?.(objective.id)}
        >
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {objective.completionStatus ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <h4 className="font-semibold">{objective.name}</h4>
                  {objective.estimatedCompletionDate && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      Est. completion: {new Date(objective.estimatedCompletionDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    objective.status === 'completed'
                      ? 'default'
                      : objective.status === 'paused'
                      ? 'secondary'
                      : 'outline'
                  }
                >
                  {objective.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="pt-4 text-sm text-muted-foreground text-center">
        {objectives.length} objective{objectives.length !== 1 ? 's' : ''} total
      </div>
    </div>
  );
}
