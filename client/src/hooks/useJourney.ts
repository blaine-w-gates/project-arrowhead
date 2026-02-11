import { useState, useEffect, useCallback } from 'react';
import { journeyApi, type JourneySession, type Task, type CreateTaskRequest } from '@/services/journeyApi';

export interface UseJourneyResult {
  // Session State
  session: JourneySession | null;
  isLoading: boolean;
  error: string | null;
  
  // Session Actions
  createSession: (moduleId: string, stepData: Record<string, unknown>) => Promise<void>;
  updateSession: (stepData: Record<string, unknown>, currentStep?: number) => Promise<void>;
  completeSession: () => Promise<void>;
  
  // Task State
  tasks: Task[];
  isTasksLoading: boolean;
  tasksError: string | null;
  
  // Task Actions
  createTask: (taskData: Omit<CreateTaskRequest, 'sessionId'>) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<CreateTaskRequest>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  loadTasks: () => Promise<void>;
}

export const useJourney = (sessionId: string, moduleId: string, currentStep: number): UseJourneyResult => {
  // Session State
  const [session, setSession] = useState<JourneySession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Task State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);

  // Load session data
  const loadSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const sessionData = await journeyApi.getJourneySession(sessionId);
      setSession(sessionData);
    } catch (err) {
      // Don't set error for 404 - session just doesn't exist yet
      if (err instanceof Error && !err.message.includes('404') && !err.message.includes('not found')) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Load tasks for the session
  const loadTasks = useCallback(async () => {
    try {
      setIsTasksLoading(true);
      setTasksError(null);
      
      const tasksData = await journeyApi.getTasksBySession(sessionId);
      setTasks(tasksData);
    } catch (err) {
      setTasksError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setIsTasksLoading(false);
    }
  }, [sessionId]);

  // Create new session
  const createSession = useCallback(async (moduleId: string, stepData: Record<string, unknown>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const newSession = await journeyApi.createJourneySession({
        sessionId,
        module: moduleId,
        stepData: JSON.stringify(stepData), // Convert to JSON string as expected by backend
        completedSteps: JSON.stringify([]), // Initialize as empty JSON array string
        currentStep: 1
      });
      
      setSession(newSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Update session
  const updateSession = useCallback(async (stepData: Record<string, unknown>, newCurrentStep?: number) => {
    if (!session) return;
    
    try {
      setError(null);
      
      // Parse existing stepData from JSON string, merge with new data, convert back to JSON string
      const existingStepData = typeof session.stepData === 'string' 
        ? JSON.parse(session.stepData) 
        : session.stepData;
      const mergedStepData = { ...existingStepData, ...stepData };
      
      const updatedSession = await journeyApi.updateJourneySession(sessionId, {
        stepData: JSON.stringify(mergedStepData), // Convert to JSON string as expected by backend
        currentStep: newCurrentStep || session.currentStep
      });
      
      setSession(updatedSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update session');
    }
  }, [sessionId, session]);

  // Complete session
  const completeSession = useCallback(async () => {
    if (!session) return;
    
    try {
      setError(null);
      
      const completedSession = await journeyApi.updateJourneySession(sessionId, {
        isCompleted: true,
        completedAt: new Date().toISOString()
      });
      
      setSession(completedSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete session');
    }
  }, [sessionId, session]);

  // Create task
  const createTask = useCallback(async (taskData: Omit<CreateTaskRequest, 'sessionId'>) => {
    try {
      setTasksError(null);
      
      const newTask = await journeyApi.createTask({
        ...taskData,
        sessionId,
        sourceModule: moduleId,
        sourceStep: currentStep
      });
      
      setTasks(prev => [newTask, ...prev]);
    } catch (err) {
      setTasksError(err instanceof Error ? err.message : 'Failed to create task');
    }
  }, [sessionId, moduleId, currentStep]);

  // Update task
  const updateTask = useCallback(async (taskId: string, updates: Partial<CreateTaskRequest>) => {
    try {
      setTasksError(null);
      
      const updatedTask = await journeyApi.updateTask(taskId, updates);
      
      setTasks(prev => prev.map(task => 
        task.id.toString() === taskId ? updatedTask : task
      ));
    } catch (err) {
      setTasksError(err instanceof Error ? err.message : 'Failed to update task');
    }
  }, []);

  // Delete task
  const deleteTask = useCallback(async (taskId: string) => {
    try {
      setTasksError(null);
      
      await journeyApi.deleteTask(taskId);
      
      setTasks(prev => prev.filter(task => task.id.toString() !== taskId));
    } catch (err) {
      setTasksError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  }, []);

  // Initialize session: try to load existing, create if needed
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // First try to load existing session
        await loadSession();
      } catch (err) {
        // If session doesn't exist (404), create it
        if (err instanceof Error && (err.message.includes('404') || err.message.includes('not found'))) {
          // Create session with initial step data
          const stepKey = `step_${currentStep}`;
          const savedAnswers = localStorage.getItem(`journey_${sessionId}_${moduleId}_step_${currentStep}`);
          const initialStepData = savedAnswers ? JSON.parse(savedAnswers) : {};
          
          await createSession(moduleId, { [stepKey]: initialStepData });
        }
      }
    };
    
    if (sessionId && moduleId && currentStep) {
      initializeSession();
    }
  }, [sessionId, moduleId, currentStep, loadSession, createSession]);
  
  // Load tasks when session exists
  useEffect(() => {
    if (session) {
      loadTasks();
    }
  }, [session, loadTasks]);

  return {
    // Session State
    session,
    isLoading,
    error,
    
    // Session Actions
    createSession,
    updateSession,
    completeSession,
    
    // Task State
    tasks,
    isTasksLoading,
    tasksError,
    
    // Task Actions
    createTask,
    updateTask,
    deleteTask,
    loadTasks
  };
};

// Hook for managing session ID
export const useSessionId = () => {
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    // Generate or retrieve session ID for guest users
    let id = localStorage.getItem('journey_session_id');
    if (!id) {
      id = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('journey_session_id', id);
    }
    setSessionId(id);
  }, []);

  return sessionId;
};
