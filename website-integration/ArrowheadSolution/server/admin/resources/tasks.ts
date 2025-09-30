/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { tasks } from '@shared/schema';

/**
 * AdminJS Resource configuration for Tasks table
 */
export const tasksResource = {
  resource: { model: tasks, client: null },
  options: {
    navigation: {
      name: 'Analytics',
      icon: 'CheckSquare',
    },
    properties: {
      id: {
        isVisible: { list: true, filter: true, show: true, edit: false },
      },
      userId: {
        isVisible: { list: true, filter: true, show: true, edit: false },
      },
      sessionId: {
        isVisible: { list: true, filter: true, show: true, edit: false },
      },
      title: {
        isVisible: { list: true, filter: true, show: true, edit: false },
      },
      description: {
        type: 'textarea',
        isVisible: { list: false, filter: false, show: true, edit: false },
      },
      status: {
        isVisible: { list: true, filter: true, show: true, edit: false },
        availableValues: [
          { value: 'todo', label: 'To Do' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'done', label: 'Done' },
        ],
      },
      priority: {
        isVisible: { list: true, filter: true, show: true, edit: false },
        availableValues: [
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
        ],
      },
      dueDate: {
        isVisible: { list: true, filter: true, show: true, edit: false },
      },
      assignedTo: {
        isVisible: { list: true, filter: true, show: true, edit: false },
      },
      sourceModule: {
        isVisible: { list: true, filter: true, show: true, edit: false },
      },
      sourceStep: {
        isVisible: { list: false, filter: true, show: true, edit: false },
      },
      tags: {
        type: 'textarea',
        isVisible: { list: false, filter: false, show: true, edit: false },
      },
      createdAt: {
        isVisible: { list: true, filter: true, show: true, edit: false },
      },
      updatedAt: {
        isVisible: { list: false, filter: true, show: true, edit: false },
      },
    },
    actions: {
      list: {},
      show: {},
      edit: {
        isVisible: false, // Read-only resource
      },
      delete: {
        isAccessible: ({ currentAdmin }: any) =>
          currentAdmin && currentAdmin.role === 'super_admin',
      },
      new: {
        isVisible: false,
      },
    },
    listProperties: ['id', 'title', 'status', 'priority', 'assignedTo', 'createdAt'],
    filterProperties: ['sessionId', 'status', 'priority', 'sourceModule', 'createdAt'],
    showProperties: [
      'id',
      'userId',
      'sessionId',
      'title',
      'description',
      'status',
      'priority',
      'dueDate',
      'assignedTo',
      'sourceModule',
      'sourceStep',
      'tags',
      'createdAt',
      'updatedAt',
    ],
  },
};
