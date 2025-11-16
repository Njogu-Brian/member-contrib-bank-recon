import { Routes, Route, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getUser } from './api/auth'
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

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  
  if (!token) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="members" element={<Members />} />
        <Route path="members/:id" element={<MemberProfile />} />
        <Route path="statements" element={<Statements />} />
        <Route path="statements/:id" element={<StatementViewer />} />
        <Route path="statements/:id/transactions" element={<StatementTransactions />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="archived-transactions" element={<ArchivedTransactions />} />
        <Route path="draft-transactions" element={<DraftTransactions />} />
        <Route path="duplicate-transactions" element={<DuplicateTransactions />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="manual-contributions" element={<ManualContributions />} />
        <Route path="attendance-uploads" element={<AttendanceUploads />} />
        <Route path="settings" element={<Settings />} />
        <Route path="reports" element={<Reports />} />
        <Route path="audit" element={<Audit />} />
      </Route>
    </Routes>
  )
}

export default App

