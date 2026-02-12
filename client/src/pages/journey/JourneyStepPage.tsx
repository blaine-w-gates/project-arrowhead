import React from 'react';
import { useParams, useLocation } from 'wouter';
import { JourneyStep, type JourneyStepData, JourneyUpgradeBanner, ModuleCompleteCTA } from '@/components/journey';
import { useToast } from '@/hooks/use-toast';
import { useJourney, useSessionId } from '@/hooks/useJourney';
import { useTaskManager } from '@/hooks/useTaskManager';
import journeyContentData from '@/data/journeyContent.json';

// Local copy of the StepCompletePayload to match JourneyStep's onStepComplete
type StepCompletePayload = {
  stepNumber: number;
  stepId: string;
  answers: Record<string, string>;
  lastSaved?: string;
  autoSaved?: boolean;
  completedAt?: string;
  manualSave?: boolean;
};

// Function to dynamically create step data from JSON content
const createStepData = (moduleId: string, stepNumber: number): JourneyStepData | null => {
  const moduleData = journeyContentData[moduleId as keyof typeof journeyContentData];
  if (!moduleData) return null;

  const stepData = moduleData.find(step => step.step === stepNumber);
  if (!stepData) return null;

  return {
    id: `${moduleId}_step_${stepNumber}`,
    title: stepData.title,
    description: stepData.instructions,
    content: '', // Remove duplicated content to fix duplication bug
    questions: [
      {
        id: `${moduleId}Step${stepNumber}Input`,
        text: stepData.question,
        type: 'textarea',
        required: true,
        placeholder: stepData.placeholder,
        rows: 8,
        helpText: 'Provide detailed thoughts and examples'
      }
    ]
  };
};

const MODULE_CONFIG = {
  brainstorm: { name: 'Brainstorm', color: 'blue', totalSteps: 5 },
  choose: { name: 'Choose', color: 'green', totalSteps: 5 },
  objectives: { name: 'Objectives', color: 'purple', totalSteps: 7 }
};

const JourneyStepPage: React.FC = () => {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const sessionId = useSessionId();

  const moduleId = params.moduleId as string;
  const currentStep = parseInt(params.step as string) || 1;

  // Debug URL parameters


  // Use the journey hook for backend integration
  const {
    // isLoading,
    // error,
    updateSession,
    createTask
  } = useJourney(sessionId, moduleId, currentStep);

  // Use unified task manager for consistent task management
  const { addTask: addUnifiedTask } = useTaskManager();

  const moduleConfig = MODULE_CONFIG[moduleId as keyof typeof MODULE_CONFIG];
  const stepData = createStepData(moduleId, currentStep);

  // Debug logging


  if (!moduleConfig || !stepData) {

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Step Not Found</h1>
          <p className="text-gray-600 mb-6">The requested journey step could not be found.</p>
          <p className="text-sm text-gray-500 mb-4">Debug: moduleId={moduleId}, step={currentStep}</p>
          <button
            onClick={() => setLocation('/journey')}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            Return to Journey Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Session initialization is now handled in useJourney hook

  const handleStepComplete = async (stepData: StepCompletePayload) => {
    try {
      const stepKey = `step_${currentStep}`;
      await updateSession({ [stepKey]: stepData }, currentStep);

      toast({
        title: "Progress Saved",
        description: "Your step progress has been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving step progress:', error);
      toast({
        title: "Save Failed",
        description: "There was an error saving your progress. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddTask = async (taskData: { title: string; description?: string; assignedTo?: string }) => {
    try {
      // Add to backend via journey hook (existing functionality)
      await createTask({
        ...taskData,
        status: 'todo',
        priority: 'medium'
      });

      // Also add to unified task manager for consistency with Task List page
      addUnifiedTask({
        task: taskData.title,
        person: taskData.assignedTo || 'Unassigned',
        status: 'To Do',
        date: new Date().toLocaleDateString()
      });

      toast({
        title: "Task Added",
        description: `Task "${taskData.title}" has been added successfully.`,
      });
    } catch (error) {
      console.error('Error adding task:', error);
      toast({
        title: "Task Creation Failed",
        description: "There was an error creating your task. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Show loading only for initial session ID generation, not for API failures
  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Don't block rendering for API errors - allow component to render with fallback behavior
  // The JourneyStep component can handle missing session data gracefully

  // Check if this is the final step of the module
  const isFinalStep = currentStep === moduleConfig.totalSteps;

  return (
    <>
      <JourneyUpgradeBanner />
      <JourneyStep
        moduleId={moduleId}
        moduleName={moduleConfig.name}
        moduleColor={moduleConfig.color}
        currentStep={currentStep}
        totalSteps={moduleConfig.totalSteps}
        stepData={stepData}
        sessionId={sessionId}
        onStepComplete={handleStepComplete}
        onAddTask={handleAddTask}
      />
      {isFinalStep && (
        <div className="container mx-auto px-4 max-w-4xl">
          <ModuleCompleteCTA moduleName={moduleConfig.name} />
        </div>
      )}
    </>
  );
};

export default JourneyStepPage;
