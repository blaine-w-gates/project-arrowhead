import { useState, useEffect, useCallback } from 'react';

// Task interface matching existing structure
export interface Task {
  id: string;
  task: string;
  person: string;
  status: 'To Do' | 'In Progress' | 'Done';
  date: string;
}

// Hook return type
interface UseTaskManagerReturn {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  addTask: (taskData: Omit<Task, 'id'>) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  updateTaskStatus: (taskId: string) => void;
  reorderTasks: (newTaskOrder: Task[]) => void;
  clearError: () => void;
}

/**
 * useTaskManager Hook - Single Source of Truth for Task Management
 * 
 * Provides centralized task state management with localStorage persistence.
 * All task operations should flow through this hook to ensure data consistency.
 */
export const useTaskManager = (): UseTaskManagerReturn => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load tasks from localStorage on mount
  useEffect(() => {
    const loadTasks = () => {
      try {
        setIsLoading(true);
        const sessionData = localStorage.getItem('objectiveBuilderSession');
        
        if (sessionData) {
          const data = JSON.parse(sessionData);
          // Support both taskList and tasks properties for backward compatibility
          const loadedTasks = data.taskList || data.tasks || [];
          setTasks(loadedTasks);
        }
      } catch (err) {
        console.error('Failed to load tasks from localStorage:', err);
        setError('Failed to load tasks. Starting with empty list.');
      } finally {
        setIsLoading(false);
      }
    };

    loadTasks();

    // Listen for localStorage changes from other tabs (cross-tab synchronization)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'objectiveBuilderSession' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          const updatedTasks = data.taskList || data.tasks || [];
          setTasks(updatedTasks);
        } catch (err) {
          console.error('Failed to sync tasks from other tab:', err);
        }
      }
    };

    // Add event listener for cross-tab synchronization
    window.addEventListener('storage', handleStorageChange);

    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Save tasks to localStorage whenever tasks change
  const saveTasksToStorage = useCallback((updatedTasks: Task[]) => {
    try {
      const sessionData = localStorage.getItem('objectiveBuilderSession');
      const data = sessionData ? JSON.parse(sessionData) : {};
      
      // Update both taskList and tasks for compatibility
      data.taskList = updatedTasks;
      data.tasks = updatedTasks;
      data.lastModified = new Date().toISOString();
      
      localStorage.setItem('objectiveBuilderSession', JSON.stringify(data));
    } catch (err) {
      console.error('Failed to save tasks to localStorage:', err);
      setError('Failed to save tasks. Changes may be lost.');
    }
  }, []);

  // Add a new task
  const addTask = useCallback((taskData: Omit<Task, 'id'>) => {
    try {
      const newTask: Task = {
        id: Date.now().toString(),
        ...taskData,
        date: taskData.date || new Date().toLocaleDateString()
      };

      // Use functional state update to avoid stale closure issues
      setTasks(prevTasks => {
        const updatedTasks = [...prevTasks, newTask];
        saveTasksToStorage(updatedTasks);
        return updatedTasks;
      });
      setError(null);
    } catch (err) {
      console.error('Failed to add task:', err);
      setError('Failed to add task. Please try again.');
    }
  }, [saveTasksToStorage]);

  // Update an existing task
  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    try {
      // Use functional state update to avoid stale closure issues
      setTasks(prevTasks => {
        const updatedTasks = prevTasks.map(task =>
          task.id === taskId ? { ...task, ...updates } : task
        );
        saveTasksToStorage(updatedTasks);
        return updatedTasks;
      });
      setError(null);
    } catch (err) {
      console.error('Failed to update task:', err);
      setError('Failed to update task. Please try again.');
    }
  }, [saveTasksToStorage]);

  // Delete a task
  const deleteTask = useCallback((taskId: string) => {
    try {
      // Use functional state update to avoid stale closure issues
      setTasks(prevTasks => {
        const updatedTasks = prevTasks.filter(task => task.id !== taskId);
        saveTasksToStorage(updatedTasks);
        return updatedTasks;
      });
      setError(null);
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError('Failed to delete task. Please try again.');
    }
  }, [saveTasksToStorage]);

  // Cycle task status (To Do -> In Progress -> Done -> To Do)
  const updateTaskStatus = useCallback((taskId: string) => {
    try {
      const statusCycle: ('To Do' | 'In Progress' | 'Done')[] = ['To Do', 'In Progress', 'Done'];
      
      // Use functional state update to avoid stale closure issues
      setTasks(prevTasks => {
        const updatedTasks = prevTasks.map(task => {
          if (task.id === taskId) {
            const currentIndex = statusCycle.indexOf(task.status);
            const nextIndex = (currentIndex + 1) % statusCycle.length;
            return { ...task, status: statusCycle[nextIndex] };
          }
          return task;
        });
        saveTasksToStorage(updatedTasks);
        return updatedTasks;
      });
      setError(null);
    } catch (err) {
      console.error('Failed to update task status:', err);
      setError('Failed to update task status. Please try again.');
    }
  }, [saveTasksToStorage]);

  // Reorder tasks (for drag and drop)
  const reorderTasks = useCallback((newTaskOrder: Task[]) => {
    try {
      setTasks(newTaskOrder);
      saveTasksToStorage(newTaskOrder);
      setError(null);
    } catch (err) {
      console.error('Failed to reorder tasks:', err);
      setError('Failed to reorder tasks. Please try again.');
    }
  }, [saveTasksToStorage]);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    tasks,
    isLoading,
    error,
    addTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    reorderTasks,
    clearError
  };
};
