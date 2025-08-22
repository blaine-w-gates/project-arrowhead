import React from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';

export interface JourneyModule {
  id: string;
  name: string;
  description: string;
  steps: number;
  icon: React.ReactNode;
  color: string;
}

interface JourneyNavigationProps {
  modules: JourneyModule[];
  className?: string;
}

export const JourneyNavigation: React.FC<JourneyNavigationProps> = ({ 
  modules, 
  className 
}) => {
  const [location] = useLocation();

  const isModuleActive = (moduleId: string) => {
    return location.includes(`/journey/${moduleId}`);
  };

  return (
    <nav className={cn("space-y-2", className)}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Journey Modules
      </h3>
      
      {modules.map((module) => (
        <Link
          key={module.id}
          href={`/journey/${module.id}/step/1`}
          className={cn(
            "flex items-center p-4 rounded-lg border transition-all duration-200",
            "hover:shadow-md hover:border-gray-300",
            isModuleActive(module.id)
              ? `border-${module.color}-500 bg-${module.color}-50 shadow-sm`
              : "border-gray-200 bg-white"
          )}
        >
          <div className={cn(
            "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center mr-4",
            isModuleActive(module.id)
              ? `bg-${module.color}-500 text-white`
              : `bg-${module.color}-100 text-${module.color}-600`
          )}>
            {module.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className={cn(
              "text-sm font-medium truncate",
              isModuleActive(module.id)
                ? `text-${module.color}-900`
                : "text-gray-900"
            )}>
              {module.name}
            </h4>
            <p className={cn(
              "text-xs truncate",
              isModuleActive(module.id)
                ? `text-${module.color}-700`
                : "text-gray-500"
            )}>
              {module.description}
            </p>
            <div className={cn(
              "text-xs mt-1",
              isModuleActive(module.id)
                ? `text-${module.color}-600`
                : "text-gray-400"
            )}>
              {module.steps} steps
            </div>
          </div>
          
          <div className={cn(
            "flex-shrink-0 w-2 h-2 rounded-full ml-2",
            isModuleActive(module.id)
              ? `bg-${module.color}-500`
              : "bg-gray-300"
          )} />
        </Link>
      ))}
    </nav>
  );
};
