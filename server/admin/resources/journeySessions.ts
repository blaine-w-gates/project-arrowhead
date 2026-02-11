/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { journeySessions } from '@shared/schema';

/**
 * AdminJS Resource configuration for Journey Sessions table
 */
export const journeySessionsResource = {
  resource: { model: journeySessions, client: null },
  options: {
    navigation: {
      name: 'Analytics',
      icon: 'Activity',
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
      module: {
        isVisible: { list: true, filter: true, show: true, edit: false },
        availableValues: [
          { value: 'brainstorm', label: 'Brainstorm' },
          { value: 'choose', label: 'Choose' },
          { value: 'objectives', label: 'Objectives' },
        ],
      },
      stepData: {
        type: 'textarea',
        isVisible: { list: false, filter: false, show: true, edit: false },
      },
      completedSteps: {
        type: 'textarea',
        isVisible: { list: false, filter: false, show: true, edit: false },
      },
      currentStep: {
        isVisible: { list: true, filter: true, show: true, edit: false },
      },
      isCompleted: {
        isVisible: { list: true, filter: true, show: true, edit: false },
      },
      completedAt: {
        isVisible: { list: true, filter: true, show: true, edit: false },
      },
      createdAt: {
        isVisible: { list: true, filter: true, show: true, edit: false },
      },
      updatedAt: {
        isVisible: { list: true, filter: true, show: true, edit: false },
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
        isVisible: false, // Can't create sessions from admin
      },
      exportData: {
        actionType: 'record',
        component: false,
        handler: async (request: any, response: any, context: any) => {
          const { record } = context;
          // Export session data as JSON
          return {
            record: record.toJSON(),
            notice: {
              message: 'Session data exported successfully',
              type: 'success',
            },
          };
        },
      },
    },
    listProperties: ['id', 'sessionId', 'module', 'currentStep', 'isCompleted', 'createdAt'],
    filterProperties: ['sessionId', 'module', 'isCompleted', 'createdAt'],
    showProperties: [
      'id',
      'userId',
      'sessionId',
      'module',
      'stepData',
      'completedSteps',
      'currentStep',
      'isCompleted',
      'completedAt',
      'createdAt',
      'updatedAt',
    ],
  },
};
