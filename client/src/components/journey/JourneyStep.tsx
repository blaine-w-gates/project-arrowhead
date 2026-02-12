import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StepProgress } from './StepProgress';
import { AddTaskModal } from '@/components/AddTaskModal';
import { ChevronLeft, ChevronRight, Plus, Save, Download } from 'lucide-react';
import { generateModulePDF } from '../../utils/exportUtils';

// Module completion flow mapping (matches original vanilla JS behavior)
const getModuleCompletionUrl = (moduleId: string): string => {
  switch (moduleId) {
    case 'brainstorm':
      return '/journey/choose/step/1';  // Brainstorm → Choose Step 1
    case 'choose':
      return '/journey/objectives/step/1';  // Choose → Objectives Step 1
    case 'objectives':
      return '/tasks';  // Objectives → Task List (final module)
    default:
      return '/journey';  // Fallback to dashboard
  }
};

// Get module display name
const getModuleName = (moduleId: string): string => {
  switch (moduleId) {
    case 'brainstorm':
      return 'Brainstorm';
    case 'choose':
      return 'Decisions';
    case 'objectives':
      return 'Objectives';
    default:
      return 'Module';
  }
};

// Handle module export functionality
const handleExportModule = (moduleId: string) => {
  try {
    generateModulePDF(moduleId);

  } catch (error) {
    console.error(`Error exporting ${getModuleName(moduleId)} module PDF:`, error);
  }
};

// Color theme mapping utility for module-specific styling
const getModuleThemeClasses = (moduleId: string) => {
  switch (moduleId) {
    case 'brainstorm':
      return {
        button: 'bg-yellow-500 hover:bg-yellow-600 text-white',
        outlineButton: 'border-yellow-500 text-yellow-600 hover:bg-yellow-500 hover:text-white',
        progress: 'bg-yellow-500'
      };
    case 'choose':
      return {
        button: 'bg-blue-500 hover:bg-blue-600 text-white',
        outlineButton: 'border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white',
        progress: 'bg-blue-500'
      };
    case 'objectives':
      return {
        button: 'bg-green-500 hover:bg-green-600 text-white',
        outlineButton: 'border-green-500 text-green-600 hover:bg-green-500 hover:text-white',
        progress: 'bg-green-500'
      };
    default:
      return {
        button: 'bg-gray-500 hover:bg-gray-600 text-white',
        outlineButton: 'border-gray-500 text-gray-600 hover:bg-gray-500 hover:text-white',
        progress: 'bg-gray-500'
      };
  }
};

export interface JourneyStepData {
  id: string;
  title: string;
  description: string;
  content: string;
  questions: Array<{
    id: string;
    text: string;
    type: 'text' | 'textarea' | 'select';
    options?: string[];
    required?: boolean;
    placeholder?: string;
    rows?: number;
    helpText?: string;
  }>;
}

// Strongly typed answers and completion payloads to avoid `any`
type StepAnswers = Record<string, string>;

interface StepCompletePayload {
  stepNumber: number;
  stepId: string;
  answers: StepAnswers;
  lastSaved?: string;
  autoSaved?: boolean;
  completedAt?: string;
  manualSave?: boolean;
}

interface JourneyStepProps {
  moduleId: string;
  moduleName: string;
  moduleColor: string;
  currentStep: number;
  totalSteps: number;
  stepData: JourneyStepData;
  sessionId: string;
  onStepComplete: (stepData: StepCompletePayload) => void | Promise<void>;
  onAddTask: (taskData: { title: string; description?: string; assignedTo?: string }) => void;
  className?: string;
}

export const JourneyStep: React.FC<JourneyStepProps> = ({
  moduleId,
  moduleName,
  moduleColor: _moduleColor,
  currentStep,
  totalSteps,
  stepData,
  sessionId,
  onStepComplete,
  onAddTask,
  className
}) => {
  const [answers, setAnswers] = useState<StepAnswers>({});
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);



  // Load saved answers from localStorage and session data
  useEffect(() => {
    const savedAnswers = localStorage.getItem(`journey_${sessionId}_${moduleId}_step_${currentStep}`);
    if (savedAnswers) {
      const parsed = JSON.parse(savedAnswers) as StepAnswers;
      setAnswers(parsed);
    }
  }, [sessionId, moduleId, currentStep]);

  // Auto-save answers to localStorage with debouncing
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      localStorage.setItem(
        `journey_${sessionId}_${moduleId}_step_${currentStep}`,
        JSON.stringify(answers)
      );

      // Auto-save to backend after 2 seconds of inactivity
      const timeoutId = setTimeout(() => {
        handleAutoSave();
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [answers, sessionId, moduleId, currentStep]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleAutoSave = async () => {
    if (Object.keys(answers).length === 0) return;

    try {
      await onStepComplete({
        stepNumber: currentStep,
        stepId: stepData.id,
        answers,
        lastSaved: new Date().toISOString(),
        autoSaved: true
      });
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleSaveStep = async () => {
    setIsSaving(true);
    try {
      await onStepComplete({
        stepNumber: currentStep,
        stepId: stepData.id,
        answers,
        completedAt: new Date().toISOString(),
        manualSave: true
      });
      setLastSaved(new Date());
    } finally {
      setIsSaving(false);
    }
  };

  // Handle modal close and task creation
  const handleCloseAddTaskModal = () => {
    setShowAddTaskModal(false);
  };

  // Wrapper function to convert AddTaskModal interface to JourneyStep interface
  const handleAddTaskFromModal = (taskData: { task: string; person: string; status: string; date: string }) => {
    // Convert AddTaskModal format to JourneyStep format
    onAddTask({
      title: taskData.task,
      description: '', // AddTaskModal doesn't have description field
      assignedTo: taskData.person
    });
  };

  const renderQuestion = (question: JourneyStepData['questions'][number]) => {
    const value = answers[question.id] || '';

    switch (question.type) {
      case 'textarea':
        return (
          <div className="space-y-2">
            <Textarea
              id={question.id}
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              required={question.required}
              placeholder={question.placeholder}
              rows={question.rows || 8}
              className="min-h-[120px]"
            />
            {question.helpText && (
              <div className="form-text text-sm text-gray-600">
                <i className="fas fa-info-circle me-1"></i>{question.helpText}
              </div>
            )}
          </div>
        );

      case 'select':
        return (
          <select
            id={question.id}
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={question.required}
          >
            <option value="">Select an option...</option>
            {question.options?.map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <Input
            id={question.id}
            type="text"
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            required={question.required}
            placeholder={question.placeholder}
          />
        );
    }
  };

  return (
    <div className={cn("max-w-4xl mx-auto p-6 pt-24", className)}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Step {currentStep}: {stepData.title}</h1>
            <h2 className="text-xl text-gray-700 mt-1">{moduleName} Module</h2>
          </div>
          <div className="flex items-center gap-4">
            {lastSaved && (
              <span className="text-sm text-gray-500">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            <Button
              onClick={handleSaveStep}
              disabled={isSaving}
              className={`flex items-center gap-2 ${getModuleThemeClasses(moduleId).button}`}
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Progress'}
            </Button>
          </div>
        </div>

        <StepProgress
          currentStep={currentStep}
          totalSteps={totalSteps}
          moduleId={moduleId}
        />
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Step Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">{stepData.description}</p>
              {stepData.content && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: stepData.content }} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Questions */}
          {stepData.questions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {stepData.questions.map((question) => (
                  <div key={question.id} className="space-y-2">
                    <Label htmlFor={question.id} className="text-sm font-medium">
                      {question.text}
                      {question.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {renderQuestion(question)}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Add New Task */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Add New Task
                <Button
                  size="sm"
                  onClick={() => setShowAddTaskModal(true)}
                  className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t">
        <div>
          {currentStep > 1 ? (
            <Link href={`/journey/${moduleId}/step/${currentStep - 1}`}>
              <Button
                variant="outline"
                className={`flex items-center gap-2 ${getModuleThemeClasses(moduleId).outlineButton}`}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous Step
              </Button>
            </Link>
          ) : (
            <Link href="/journey">
              <Button
                variant="outline"
                className={`flex items-center gap-2 ${getModuleThemeClasses(moduleId).outlineButton}`}
              >
                <ChevronLeft className="w-4 h-4" />
                Home
              </Button>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Step {currentStep} of {totalSteps}
          </span>

          {currentStep < totalSteps ? (
            <Link href={`/journey/${moduleId}/step/${currentStep + 1}`}>
              <Button
                className={`flex items-center gap-2 ${getModuleThemeClasses(moduleId).button}`}
              >
                Next Step
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              {/* Export Module Button - Only on Final Step */}
              <Button
                variant="outline"
                onClick={() => handleExportModule(moduleId)}
                className={`flex items-center gap-2 ${getModuleThemeClasses(moduleId).outlineButton}`}
              >
                <Download className="w-4 h-4" />
                Export {getModuleName(moduleId)}
              </Button>

              {/* Complete Module Button */}
              <Link href={getModuleCompletionUrl(moduleId)}>
                <Button
                  className={`flex items-center gap-2 ${getModuleThemeClasses(moduleId).button}`}
                >
                  Complete Module
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={showAddTaskModal}
        onClose={handleCloseAddTaskModal}
        addTask={handleAddTaskFromModal}
      />
    </div>
  );
};
