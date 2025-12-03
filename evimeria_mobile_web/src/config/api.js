export const API_CONFIG = {
  baseURL: 'http://localhost:8000/api/v1',
  timeout: 30000,
};

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/mobile/login',
  REGISTER: '/mobile/register',
  LOGOUT: '/mobile/logout',
  VERIFY_MFA: '/mobile/verify-mfa',
  
  // Dashboard
  DASHBOARD: '/mobile/dashboard',
  
  // Contributions
  CONTRIBUTIONS: '/mobile/contributions',
  MAKE_PAYMENT: '/mobile/payments/initiate',
  
  // Wallet
  WALLET: '/mobile/wallet',
  WALLET_HISTORY: '/mobile/wallet/history',
  
  // Statements
  STATEMENTS: '/mobile/statements',
  
  // Investments
  INVESTMENTS: '/mobile/investments',
  INVESTMENT_ROI: (id) => `/mobile/investments/${id}/roi`,
  
  // Announcements
  ANNOUNCEMENTS: '/mobile/announcements',
  
  // Meetings
  MEETINGS: '/mobile/meetings',
  
  // Reports
  REPORTS: '/mobile/reports',
  EXPORT_STATEMENT: '/mobile/reports/statement',
};

