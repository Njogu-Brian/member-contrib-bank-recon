import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Transactions from './pages/Transactions';
import Members from './pages/Members';
import Contributions from './pages/Contributions';
import ManualContributions from './pages/ManualContributions';
import Expenses from './pages/Expenses';
import DraftAssignments from './pages/DraftAssignments';
import MemberProfile from './pages/MemberProfile';
import Settings from './pages/Settings';
import Statements from './pages/Statements';
import Layout from './components/Layout';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
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
          <Route path="upload" element={<Upload />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="members" element={<Members />} />
          <Route path="contributions" element={<Contributions />} />
          <Route path="manual-contributions" element={<ManualContributions />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="draft-assignments" element={<DraftAssignments />} />
          <Route path="members/:id" element={<MemberProfile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="statements" element={<Statements />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

