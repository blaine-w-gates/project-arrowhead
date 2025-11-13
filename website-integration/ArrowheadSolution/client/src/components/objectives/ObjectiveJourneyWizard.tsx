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
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Loader2, Lock, ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { JourneyStep } from './journey/JourneyStep';
import journeyContent from '@/data/journeyContent.json';

interface ObjectiveData {
  id: string;
  projectId: string;
  name: string;
  targetDate: string | null;
  currentStep: number;
  journeyStatus: 'draft' | 'in_progress' | 'complete';
  brainstormData: Record<string, string> | null;
  chooseData: Record<string, string> | null;
  objectivesData: Record<string, string> | null;
  startWithBrainstorm: boolean;
  editLock: {
    lockedBy: string | null;
    lockedByName: string | null;
    lockedAt: string | null;
  } | null;
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

      return response.json();
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

    // Set current step from objective
    setCurrentStep(objective.currentStep || 1);

    // Load all answers from the three data fields
    const allAnswers: Record<string, string> = {};
    
    if (objective.brainstormData) {
      Object.entries(objective.brainstormData).forEach(([key, value]) => {
        allAnswers[key] = value;
      });
    }
    
    if (objective.chooseData) {
      Object.entries(objective.chooseData).forEach(([key, value]) => {
        allAnswers[key] = value;
      });
    }
    
    if (objective.objectivesData) {
      Object.entries(objective.objectivesData).forEach(([key, value]) => {
        allAnswers[key] = value;
      });
    }

    setAnswers(allAnswers);
  }, [objective]);

  // Update objective mutation
  const updateMutation = useMutation({
    mutationFn: async (data: {
      currentStep?: number;
      journeyStatus?: string;
      brainstormData?: Record<string, string>;
      chooseData?: Record<string, string>;
      objectivesData?: Record<string, string>;
    }) => {
      const response = await fetch(`/api/objectives/${objectiveId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        credentials: 'include',
        body: JSON.stringify(data),
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
    
    // Separate answers by module
    const brainstormAnswers: Record<string, string> = {};
    const chooseAnswers: Record<string, string> = {};
    const objectivesAnswers: Record<string, string> = {};

    Object.entries(answers).forEach(([key, value]: [string, string]) => {
      const stepNum = parseInt(key.split('_')[1]);
      if (stepNum <= 5) {
        brainstormAnswers[key] = value;
      } else if (stepNum <= 10) {
        chooseAnswers[key] = value;
      } else {
        objectivesAnswers[key] = value;
      }
    });

    await updateMutation.mutateAsync({
      currentStep: stepToSave,
      brainstormData: Object.keys(brainstormAnswers).length > 0 ? brainstormAnswers : undefined,
      chooseData: Object.keys(chooseAnswers).length > 0 ? chooseAnswers : undefined,
      objectivesData: Object.keys(objectivesAnswers).length > 0 ? objectivesAnswers : undefined,
      journeyStatus: stepToSave === TOTAL_STEPS ? 'complete' : 'in_progress',
    });
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
              <h2 className="text-2xl font-bold">{objective.name}</h2>
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

        {/* Footer Navigation */}
        <div className="p-6 border-t bg-muted/50">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || updateMutation.isPending}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={updateMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {updateMutation.isPending ? 'Saving...' : 'Save Draft'}
            </Button>

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
      </DialogContent>
    </Dialog>
  );
}
