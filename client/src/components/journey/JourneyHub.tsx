import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { JourneyNavigation, type JourneyModule } from './JourneyNavigation';
import { journeyApi, type JourneySession } from '@/services/journeyApi';
import { useSessionId } from '@/hooks/useJourney';
import { 
  Lightbulb, 
  Target, 
  CheckSquare, 
  Play, 
  Clock, 
  CheckCircle,
  ArrowRight 
} from 'lucide-react';

interface JourneyHubProps {
  className?: string;
}

// Define the journey modules
const JOURNEY_MODULES: JourneyModule[] = [
  {
    id: 'brainstorm',
    name: 'Brainstorm',
    description: 'Generate and capture creative ideas',
    steps: 5,
    icon: <Lightbulb className="w-5 h-5" />,
    color: 'blue'
  },
  {
    id: 'choose',
    name: 'Choose',
    description: 'Evaluate and select the best options',
    steps: 5,
    icon: <CheckSquare className="w-5 h-5" />,
    color: 'green'
  },
  {
    id: 'objectives',
    name: 'Objectives',
    description: 'Set clear goals and success metrics',
    steps: 7,
    icon: <Target className="w-5 h-5" />,
    color: 'purple'
  }
];

export const JourneyHub: React.FC<JourneyHubProps> = ({ className }) => {
  const sessionId = useSessionId();
  const [sessions, setSessions] = useState<JourneySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      loadJourneySessions();
    }
  }, [sessionId]);

  const loadJourneySessions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await journeyApi.getAllJourneySessionsForUser(sessionId);
      setSessions(data);
    } catch (error) {
      console.error('Failed to load journey sessions:', error);
      setError('Failed to load journey progress');
    } finally {
      setIsLoading(false);
    }
  };

  const getSessionForModule = (moduleId: string) => {
    return sessions.find(session => session.module === moduleId);
  };

  const getModuleTotalSteps = (moduleId: string) => {
    const moduleSteps = { brainstorm: 5, choose: 5, objectives: 7 };
    return moduleSteps[moduleId as keyof typeof moduleSteps] || 5;
  };

  const getModuleStatus = (module: JourneyModule) => {
    const session = getSessionForModule(module.id);
    if (!session) return 'not-started';
    if (session.isCompleted) return 'completed';
    if (session.currentStep > 1) return 'in-progress';
    return 'started';
  };

  const getProgressPercentage = (module: JourneyModule) => {
    const session = getSessionForModule(module.id);
    if (!session) return 0;
    const totalSteps = getModuleTotalSteps(module.id);
    const completedSteps = session.currentStep - 1; // Steps completed are current step - 1
    return Math.round((completedSteps / totalSteps) * 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'in-progress':
        return <Badge variant="default" className="bg-blue-500">In Progress</Badge>;
      case 'started':
        return <Badge variant="outline">Started</Badge>;
      default:
        return <Badge variant="secondary">Not Started</Badge>;
    }
  };

  const getNextStepHref = (module: JourneyModule) => {
    const session = getSessionForModule(module.id);
    const step = session ? Math.max(1, session.currentStep) : 1;
    return `/journey/${module.id}/step/${step}`;
  };

  const getModuleStats = () => {
    const started = sessions.filter(s => s.currentStep > 0).length;
    const inProgress = sessions.filter(s => s.currentStep > 0 && !s.isCompleted).length;
    const completed = sessions.filter(s => s.isCompleted).length;
    return { started, inProgress, completed };
  };

  if (!sessionId || isLoading) {
    return (
      <div className={cn("max-w-6xl mx-auto p-6", className)}>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("max-w-6xl mx-auto p-6", className)}>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Journey Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadJourneySessions}>Try Again</Button>
        </div>
      </div>
    );
  }

  const stats = getModuleStats();

  return (
    <div className={cn("max-w-6xl mx-auto p-6", className)}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Your Journey Dashboard
        </h1>
        <p className="text-gray-600">
          Navigate through structured modules to develop your ideas, make decisions, and set objectives.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Modules Started</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.started}
                </p>
              </div>
              <Play className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.inProgress}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.completed}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Journey Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Module Cards */}
        <div className="lg:col-span-3">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Journey Modules
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {JOURNEY_MODULES.map((module) => {
              const status = getModuleStatus(module);
              const progress = getProgressPercentage(module);
              const session = getSessionForModule(module.id);
              
              return (
                <Card key={module.id} className="relative overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        `bg-${module.color}-100 text-${module.color}-600`
                      )}>
                        {module.icon}
                      </div>
                      {getStatusBadge(status)}
                    </div>
                    <CardTitle className="text-lg">{module.name}</CardTitle>
                    <p className="text-sm text-gray-600">{module.description}</p>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={cn(
                            "h-2 rounded-full transition-all duration-300",
                            `bg-${module.color}-500`
                          )}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Session Info */}
                    {session && (
                      <div className="text-sm text-gray-600 mb-4">
                        Step {session.currentStep} of {getModuleTotalSteps(module.id)}
                        <div className="text-xs text-gray-500 mt-1">
                          Last updated: {new Date(session.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                    
                    {/* Action Button */}
                    <Link href={getNextStepHref(module)}>
                      <Button 
                        className={cn(
                          "w-full flex items-center justify-center gap-2",
                          `bg-${module.color}-500 hover:bg-${module.color}-600`
                        )}
                      >
                        {status === 'not-started' ? 'Start Module' : 
                         status === 'completed' ? 'Review' : 'Continue'}
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <JourneyNavigation modules={JOURNEY_MODULES} />
          
          {/* Quick Actions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/tasks">
                <Button variant="outline" className="w-full justify-start">
                  View All Tasks
                </Button>
              </Link>
              <Link href="/journey/export">
                <Button variant="outline" className="w-full justify-start">
                  Export Progress
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => {
                  if (confirm('This will clear all journey progress. Are you sure?')) {
                    // TODO: Implement session reset
                    window.location.reload();
                  }
                }}
              >
                Reset Progress
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
