import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'
import Statements from './pages/Statements'
import StatementTransactions from './pages/StatementTransactions'
import StatementViewer from './pages/StatementViewer'
import Transactions from './pages/Transactions'
import ArchivedTransactions from './pages/ArchivedTransactions'
import DraftTransactions from './pages/DraftTransactions'
import Expenses from './pages/Expenses'
import ManualContributions from './pages/ManualContributions'
import MemberProfile from './pages/MemberProfile'
import Settings from './pages/Settings'
import Reports from './pages/Reports'
import Audit from './pages/Audit'
import DuplicateTransactions from './pages/DuplicateTransactions'
import Layout from './components/Layout'
import AttendanceUploads from './pages/AttendanceUploads'
import Wallets from './pages/Wallets'
import Investments from './pages/Investments'
import Announcements from './pages/Announcements'
import Meetings from './pages/Meetings'
import Budgets from './pages/Budgets'
import Notifications from './pages/Notifications'
import Compliance from './pages/Compliance'
import BulkSms from './pages/BulkSms'
import Unauthorized from './pages/Unauthorized'
import UiKit from './pages/UiKit'
import StaffManagement from './pages/StaffManagement'
import RoleManagement from './pages/RoleManagement'
import ActivityLogs from './pages/ActivityLogs'
import AdminSettings from './pages/AdminSettings'
import FullScreenLoader from './components/FullScreenLoader'
import { useAuthContext } from './context/AuthContext'
import { hasRole, ROLES } from './lib/rbac'

function ProtectedRoute({ children, roles = [] }) {
  const { isAuthenticated, user } = useAuthContext()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  if (roles.length && !hasRole(user, roles)) {
    return <Navigate to="/unauthorized" replace />
  }
  return children
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuthContext()
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }
  return children
}

function App() {
  const { isLoading } = useAuthContext()
  if (isLoading) {
    return <FullScreenLoader />
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="members">
          <Route index element={<Members />} />
          <Route path=":id" element={<MemberProfile />} />
        </Route>
        <Route path="statements">
          <Route index element={<Statements />} />
          <Route path=":id" element={<StatementViewer />} />
          <Route path=":id/transactions" element={<StatementTransactions />} />
        </Route>
        <Route path="transactions" element={<Transactions />} />
        <Route path="archived-transactions" element={<ArchivedTransactions />} />
        <Route path="draft-transactions" element={<DraftTransactions />} />
        <Route path="duplicate-transactions" element={<DuplicateTransactions />} />
        <Route
          path="expenses"
          element={
            <ProtectedRoute roles={[ROLES.SUPER_ADMIN, ROLES.TREASURER, ROLES.ACCOUNTANT]}>
              <Expenses />
            </ProtectedRoute>
          }
        />
        <Route path="manual-contributions" element={<ManualContributions />} />
        <Route path="wallets" element={<Wallets />} />
        <Route path="investments" element={<Investments />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="meetings" element={<Meetings />} />
        <Route path="budgets" element={<Budgets />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="bulk-sms" element={<BulkSms />} />
        <Route path="compliance" element={<Compliance />} />
        <Route path="attendance-uploads" element={<AttendanceUploads />} />
        <Route path="settings" element={<Settings />} />
        <Route path="reports" element={<Reports />} />
        <Route path="audit" element={<Audit />} />
        <Route
          path="ui-kit"
          element={
            <ProtectedRoute roles={[ROLES.SUPER_ADMIN, ROLES.IT_SUPPORT]}>
              <UiKit />
            </ProtectedRoute>
          }
        />
        <Route path="admin">
          <Route
            path="staff"
            element={
              <ProtectedRoute roles={[ROLES.SUPER_ADMIN]}>
                <StaffManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="roles"
            element={
              <ProtectedRoute roles={[ROLES.SUPER_ADMIN]}>
                <RoleManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="activity-logs"
            element={
              <ProtectedRoute roles={[ROLES.SUPER_ADMIN, ROLES.IT_SUPPORT]}>
                <ActivityLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="settings"
            element={
              <ProtectedRoute roles={[ROLES.SUPER_ADMIN, ROLES.IT_SUPPORT]}>
                <AdminSettings />
              </ProtectedRoute>
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

