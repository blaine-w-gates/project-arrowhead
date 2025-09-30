import { adminAuditLog } from '@shared/schema';

/**
 * AdminJS Resource configuration for Admin Audit Log table
 */
export const auditLogResource = {
  resource: { model: adminAuditLog, client: null },
  options: {
    navigation: {
      name: 'Admin Management',
      icon: 'FileText',
    },
    properties: {
      id: {
        isVisible: { list: true, filter: true, show: true, edit: false },
      },
      adminId: {
        isVisible: { list: true, filter: true, show: true, edit: false },
      },
      action: {
        isVisible: { list: true, filter: true, show: true, edit: false },
      },
      resource: {
        isVisible: { list: true, filter: true, show: true, edit: false },
      },
      resourceId: {
        isVisible: { list: true, filter: true, show: true, edit: false },
      },
      changes: {
        type: 'textarea',
        isVisible: { list: false, filter: false, show: true, edit: false },
      },
      ipAddress: {
        isVisible: { list: true, filter: true, show: true, edit: false },
      },
      userAgent: {
        type: 'textarea',
        isVisible: { list: false, filter: false, show: true, edit: false },
      },
      createdAt: {
        isVisible: { list: true, filter: true, show: true, edit: false },
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
        isVisible: false, // Audit logs are immutable
      },
      delete: {
        isVisible: false, // Audit logs should never be deleted
      },
      new: {
        isVisible: false, // Logs are created automatically
      },
    },
    listProperties: ['id', 'adminId', 'action', 'resource', 'resourceId', 'ipAddress', 'createdAt'],
    filterProperties: ['adminId', 'action', 'resource', 'createdAt'],
    showProperties: [
      'id',
      'adminId',
      'action',
      'resource',
      'resourceId',
      'changes',
      'ipAddress',
      'userAgent',
      'createdAt',
    ],
    sort: {
      sortBy: 'createdAt',
      direction: 'desc',
    },
  },
};
