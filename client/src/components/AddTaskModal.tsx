import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Task } from '../hooks/useTaskManager';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  addTask: (taskData: Omit<Task, 'id'>) => void;
  className?: string;
}

/**
 * AddTaskModal Component - Reusable Task Creation Modal
 * 
 * Uses addTask function passed as prop to ensure state synchronization
 * with parent component's useTaskManager instance.
 */
export const AddTaskModal: React.FC<AddTaskModalProps> = ({ 
  isOpen, 
  onClose,
  addTask,
  className = '' 
}) => {
  const [error, setError] = useState<string | null>(null);
  
  const clearError = () => {
    setError(null);
  };
  
  // Form state
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPerson, setTaskPerson] = useState('');
  const [taskDate, setTaskDate] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTaskDescription('');
      setTaskPerson('');
      setTaskDate('');
      clearError();
    }
  }, [isOpen, clearError]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!taskDescription.trim() || !taskPerson.trim()) {
      return;
    }

    // Add task using the centralized hook
    addTask({
      task: taskDescription.trim(),
      person: taskPerson.trim(),
      status: 'To Do',
      date: taskDate || new Date().toLocaleDateString()
    });

    // Close modal after successful submission
    // Note: addTask is synchronous and handles its own error state
    onClose();
  };

  // Handle modal close
  const handleClose = () => {
    clearError();
    onClose();
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        {/* Modal Content */}
        <div 
          className={`bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Add New Task</h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6">
            {/* Error Display */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Add Task Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Task Description */}
              <div>
                <label htmlFor="newTaskDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  Task Description *
                </label>
                <textarea
                  id="newTaskDescription"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Enter task description..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  required
                />
              </div>

              {/* Assigned Person */}
              <div>
                <label htmlFor="newTaskPerson" className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned To *
                </label>
                <input
                  type="text"
                  id="newTaskPerson"
                  value={taskPerson}
                  onChange={(e) => setTaskPerson(e.target.value)}
                  placeholder="Enter person's name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Due Date */}
              <div>
                <label htmlFor="newTaskDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  id="newTaskDate"
                  value={taskDate}
                  onChange={(e) => setTaskDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use today's date
                </p>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="saveChangesButton"
                  disabled={!taskDescription.trim() || !taskPerson.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-md transition-colors"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddTaskModal;
