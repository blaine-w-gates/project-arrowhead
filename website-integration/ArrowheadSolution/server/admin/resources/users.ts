import { users } from '@shared/schema';

/**
 * AdminJS Resource configuration for Users table
 */
export const usersResource = {
  resource: { model: users, client: null }, // Will be connected via Drizzle adapter
  options: {
    navigation: {
      name: 'User Management',
      icon: 'Users',
    },
    properties: {
      id: {
        isVisible: { list: true, filter: true, show: true, edit: false },
      },
      email: {
        isVisible: { list: true, filter: true, show: true, edit: true },
      },
      password: {
        isVisible: { list: false, filter: false, show: false, edit: false },
        type: 'password',
      },
      tier: {
        isVisible: { list: true, filter: true, show: true, edit: true },
        availableValues: [
          { value: 'free', label: 'Free' },
          { value: 'pro', label: 'Pro' },
          { value: 'team', label: 'Team' },
        ],
      },
      createdAt: {
        isVisible: { list: true, filter: true, show: true, edit: false },
      },
    },
    actions: {
      list: {
        before: async (request: any) => {
          // Log view action
          return request;
        },
      },
      show: {},
      edit: {
        before: async (request: any) => {
          // Prevent editing password through this interface
          if (request.payload?.password) {
            delete request.payload.password;
          }
          return request;
        },
      },
      delete: {
        isAccessible: ({ currentAdmin }: any) =>
          currentAdmin && ['super_admin', 'admin'].includes(currentAdmin.role),
      },
      new: {
        isAccessible: ({ currentAdmin }: any) =>
          currentAdmin && ['super_admin', 'admin'].includes(currentAdmin.role),
      },
    },
    listProperties: ['id', 'email', 'tier', 'createdAt'],
    filterProperties: ['email', 'tier', 'createdAt'],
    showProperties: ['id', 'email', 'tier', 'createdAt'],
    editProperties: ['email', 'tier'],
  },
};
