import React, { useState } from 'react';
import { Link } from 'wouter';
import { Edit2, Trash2, GripVertical } from 'lucide-react';
import { useTaskManager } from '../hooks/useTaskManager';
import AddTaskModal from '../components/AddTaskModal';
import { convertTasksToMarkdown, convertTasksToCSV, convertTasksToJSON, generateFullProjectData, generateModuleExportData, generateTaskListPDF, generateModulePDF, generateFullProjectPDF, copyToClipboard, downloadFile, type TaskData } from '../utils/exportUtils';

const TaskListPage: React.FC = () => {
  const { tasks, isLoading, error, addTask, updateTask, deleteTask, updateTaskStatus, clearError, reorderTasks } = useTaskManager();
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ task: '', person: '', date: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleShowAddTaskModal = () => {
    setShowAddTaskModal(true);
  };

  const handleCloseAddTaskModal = () => {
    setShowAddTaskModal(false);
  };

  // Export handler functions
  const handleCopyAsMarkdown = async () => {
    try {
      const taskData: TaskData[] = tasks.map(task => ({
        id: task.id,
        task: task.task,
        person: task.person,
        status: task.status,
        date: task.date
      }));
      
      const markdownContent = convertTasksToMarkdown(taskData);
      const success = await copyToClipboard(markdownContent);
      
      if (success) {
        // Show success feedback (you could add a toast notification here)
        console.log('Task list copied as Markdown to clipboard');
      } else {
        console.error('Failed to copy to clipboard');
      }
    } catch (error) {
      console.error('Error copying as Markdown:', error);
    }
  };

  const handleCopyAsCSV = async () => {
    try {
      const taskData: TaskData[] = tasks.map(task => ({
        id: task.id,
        task: task.task,
        person: task.person,
        status: task.status,
        date: task.date
      }));
      
      const csvContent = convertTasksToCSV(taskData);
      const success = await copyToClipboard(csvContent);
      
      if (success) {
        // Show success feedback (you could add a toast notification here)
        console.log('Task list copied as CSV to clipboard');
      } else {
        console.error('Failed to copy to clipboard');
      }
    } catch (error) {
      console.error('Error copying as CSV:', error);
    }
  };

  const handleDownloadJSON = () => {
    try {
      const taskData: TaskData[] = tasks.map(task => ({
        id: task.id,
        task: task.task,
        person: task.person,
        status: task.status,
        date: task.date
      }));
      
      const jsonContent = convertTasksToJSON(taskData);
      const filename = `task-list-${new Date().toISOString().split('T')[0]}.json`;
      downloadFile(jsonContent, filename, 'application/json');
      
      console.log('Task list downloaded as JSON');
    } catch (error) {
      console.error('Error downloading JSON:', error);
    }
  };

  const handleDownloadFullProject = () => {
    try {
      const taskData: TaskData[] = tasks.map(task => ({
        id: task.id,
        task: task.task,
        person: task.person,
        status: task.status,
        date: task.date
      }));
      
      generateFullProjectPDF(taskData);
      console.log('Full project PDF downloaded');
    } catch (error) {
      console.error('Error downloading full project PDF:', error);
    }
  };

  // Individual module export handlers (PDF)
  const handleExportBrainstorm = () => {
    try {
      generateModulePDF('brainstorm');
      console.log('Brainstorm module PDF exported');
    } catch (error) {
      console.error('Error exporting brainstorm module PDF:', error);
    }
  };

  const handleExportDecisions = () => {
    try {
      generateModulePDF('choose');
      console.log('Decisions module PDF exported');
    } catch (error) {
      console.error('Error exporting decisions module PDF:', error);
    }
  };

  const handleExportObjectives = () => {
    try {
      generateModulePDF('objectives');
      console.log('Objectives module PDF exported');
    } catch (error) {
      console.error('Error exporting objectives module PDF:', error);
    }
  };

  // Edit task handlers
  const handleEditTask = (task: any) => {
    setEditingTask(task.id);
    setEditFormData({
      task: task.task,
      person: task.person,
      date: task.date
    });
  };

  const handleSaveEdit = (taskId: string) => {
    updateTask(taskId, editFormData);
    setEditingTask(null);
    setEditFormData({ task: '', person: '', date: '' });
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
    setEditFormData({ task: '', person: '', date: '' });
  };

  // Delete task handlers
  const handleDeleteTask = (taskId: string) => {
    setShowDeleteConfirm(true);
    setTaskToDelete(taskId);
  };

  const confirmDelete = () => {
    if (taskToDelete) {
      deleteTask(taskToDelete);
      setTaskToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  const cancelDelete = () => {
    setTaskToDelete(null);
    setShowDeleteConfirm(false);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', taskId);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!draggedTask) return;

    const draggedIndex = tasks.findIndex(task => task.id === draggedTask);
    if (draggedIndex === -1 || draggedIndex === dropIndex) {
      setDraggedTask(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder tasks
    const newTasks = [...tasks];
    const [draggedTaskData] = newTasks.splice(draggedIndex, 1);
    newTasks.splice(dropIndex, 0, draggedTaskData);

    // Update task manager with new order
    reorderTasks(newTasks);
    
    setDraggedTask(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverIndex(null);
  };

  // Render task rows or empty state
  const renderTaskRows = () => {
    if (tasks.length === 0) {
      return (
        <tr>
          <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
            No tasks yet. Click "Add Task" to get started!
          </td>
        </tr>
      );
    }

    return tasks.map((task, index) => (
      <tr 
        key={task.id} 
        className={`group hover:bg-gray-50 transition-colors ${
          draggedTask === task.id ? 'opacity-50' : ''
        } ${
          dragOverIndex === index ? 'border-t-2 border-blue-500' : ''
        }`}
        draggable
        onDragStart={(e) => handleDragStart(e, task.id)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, index)}
        onDragEnd={handleDragEnd}
      >
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          <div className="flex items-center space-x-2">
            <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
              <GripVertical size={16} />
            </div>
            <span 
              className="cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => updateTaskStatus(task.id)}
            >
              {task.status}
            </span>
          </div>
        </td>
        
        {/* Task field - inline editable */}
        <td className="pl-6 pr-4 py-3 text-gray-900 break-words whitespace-normal">
          {editingTask === task.id ? (
            <input
              type="text"
              value={editFormData.task}
              onChange={(e) => setEditFormData({...editFormData, task: e.target.value})}
              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <span className="cursor-pointer hover:bg-gray-100 py-1 rounded break-words" style={{ overflowWrap: 'anywhere' }} onClick={() => handleEditTask(task)}>
              {task.task}
            </span>
          )}
        </td>
        
        {/* Person field - inline editable */}
        <td className="pl-6 pr-4 py-3 text-gray-700 break-words whitespace-normal">
          {editingTask === task.id ? (
            <input
              type="text"
              value={editFormData.person}
              onChange={(e) => setEditFormData({...editFormData, person: e.target.value})}
              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <span className="cursor-pointer hover:bg-gray-100 py-1 rounded break-words" style={{ overflowWrap: 'anywhere' }} onClick={() => handleEditTask(task)}>
              {task.person}
            </span>
          )}
        </td>
        
        {/* Date field - inline editable */}
        <td className="px-4 py-3 text-gray-600">
          {editingTask === task.id ? (
            <input
              type="date"
              value={editFormData.date}
              onChange={(e) => setEditFormData({...editFormData, date: e.target.value})}
              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <span className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded" onClick={() => handleEditTask(task)}>
              {task.date}
            </span>
          )}
        </td>
        
        {/* Hover Actions */}
        <td className="px-4 py-3">
          {editingTask === task.id ? (
            <div className="flex space-x-2">
              <button
                onClick={() => handleSaveEdit(task.id)}
                className="text-green-600 hover:text-green-800 p-1 rounded transition-colors"
                title="Save changes"
              >
                ✓
              </button>
              <button
                onClick={handleCancelEdit}
                className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                title="Cancel editing"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
              <button
                onClick={() => handleEditTask(task)}
                className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors"
                title="Edit task"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleDeleteTask(task.id)}
                className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                title="Delete task"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </td>
      </tr>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Task List Management</h1>
          <button 
            id="addTaskButton" 
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center"
            onClick={handleShowAddTaskModal}
          >
            <i className="fas fa-plus mr-2"></i>Add Task
          </button>
        </div>

        {/* Your Tasks Card - Full Width */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 w-full mb-6">
          <div className="bg-blue-600 px-6 py-4 rounded-t-lg">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <i className="fas fa-tasks mr-2"></i>
              Your Tasks
            </h2>
          </div>
          <div className="p-6 overflow-x-auto">
            <table className="w-full table-fixed min-w-[640px]">
              <colgroup>
                <col style={{ width: '15%' }} />
                <col style={{ width: '40%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <span>Status</span>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Person</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody id="taskList" className="bg-white divide-y divide-gray-200">
                {renderTaskRows()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Export Hub - Task List Export */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <i className="fas fa-download mr-2"></i>
              Export Task List
            </h2>
            <p className="text-sm text-gray-600 mt-1">Export your task list for use in external project management tools.</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Side - Task List Export Options */}
              <div>
                <h3 className="text-md font-medium text-gray-700 mb-3">Export Task List</h3>
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={handleCopyAsMarkdown}
                    className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                  >
                    <i className="fas fa-copy mr-2"></i>Copy as Markdown
                  </button>
                  <button 
                    onClick={handleDownloadJSON}
                    className="px-4 py-2 bg-green-50 text-green-600 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
                  >
                    <i className="fas fa-download mr-2"></i>Download JSON
                  </button>
                  <button 
                    onClick={handleCopyAsCSV}
                    className="px-4 py-2 bg-purple-50 text-purple-600 border border-purple-200 rounded-md hover:bg-purple-100 transition-colors"
                  >
                    <i className="fas fa-file-csv mr-2"></i>Copy as CSV
                  </button>
                </div>
              </div>
              
              {/* Right Side - Download All Modules */}
              <div>
                <h3 className="text-md font-medium text-gray-700 mb-3">Download All Modules</h3>
                <button 
                  onClick={handleDownloadFullProject}
                  className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600 text-white rounded-md font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <i className="fas fa-file-pdf mr-2"></i>Download Full Project as PDF
                </button>
                <p className="text-xs text-gray-500 mt-2">Includes all module answers and task list data</p>
              </div>
            </div>
          </div>
        </div>

        {/* Export Hub - Individual Modules */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <i className="fas fa-puzzle-piece mr-2"></i>
              Export Individual Modules
            </h2>
            <p className="text-sm text-gray-600 mt-1">Download the content from specific journey modules.</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Brainstorm Module Export */}
              <div className="text-center">
                <button 
                  onClick={handleExportBrainstorm}
                  className="w-full px-4 py-3 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-md hover:bg-yellow-100 transition-colors font-medium"
                >
                  <i className="fas fa-file-pdf text-yellow-500 mr-2"></i>
                  Export Brainstorm as PDF
                </button>
                <p className="text-xs text-gray-500 mt-2">5 steps of brainstorming content</p>
              </div>
              
              {/* Choose Module Export */}
              <div className="text-center">
                <button 
                  onClick={handleExportDecisions}
                  className="w-full px-4 py-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors font-medium"
                >
                  <i className="fas fa-file-pdf text-blue-500 mr-2"></i>
                  Export Decisions as PDF
                </button>
                <p className="text-xs text-gray-500 mt-2">5 steps of decision-making content</p>
              </div>
              
              {/* Objectives Module Export */}
              <div className="text-center">
                <button 
                  onClick={handleExportObjectives}
                  className="w-full px-4 py-3 bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors font-medium"
                >
                  <i className="fas fa-file-pdf text-green-500 mr-2"></i>
                  Export Objectives as PDF
                </button>
                <p className="text-xs text-gray-500 mt-2">7 steps of objectives planning content</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Cards - Full Width Layout */}
        <div className="w-full mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md border border-yellow-200 text-center">
              <div className="p-6">
                <i className="fas fa-lightbulb text-4xl text-yellow-500 mb-4"></i>
                <h6 className="text-lg font-semibold text-gray-800 mb-2">Need Ideas?</h6>
                <p className="text-sm text-gray-600 mb-4">Generate creative solutions and discover new possibilities with our guided brainstorming process.</p>
                <Link href="/journey/brainstorm/step/1" className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md font-medium transition-colors inline-block">
                  Start Brainstorming
                </Link>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md border border-blue-200 text-center">
              <div className="p-6">
                <i className="fas fa-crosshairs text-4xl text-blue-500 mb-4"></i>
                <h6 className="text-lg font-semibold text-gray-800 mb-2">Need to Decide?</h6>
                <p className="text-sm text-gray-600 mb-4">Evaluate your options with a structured framework to make a confident, well-reasoned decision.</p>
                <Link href="/journey/choose/step/1" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium transition-colors inline-block">
                  Make Decisions
                </Link>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md border border-green-200 text-center">
              <div className="p-6">
                <i className="fas fa-target text-4xl text-green-500 mb-4"></i>
                <h6 className="text-lg font-semibold text-gray-800 mb-2">Plan Objectives?</h6>
                <p className="text-sm text-gray-600 mb-4">Turn your decision into a concrete action plan with clear steps, resources, and accountability.</p>
                <Link href="/journey/objectives/step/1" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md font-medium transition-colors inline-block">
                  Plan Objectives
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      <AddTaskModal 
        isOpen={showAddTaskModal} 
        onClose={handleCloseAddTaskModal}
        addTask={addTask}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Task</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskListPage;