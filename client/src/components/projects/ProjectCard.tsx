/**
 * Project Card Component
 * 
 * Displays a single project with vision status, completion tracker,
 * and actions menu (rename, archive, delete)
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, FileText, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { VisionModal } from './VisionModal';
import { CompletionTracker } from './CompletionTracker';
import { RenameProjectDialog } from './RenameProjectDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { Badge } from '@/components/ui/badge';

interface Project {
  id: string;
  name: string;
  isArchived: boolean;
  visionData: {
    q1_purpose?: string;
    q2_achieve?: string;
    q3_market?: string;
    q4_customers?: string;
    q5_win?: string;
  } | null;
  completionStatus: boolean | null;
  estimatedCompletionDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProjectCardProps {
  project: Project;
  teamId: string;
}

export function ProjectCard({ project, teamId }: ProjectCardProps) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [showVisionModal, setShowVisionModal] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Archive/Restore mutation
  const archiveMutation = useMutation({
    mutationFn: async (isArchived: boolean) => {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        credentials: 'include',
        body: JSON.stringify({ is_archived: isArchived }),
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', teamId] });
    },
  });

  const handleArchiveToggle = () => {
    archiveMutation.mutate(!project.isArchived);
  };

  const hasVision = project.visionData && Object.keys(project.visionData).some(
    key => project.visionData![key as keyof typeof project.visionData]
  );

  const visionFilledCount = project.visionData
    ? Object.values(project.visionData).filter(v => v && v.trim()).length
    : 0;

  return (
    <>
      <Card className={project.isArchived ? 'opacity-60' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold">{project.name}</h3>
              {project.isArchived && (
                <Badge variant="secondary">Archived</Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowVisionModal(true)}
              >
                <FileText className="mr-2 h-4 w-4" />
                {hasVision ? 'Edit Vision' : 'Add Vision'}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid="project-menu-trigger">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowRenameDialog(true)}>
                    Rename Project
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleArchiveToggle}>
                    {project.isArchived ? (
                      <>
                        <ArchiveRestore className="mr-2 h-4 w-4" />
                        Restore Project
                      </>
                    ) : (
                      <>
                        <Archive className="mr-2 h-4 w-4" />
                        Archive Project
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Vision Status */}
          <div className="text-sm text-muted-foreground mt-2">
            {hasVision ? (
              <span>
                Vision: {visionFilledCount}/5 questions answered
              </span>
            ) : (
              <span>No vision statement yet</span>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <CompletionTracker
            projectId={project.id}
            completionStatus={project.completionStatus}
            estimatedCompletionDate={project.estimatedCompletionDate}
          />
        </CardContent>
      </Card>

      {/* Modals */}
      <VisionModal
        open={showVisionModal}
        onClose={() => setShowVisionModal(false)}
        projectId={project.id}
        teamId={teamId}
        isNew={!hasVision}
        initialData={project.visionData}
      />

      <RenameProjectDialog
        open={showRenameDialog}
        onClose={() => setShowRenameDialog(false)}
        projectId={project.id}
        currentName={project.name}
        teamId={teamId}
      />

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        projectId={project.id}
        projectName={project.name}
        teamId={teamId}
      />
    </>
  );
}
