import { ROLES } from '../lib/rbac'
import {
  HiOutlineHome,
  HiOutlineUsers,
  HiOutlineDocumentText,
  HiOutlineCreditCard,
  HiOutlineClipboardDocumentList,
  HiOutlineCurrencyDollar,
  HiOutlineChartBar,
  HiOutlineBellAlert,
  HiOutlineMegaphone,
  HiOutlineCalendarDays,
  HiOutlineBanknotes,
  HiOutlineReceiptPercent,
  HiOutlineShieldExclamation,
  HiOutlineCog6Tooth,
  HiOutlineCloudArrowUp,
  HiOutlineSparkles,
  HiOutlineChatBubbleLeftRight,
  HiOutlineClock,
} from 'react-icons/hi2'

export const NAVIGATION = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', icon: HiOutlineHome, path: '/', roles: [] },
      { label: 'Members', icon: HiOutlineUsers, path: '/members', roles: [] },
      { label: 'Statements', icon: HiOutlineDocumentText, path: '/statements', roles: [] },
      { label: 'Wallets', icon: HiOutlineCreditCard, path: '/wallets', roles: [] },
    ],
  },
  {
    title: 'Finance',
    items: [
      {
        label: 'Transactions',
        icon: HiOutlineClipboardDocumentList,
        path: '/transactions',
        roles: [],
        submenu: [
          { label: 'All Transactions', path: '/transactions' },
          { label: 'Duplicates', path: '/duplicate-transactions' },
          { label: 'Archived', path: '/archived-transactions' },
        ],
      },
      {
        label: 'Expenses',
        icon: HiOutlineCurrencyDollar,
        path: '/expenses',
        roles: [ROLES.SUPER_ADMIN, ROLES.TREASURER, ROLES.GROUP_TREASURER, ROLES.ACCOUNTANT],
      },
      {
        label: 'Manual Contributions',
        icon: HiOutlineBanknotes,
        path: '/manual-contributions',
        roles: [ROLES.SUPER_ADMIN, ROLES.TREASURER, ROLES.GROUP_TREASURER],
      },
      {
        label: 'Invoices',
        icon: HiOutlineReceiptPercent,
        path: '/invoices',
        roles: [ROLES.SUPER_ADMIN, ROLES.TREASURER, ROLES.GROUP_TREASURER, ROLES.ACCOUNTANT],
        submenu: [
          { label: 'All Invoices', path: '/invoices' },
          { label: 'Invoice Types', path: '/invoice-types' },
        ],
      },
      {
        label: 'Budgets',
        icon: HiOutlineChartBar,
        path: '/budgets',
        roles: [ROLES.SUPER_ADMIN, ROLES.CHAIRMAN, ROLES.TREASURER, ROLES.ACCOUNTANT],
      },
      {
        label: 'Investments',
        icon: HiOutlineCurrencyDollar,
        path: '/investments',
        roles: [ROLES.SUPER_ADMIN, ROLES.TREASURER, ROLES.ACCOUNTANT],
      },
      { label: 'Reports', icon: HiOutlineChartBar, path: '/reports', roles: [] },
      {
        label: 'Scheduled Reports',
        icon: HiOutlineClock,
        path: '/scheduled-reports',
        roles: [ROLES.SUPER_ADMIN, ROLES.TREASURER, ROLES.ACCOUNTANT],
      },
      {
        label: 'Accounting',
        icon: HiOutlineChartBar,
        path: '/accounting',
        roles: [ROLES.SUPER_ADMIN, ROLES.TREASURER, ROLES.ACCOUNTANT],
      },
      {
        label: 'MPESA Reconciliation',
        icon: HiOutlineCurrencyDollar,
        path: '/mpesa-reconciliation',
        roles: [ROLES.SUPER_ADMIN, ROLES.TREASURER],
      },
    ],
  },
  {
    title: 'Engagement',
    items: [
      {
        label: 'Announcements',
        icon: HiOutlineMegaphone,
        path: '/announcements',
        roles: [ROLES.SUPER_ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY],
      },
      {
        label: 'Meetings & Voting',
        icon: HiOutlineCalendarDays,
        path: '/meetings',
        roles: [ROLES.SUPER_ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY],
      },
      {
        label: 'Notifications',
        icon: HiOutlineBellAlert,
        path: '/notifications',
        roles: [],
      },
      {
        label: 'Bulk SMS',
        icon: HiOutlineChatBubbleLeftRight,
        path: '/bulk-sms',
        roles: [ROLES.SUPER_ADMIN, ROLES.SECRETARY, ROLES.CHAIRMAN],
      },
      {
        label: 'Compliance',
        icon: HiOutlineShieldExclamation,
        path: '/compliance',
        roles: [ROLES.SUPER_ADMIN, ROLES.IT_SUPPORT],
      },
      {
        label: 'KYC Management',
        icon: HiOutlineShieldExclamation,
        path: '/kyc-management',
        roles: [ROLES.SUPER_ADMIN, ROLES.TREASURER],
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        label: 'Attendance Uploads',
        icon: HiOutlineCloudArrowUp,
        path: '/attendance-uploads',
        roles: [ROLES.SUPER_ADMIN, ROLES.SECRETARY],
      },
      {
        label: 'Audit Trails',
        icon: HiOutlineShieldExclamation,
        path: '/audit',
        roles: [ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT, ROLES.GUEST],
      },
      {
        label: 'UI Kit',
        icon: HiOutlineSparkles,
        path: '/ui-kit',
        roles: [ROLES.SUPER_ADMIN, ROLES.IT_SUPPORT],
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        label: 'Staff Management',
        icon: HiOutlineUsers,
        path: '/admin/staff',
        roles: [ROLES.SUPER_ADMIN],
      },
      {
        label: 'Role Management',
        icon: HiOutlineShieldExclamation,
        path: '/admin/roles',
        roles: [ROLES.SUPER_ADMIN],
      },
      {
        label: 'Activity Logs',
        icon: HiOutlineDocumentText,
        path: '/admin/activity-logs',
        roles: [ROLES.SUPER_ADMIN, ROLES.IT_SUPPORT],
      },
      {
        label: 'Settings',
        icon: HiOutlineCog6Tooth,
        path: '/settings',
        roles: [ROLES.SUPER_ADMIN],
      },
    ],
  },
]

