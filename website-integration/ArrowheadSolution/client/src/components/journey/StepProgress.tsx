import React from 'react';
import { cn } from '@/lib/utils';
import { Check, Circle } from 'lucide-react';

// Color theme mapping utility for module-specific styling
const getModuleThemeClasses = (moduleId: string) => {
  switch (moduleId) {
    case 'brainstorm':
      return {
        progress: 'bg-yellow-500',
        current: 'bg-yellow-500 border-yellow-500 text-white',
        completed: 'bg-yellow-500 border-yellow-500 text-white'
      };
    case 'choose':
      return {
        progress: 'bg-blue-500',
        current: 'bg-blue-500 border-blue-500 text-white',
        completed: 'bg-blue-500 border-blue-500 text-white'
      };
    case 'objectives':
      return {
        progress: 'bg-green-500',
        current: 'bg-green-500 border-green-500 text-white',
        completed: 'bg-green-500 border-green-500 text-white'
      };
    default:
      return {
        progress: 'bg-gray-500',
        current: 'bg-gray-500 border-gray-500 text-white',
        completed: 'bg-gray-500 border-gray-500 text-white'
      };
  }
};

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  moduleId: string;
  className?: string;
}

export const StepProgress: React.FC<StepProgressProps> = ({
  currentStep,
  totalSteps,
  moduleId,
  className
}) => {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  const getStepStatus = (stepNumber: number) => {
    if (stepNumber < currentStep) return 'completed';
    if (stepNumber === currentStep) return 'current';
    return 'upcoming';
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm text-gray-500">
          {Math.round((currentStep / totalSteps) * 100)}% Complete
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            getModuleThemeClasses(moduleId).progress
          )}
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
      
      {/* Step Indicators */}
      <div className="flex items-center justify-between">
        {steps.map((stepNumber, index) => {
          const status = getStepStatus(stepNumber);
          const isLast = index === steps.length - 1;
          
          return (
            <div key={stepNumber} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200",
                    status === 'completed' && getModuleThemeClasses(moduleId).completed,
                    status === 'current' && getModuleThemeClasses(moduleId).current,
                    status === 'upcoming' && "bg-gray-200 text-gray-400"
                  )}
                >
                  {status === 'completed' ? (
                    <Check className="w-4 h-4" />
                  ) : status === 'current' ? (
                    <Circle className="w-4 h-4 fill-current" />
                  ) : (
                    stepNumber
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs mt-1 font-medium",
                    (status === 'current' || status === 'completed') && "text-gray-700",
                    status === 'upcoming' && "text-gray-400"
                  )}
                >
                  {stepNumber}
                </span>
              </div>
              
              {!isLast && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 transition-all duration-300",
                    stepNumber < currentStep ? getModuleThemeClasses(moduleId).progress : "bg-gray-200"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
