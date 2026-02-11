/**
 * Objective Journey Wizard
 * 
 * Full-screen overlay for the 17-step objective journey
 * Manages state, navigation, and persistence for the complete flow
 * 
 * PRD v5.2 Section 3.2: 17-Step Journey Integration
 * SLAD v6.0 Section 3.0: Objectives table schema
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Loader2, Lock, ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { JourneyStep } from './journey/JourneyStep';
import journeyContent from '@/data/journeyContent.json';
import { AddTaskModal } from '@/components/scoreboard/AddTaskModal';

interface ObjectiveData {
  id: string;
  name: string;
  currentStep: number;
  journeyStatus: 'draft' | 'complete';
  targetCompletionDate: string | null;
  brainstormData: Record<string, string> | null;
  chooseData: Record<string, string> | null;
  objectivesData: Record<string, string> | null;
}

interface ObjectiveJourneyWizardProps {
  open: boolean;
  onClose: () => void;
  objectiveId: string;
}

type JourneyModule = 'brainstorm' | 'choose' | 'objectives';

const TOTAL_STEPS = 17;

// Map step number to module and local step
const getModuleAndStep = (stepNumber: number): { module: JourneyModule; localStep: number } => {
  if (stepNumber <= 5) {
    return { module: 'brainstorm', localStep: stepNumber };
  } else if (stepNumber <= 10) {
    return { module: 'choose', localStep: stepNumber - 5 };
  } else {
    return { module: 'objectives', localStep: stepNumber - 10 };
  }
};

// Mapping between global journey steps (1-17) and JSONB field names expected by the API
const STEP_FIELD_MAP: Record<number, { module: JourneyModule; field: string }> = {
  // Brainstorm (steps 1-5)
  1: { module: 'brainstorm', field: 'step1_imitate' },
  2: { module: 'brainstorm', field: 'step2_ideate' },
  3: { module: 'brainstorm', field: 'step3_ignore' },
  4: { module: 'brainstorm', field: 'step4_integrate' },
  5: { module: 'brainstorm', field: 'step5_interfere' },
  // Choose (steps 6-10)
  6: { module: 'choose', field: 'step1_scenarios' },
  7: { module: 'choose', field: 'step2_compare' },
  8: { module: 'choose', field: 'step3_important' },
  9: { module: 'choose', field: 'step4_evaluate' },
  10: { module: 'choose', field: 'step5_support' },
  // Objectives (steps 11-17)
  11: { module: 'objectives', field: 'step1_objective' },
  12: { module: 'objectives', field: 'step2_delegate' },
  13: { module: 'objectives', field: 'step3_resources' },
  14: { module: 'objectives', field: 'step4_obstacles' },
  15: { module: 'objectives', field: 'step5_milestones' },
  16: { module: 'objectives', field: 'step6_accountability' },
  17: { module: 'objectives', field: 'step7_review' },
};

// Reverse mapping to hydrate local answers state from API JSONB fields
const MODULE_FIELD_TO_STEP: Record<JourneyModule, Record<string, number>> = {
  brainstorm: {
    step1_imitate: 1,
    step2_ideate: 2,
    step3_ignore: 3,
    step4_integrate: 4,
    step5_interfere: 5,
  },
  choose: {
    step1_scenarios: 6,
    step2_compare: 7,
    step3_important: 8,
    step4_evaluate: 9,
    step5_support: 10,
  },
  objectives: {
    step1_objective: 11,
    step2_delegate: 12,
    step3_resources: 13,
    step4_obstacles: 14,
    step5_milestones: 15,
    step6_accountability: 16,
    step7_review: 17,
  },
};

export function ObjectiveJourneyWizard({ open, onClose, objectiveId }: ObjectiveJourneyWizardProps) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [hasLock, setHasLock] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [lockHeartbeatInterval, setLockHeartbeatInterval] = useState<NodeJS.Timeout | null>(null);
  const [autoSaveInterval, setAutoSaveInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

  // Fetch objective data with resume endpoint
  const { data: objective, isLoading, error } = useQuery<ObjectiveData>({
    queryKey: ['objective', objectiveId, 'resume'],
    queryFn: async () => {
      const response = await fetch(`/api/objectives/${objectiveId}/resume`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch objective');
      }

      const data = await response.json();
      const apiObjective = data.objective as {
        id: string;
        name: string;
        current_step?: number | null;
        journey_status?: 'draft' | 'complete' | null;
        brainstorm_data?: Record<string, string> | null;
        choose_data?: Record<string, string> | null;
        objectives_data?: Record<string, string> | null;
        target_completion_date?: string | null;
      };

      return {
        id: apiObjective.id,
        name: apiObjective.name,
        currentStep: apiObjective.current_step ?? 1,
        journeyStatus: apiObjective.journey_status ?? 'draft',
        targetCompletionDate: apiObjective.target_completion_date ?? null,
        brainstormData: apiObjective.brainstorm_data ?? null,
        chooseData: apiObjective.choose_data ?? null,
        objectivesData: apiObjective.objectives_data ?? null,
      } satisfies ObjectiveData;
    },
    enabled: open && !!objectiveId,
  });

  // Acquire lock on mount
  useEffect(() => {
    if (!open || !objectiveId) return;

    const acquireLock = async () => {
      try {
        const response = await fetch(`/api/objectives/${objectiveId}/lock`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${session?.access_token ?? ''}`,
          },
        });

        if (!response.ok) {
          const data = await response.json();
          setLockError(data.error || 'Failed to acquire lock');
          return;
        }

        setHasLock(true);
        setLockError(null);
        
        // Start heartbeat to keep lock alive (renew every 4 minutes, locks expire after 5)
        const heartbeat = setInterval(async () => {
          try {
            await fetch(`/api/objectives/${objectiveId}/lock`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Authorization': `Bearer ${session?.access_token ?? ''}`,
              },
            });
          } catch (err) {
            console.error('Lock heartbeat failed:', err);
          }
        }, 4 * 60 * 1000); // Every 4 minutes
        
        setLockHeartbeatInterval(heartbeat);
      } catch (err) {
        setLockError('Failed to acquire lock');
      }
    };

    acquireLock();

    // Release lock and clear heartbeat on unmount
    return () => {
      if (lockHeartbeatInterval) {
        clearInterval(lockHeartbeatInterval);
      }
      
      if (hasLock && objectiveId) {
        fetch(`/api/objectives/${objectiveId}/lock`, {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${session?.access_token ?? ''}`,
          },
        });
      }
    };
  }, [open, objectiveId, hasLock, lockHeartbeatInterval]);

  // Load objective data into local state
  useEffect(() => {
    if (!objective) return;

    // Set current step from objective (supports Yes/No branching via server current_step)
    setCurrentStep(objective.currentStep || 1);

    // Load all answers from the three JSONB data fields, mapping back to step_1..step_17 keys
    const allAnswers: Record<string, string> = {};

    if (objective.brainstormData) {
      Object.entries(objective.brainstormData).forEach(([field, value]) => {
        const stepNumber = MODULE_FIELD_TO_STEP.brainstorm[field as keyof typeof MODULE_FIELD_TO_STEP.brainstorm];
        if (stepNumber && typeof value === 'string' && value.length > 0) {
          allAnswers[`step_${stepNumber}`] = value;
        }
      });
    }

    if (objective.chooseData) {
      Object.entries(objective.chooseData).forEach(([field, value]) => {
        const stepNumber = MODULE_FIELD_TO_STEP.choose[field as keyof typeof MODULE_FIELD_TO_STEP.choose];
        if (stepNumber && typeof value === 'string' && value.length > 0) {
          allAnswers[`step_${stepNumber}`] = value;
        }
      });
    }

    if (objective.objectivesData) {
      Object.entries(objective.objectivesData).forEach(([field, value]) => {
        const stepNumber = MODULE_FIELD_TO_STEP.objectives[field as keyof typeof MODULE_FIELD_TO_STEP.objectives];
        if (stepNumber && typeof value === 'string' && value.length > 0) {
          allAnswers[`step_${stepNumber}`] = value;
        }
      });
    }

    setAnswers(allAnswers);
  }, [objective]);

  // Update objective mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: unknown) => {
      const response = await fetch(`/api/objectives/${objectiveId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update objective');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objective', objectiveId] });
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
    },
  });

  // Auto-save effect - save progress every 30 seconds if there are changes
  useEffect(() => {
    if (!hasLock || !open) return;

    const interval = setInterval(async () => {
      if (!updateMutation.isPending && Object.keys(answers).length > 0) {
        try {
          await saveProgress();
          setLastSaved(new Date());
        } catch (err) {
          console.error('Auto-save failed:', err);
        }
      }
    }, 30 * 1000); // Every 30 seconds

    setAutoSaveInterval(interval);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [hasLock, open, answers, updateMutation.isPending]);

  const handleAnswerChange = (stepKey: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [stepKey]: value,
    }));
  };

  const saveProgress = async (newStep?: number) => {
    const stepToSave = newStep || currentStep;

    const brainstormData: Record<string, string> = {};
    const chooseData: Record<string, string> = {};
    const objectivesData: Record<string, string> = {};

    Object.entries(answers).forEach(([key, value]: [string, string]) => {
      if (!value) return;
      const stepNum = parseInt(key.split('_')[1], 10);
      if (!stepNum || !STEP_FIELD_MAP[stepNum]) return;

      const { module, field } = STEP_FIELD_MAP[stepNum];

      if (module === 'brainstorm') {
        brainstormData[field] = value;
      } else if (module === 'choose') {
        chooseData[field] = value;
      } else {
        objectivesData[field] = value;
      }
    });

    const payload: Record<string, unknown> = {
      current_step: stepToSave,
      // The schema allows only 'draft' or 'complete'. Use 'draft' for all in-progress states.
      journey_status: stepToSave === TOTAL_STEPS ? 'complete' : 'draft',
    };

    if (Object.keys(brainstormData).length > 0) {
      payload.brainstorm_data = brainstormData;
    }
    if (Object.keys(chooseData).length > 0) {
      payload.choose_data = chooseData;
    }
    if (Object.keys(objectivesData).length > 0) {
      payload.objectives_data = objectivesData;
    }

    await updateMutation.mutateAsync(payload);
  };

  const handleNext = async () => {
    if (currentStep < TOTAL_STEPS) {
      const nextStep = currentStep + 1;
      await saveProgress(nextStep);
      setCurrentStep(nextStep);
    } else {
      // Complete journey
      await saveProgress(TOTAL_STEPS);
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraft = async () => {
    await saveProgress();
  };

  const handleClose = async () => {
    // Clear heartbeat
    if (lockHeartbeatInterval) {
      clearInterval(lockHeartbeatInterval);
      setLockHeartbeatInterval(null);
    }
    
    // Clear auto-save
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
      setAutoSaveInterval(null);
    }
    
    // Save current progress before closing
    if (!updateMutation.isPending) {
      await saveProgress();
    }
    
    onClose();
  };

  const { module, localStep } = getModuleAndStep(currentStep);
  const stepContent = journeyContent[module][localStep - 1];
  const progress = (currentStep / TOTAL_STEPS) * 100;

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Loading Objective Journey</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Loading journey...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !objective) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Objective Journey Error</DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load objective journey. Please try again.
            </AlertDescription>
          </Alert>
          <div className="flex justify-end mt-4">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show lock error if someone else is editing
  if (lockError && !hasLock) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Objective is Locked</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-yellow-600">
              <Lock className="h-5 w-5" />
              <h3 className="font-semibold">Objective is Locked</h3>
            </div>
            <Alert>
              <AlertDescription>
                {lockError.includes('is editing') 
                  ? lockError 
                  : 'This objective is currently being edited by another user. Please try again later.'}
              </AlertDescription>
            </Alert>
            <div className="flex justify-end">
              <Button onClick={onClose}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="p-6 border-b space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">{objective.name}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Step {currentStep} of {TOTAL_STEPS}: {stepContent.title}
              </p>
            </div>
            <Button variant="ghost" onClick={handleClose}>
              Close
            </Button>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>
                  {module === 'brainstorm' && 'Brainstorm Phase'}
                  {module === 'choose' && 'Choose Phase'}
                  {module === 'objectives' && 'Objectives Phase'}
                </span>
                {lastSaved && (
                  <span className="text-green-600">
                    Auto-saved {new Date(lastSaved).toLocaleTimeString()}
                  </span>
                )}
              </div>
              <span>{Math.round(progress)}% Complete</span>
            </div>
          </div>
        </div>

        {/* Body: Sidebar Navigation + Step Content */}
        <div className="flex-1 min-h-0 flex">
          {/* Sidebar Navigation */}
          <aside className="w-64 border-r bg-muted/40 p-4 space-y-4 hidden md:flex md:flex-col overflow-hidden">
            <h3 className="text-sm font-semibold mb-1">Journey Steps</h3>
            <div className="space-y-1 text-sm h-[calc(100vh-260px)] overflow-y-auto pr-1">
              {Array.from({ length: TOTAL_STEPS }, (_, index) => {
                const stepNumber = index + 1;
                const { module: itemModule, localStep: itemLocalStep } = getModuleAndStep(stepNumber);
                const itemContent = journeyContent[itemModule][itemLocalStep - 1];
                const isActive = stepNumber === currentStep;

                return (
                  <button
                    key={stepNumber}
                    type="button"
                    onClick={() => {
                      if (stepNumber !== currentStep && !updateMutation.isPending) {
                        // Save progress for the current step before jumping
                        saveProgress(stepNumber).then(() => setCurrentStep(stepNumber));
                      }
                    }}
                    className={`w-full text-left px-2 py-1 rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <span className="block text-xs uppercase tracking-wide">
                      Step {stepNumber}
                      {itemModule === 'brainstorm' && ' · Brainstorm'}
                      {itemModule === 'choose' && ' · Choose'}
                      {itemModule === 'objectives' && ' · Objectives'}
                    </span>
                    <span className="block truncate">{itemContent.title}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <JourneyStep
              stepNumber={currentStep}
              title={stepContent.title}
              instructions={stepContent.instructions}
              question={stepContent.question}
              placeholder={stepContent.placeholder}
              value={answers[`step_${currentStep}`] || ''}
              onChange={(value: string) => handleAnswerChange(`step_${currentStep}`, value)}
            />
          </div>
        </div>

        {/* Footer Navigation + Actions */}
        <div className="p-6 border-t bg-muted/50">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || updateMutation.isPending}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={updateMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {updateMutation.isPending ? 'Saving...' : 'Save Draft'}
              </Button>

              <Button
                type="button"
                variant="default"
                onClick={() => setIsAddTaskOpen(true)}
                disabled={updateMutation.isPending}
              >
                Add Task
              </Button>
            </div>

            <Button
              onClick={handleNext}
              disabled={updateMutation.isPending}
            >
              {currentStep === TOTAL_STEPS ? (
                <>Complete Journey</>
              ) : (
                <>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* In-wizard Add Task Modal */}
        <AddTaskModal
          open={isAddTaskOpen}
          onClose={() => setIsAddTaskOpen(false)}
          objectiveId={objectiveId}
        />
      </DialogContent>
    </Dialog>
  );
}
