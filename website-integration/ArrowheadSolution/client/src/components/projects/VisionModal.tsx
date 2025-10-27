/**
 * Vision Modal Component
 * 
 * Progressive disclosure for new visions (one question at a time)
 * All-at-once display/edit for existing visions
 * 
 * PRD v5.2 Section 3.1.3: Vision Questions
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VisionData {
  question1?: string;
  question2?: string;
  question3?: string;
  question4?: string;
  question5?: string;
}

interface VisionModalProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  teamId: string;
  isNew: boolean;
  initialData?: VisionData | null;
}

const VISION_QUESTIONS = [
  {
    key: 'question1' as keyof VisionData,
    label: 'What problem are we solving?',
    placeholder: 'Describe the core problem or opportunity this project addresses...',
  },
  {
    key: 'question2' as keyof VisionData,
    label: 'Who is this for?',
    placeholder: 'Identify the target users, customers, or stakeholders...',
  },
  {
    key: 'question3' as keyof VisionData,
    label: 'What does success look like?',
    placeholder: 'Define the desired outcome and how you\'ll measure it...',
  },
  {
    key: 'question4' as keyof VisionData,
    label: 'What are the key constraints?',
    placeholder: 'List major limitations (time, budget, resources, technical, etc.)...',
  },
  {
    key: 'question5' as keyof VisionData,
    label: 'Why is this important now?',
    placeholder: 'Explain the urgency and strategic importance...',
  },
];

export function VisionModal({ open, onClose, projectId, teamId, isNew, initialData }: VisionModalProps) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [visionData, setVisionData] = useState<VisionData>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setVisionData(initialData);
    } else {
      setVisionData({});
    }
    setCurrentStep(0);
  }, [initialData, open]);

  const saveMutation = useMutation({
    mutationFn: async (data: VisionData) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ vision_data: data }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to save vision');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', teamId] });
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleInputChange = (key: keyof VisionData, value: string) => {
    setVisionData(prev => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    const currentQuestion = VISION_QUESTIONS[currentStep];
    if (!visionData[currentQuestion.key]?.trim()) {
      setError('Please answer this question before continuing');
      return;
    }
    setError('');
    if (currentStep < VISION_QUESTIONS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setError('');
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSave = () => {
    setError('');
    
    // Validate all questions are answered
    const unanswered = VISION_QUESTIONS.filter(q => !visionData[q.key]?.trim());
    if (unanswered.length > 0) {
      setError('Please answer all questions before saving');
      return;
    }

    saveMutation.mutate(visionData);
  };

  const handleSkipAll = () => {
    onClose();
  };

  // Progressive disclosure mode (new vision)
  if (isNew) {
    const currentQuestion = VISION_QUESTIONS[currentStep];
    const isLastStep = currentStep === VISION_QUESTIONS.length - 1;

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Project Vision - Question {currentStep + 1} of 5</DialogTitle>
            <DialogDescription>
              Take your time to thoughtfully answer each question
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">{currentQuestion.label}</Label>
              <Textarea
                value={visionData[currentQuestion.key] || ''}
                onChange={(e) => handleInputChange(currentQuestion.key, e.target.value)}
                placeholder={currentQuestion.placeholder}
                rows={6}
                className="mt-2"
                disabled={saveMutation.isPending}
              />
            </div>

            <div className="text-sm text-muted-foreground">
              Progress: {Object.values(visionData).filter(v => v?.trim()).length} / 5 questions answered
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkipAll}
              disabled={saveMutation.isPending}
            >
              Skip for Now
            </Button>
            
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={saveMutation.isPending}
                >
                  Back
                </Button>
              )}
              
              {!isLastStep ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={saveMutation.isPending}
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save Vision'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // All-at-once mode (editing existing vision)
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Project Vision</DialogTitle>
          <DialogDescription>
            Update your project's vision statement
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {VISION_QUESTIONS.map((question) => (
            <div key={question.key}>
              <Label className="text-base font-semibold">{question.label}</Label>
              <Textarea
                value={visionData[question.key] || ''}
                onChange={(e) => handleInputChange(question.key, e.target.value)}
                placeholder={question.placeholder}
                rows={4}
                className="mt-2"
                disabled={saveMutation.isPending}
              />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saveMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
