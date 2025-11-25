export const hasPermission = (user, permission) => {
  if (!user || !user.permissions) return false
  return user.permissions.includes(permission)
}

export const hasAnyPermission = (user, permissions = []) => {
  if (!permissions.length) return true
  if (!user || !user.permissions) return false
  return permissions.some(permission => user.permissions.includes(permission))
}

export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',
  
  // Members
  MEMBERS_VIEW: 'members.view',
  MEMBERS_CREATE: 'members.create',
  MEMBERS_UPDATE: 'members.update',
  MEMBERS_DELETE: 'members.delete',
  MEMBERS_EXPORT: 'members.export',
  
  // Staff
  STAFF_VIEW: 'staff.view',
  STAFF_CREATE: 'staff.create',
  STAFF_UPDATE: 'staff.update',
  STAFF_DELETE: 'staff.delete',
  
  // Transactions
  TRANSACTIONS_VIEW: 'transactions.view',
  TRANSACTIONS_CREATE: 'transactions.create',
  TRANSACTIONS_UPDATE: 'transactions.update',
  TRANSACTIONS_DELETE: 'transactions.delete',
  
  // Expenses
  EXPENSES_VIEW: 'expenses.view',
  EXPENSES_CREATE: 'expenses.create',
  EXPENSES_UPDATE: 'expenses.update',
  EXPENSES_DELETE: 'expenses.delete',
  EXPENSES_APPROVE: 'expenses.approve',
  
  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',
  
  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_UPDATE: 'settings.update',
  
  // Activity Logs
  AUDIT_LOGS_VIEW: 'audit_logs.view',
}

