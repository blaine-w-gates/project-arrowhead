import { adminUsers } from '@shared/schema';
import { hashPassword } from '../auth';

/**
 * AdminJS Resource configuration for Admin Users table
 */
export const adminUsersResource = {
  resource: { model: adminUsers, client: null },
  options: {
    navigation: {
      name: 'Admin Management',
      icon: 'Shield',
    },
    properties: {
      id: {
        isVisible: { list: true, filter: true, show: true, edit: false },
      },
      email: {
        isVisible: { list: true, filter: true, show: true, edit: true },
      },
      passwordHash: {
        isVisible: false,
        type: 'password',
      },
      password: {
        type: 'password',
        isVisible: { list: false, filter: false, show: false, edit: true },
      },
      role: {
        isVisible: { list: true, filter: true, show: true, edit: true },
        availableValues: [
          { value: 'super_admin', label: 'Super Admin' },
          { value: 'admin', label: 'Admin' },
          { value: 'support', label: 'Support' },
          { value: 'read_only', label: 'Read Only' },
        ],
      },
      isActive: {
        isVisible: { list: true, filter: true, show: true, edit: true },
      },
      lastLogin: {
        isVisible: { list: true, filter: true, show: true, edit: false },
      },
      createdAt: {
        isVisible: { list: true, filter: true, show: true, edit: false },
      },
      updatedAt: {
        isVisible: { list: false, filter: false, show: true, edit: false },
      },
    },
    actions: {
      list: {
        isAccessible: ({ currentAdmin }: any) =>
          currentAdmin && ['super_admin', 'admin'].includes(currentAdmin.role),
      },
      show: {
        isAccessible: ({ currentAdmin }: any) =>
          currentAdmin && ['super_admin', 'admin'].includes(currentAdmin.role),
      },
      edit: {
        isAccessible: ({ currentAdmin }: any) =>
          currentAdmin && currentAdmin.role === 'super_admin',
        before: async (request: any) => {
          // Hash password if provided
          if (request.payload?.password) {
            request.payload.passwordHash = await hashPassword(request.payload.password);
            delete request.payload.password;
          }
          return request;
        },
      },
      delete: {
        isAccessible: ({ currentAdmin }: any) =>
          currentAdmin && currentAdmin.role === 'super_admin',
        before: async (request: any, context: any) => {
          // Prevent deleting yourself
          if (context.record.params.id === context.currentAdmin.id) {
            throw new Error('You cannot delete your own admin account');
          }
          return request;
        },
      },
      new: {
        isAccessible: ({ currentAdmin }: any) =>
          currentAdmin && currentAdmin.role === 'super_admin',
        before: async (request: any) => {
          // Hash password before creating
          if (request.payload?.password) {
            request.payload.passwordHash = await hashPassword(request.payload.password);
            delete request.payload.password;
          }
          return request;
        },
      },
    },
    listProperties: ['id', 'email', 'role', 'isActive', 'lastLogin', 'createdAt'],
    filterProperties: ['email', 'role', 'isActive', 'createdAt'],
    showProperties: ['id', 'email', 'role', 'isActive', 'lastLogin', 'createdAt', 'updatedAt'],
    editProperties: ['email', 'password', 'role', 'isActive'],
  },
};
