import { useState } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { logout } from '../api/auth'
import MemberSearchModal from './MemberSearchModal'

export default function Layout() {
  const [showMemberStatementModal, setShowMemberStatementModal] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const navItems = [
    { key: 'dashboard', path: '/', label: 'Dashboard', icon: '📊' },
    { key: 'members', path: '/members', label: 'Members', icon: '👥' },
    {
      key: 'member-statement',
      action: 'memberStatement',
      label: 'Member Statement',
      icon: '📘',
      isActive: (pathname) => pathname.startsWith('/members/') && pathname !== '/members',
    },
    { key: 'statements', path: '/statements', label: 'Statements', icon: '📄' },
    { key: 'attendance-uploads', path: '/attendance-uploads', label: 'Attendance Uploads', icon: '🗂️' },
    { key: 'transactions', path: '/transactions', label: 'Transactions', icon: '💰' },
    { key: 'archived-transactions', path: '/archived-transactions', label: 'Archived Transactions', icon: '📦' },
    { key: 'draft-transactions', path: '/draft-transactions', label: 'Draft Transactions', icon: '📝' },
    { key: 'duplicate-transactions', path: '/duplicate-transactions', label: 'Duplicate Transactions', icon: '♻️' },
    { key: 'expenses', path: '/expenses', label: 'Expenses', icon: '💸' },
    { key: 'wallets', path: '/wallets', label: 'Wallets', icon: '👛' },
    { key: 'investments', path: '/investments', label: 'Investments', icon: '💹' },
    { key: 'announcements', path: '/announcements', label: 'Announcements', icon: '📣' },
    { key: 'meetings', path: '/meetings', label: 'Meetings', icon: '🗳️' },
    { key: 'budgets', path: '/budgets', label: 'Budgets', icon: '📅' },
    { key: 'notifications', path: '/notifications', label: 'Notifications', icon: '🔔' },
    { key: 'compliance', path: '/compliance', label: 'Compliance', icon: '🔐' },
    { key: 'manual-contributions', path: '/manual-contributions', label: 'Manual Contributions', icon: '💵' },
    { key: 'reports', path: '/reports', label: 'Reports', icon: '📈' },
    { key: 'audit', path: '/audit', label: 'Audit', icon: '✅' },
    { key: 'settings', path: '/settings', label: 'Settings', icon: '⚙️' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-gray-900">Member Contributions</h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.map((item) => {
            const active = item.isActive
              ? item.isActive(location.pathname)
              : item.path
                ? isActive(item.path)
                : false

            const baseClasses = `flex items-center px-6 py-3 text-sm font-medium transition-colors ${
              active
                ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-700'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`

            if (item.action === 'memberStatement') {
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setShowMemberStatementModal(true)}
                  className={`${baseClasses} w-full text-left`}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.label}
                </button>
              )
            }

            return (
              <Link key={item.key} to={item.path} className={baseClasses}>
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>
        
        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
          >
            <span className="mr-3">🚪</span>
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <MemberSearchModal
        isOpen={showMemberStatementModal}
        onClose={() => setShowMemberStatementModal(false)}
        onSelect={(member) => {
          setShowMemberStatementModal(false)
          if (member?.id) {
            navigate(`/members/${member.id}`)
          }
        }}
        title="Go to Member Statement"
      />
    </div>
  )
}
