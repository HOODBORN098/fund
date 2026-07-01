import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import WelcomePage from './pages/WelcomePage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import SetupPage from './pages/SetupPage';
import MultiChamaPortal from './pages/MultiChamaPortal';
import AdminDashboard from './pages/AdminDashboard';
import MemberDashboard from './pages/MemberDashboard';
import ROSCAPage from './pages/ROSCAPage';
import WelfarePage from './pages/WelfarePage';
import GovernancePage from './pages/GovernancePage';
import SettingsPage from './pages/SettingsPage';
import MembersPage from './pages/MembersPage';
import TransactionsPage from './pages/TransactionsPage';
import NotFoundPage from './pages/NotFoundPage';

function DashboardRedirect() {
  const { isAdmin } = useAuth();
  return <Navigate to={isAdmin ? '/dashboard/admin' : '/dashboard/member'} replace />;
}

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<WelcomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/setup" element={<SetupPage />} />

      {/* Authenticated — any role */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />
      <Route path="/dashboard/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
      <Route path="/dashboard/member" element={<ProtectedRoute><MemberDashboard /></ProtectedRoute>} />
      <Route path="/portal" element={<ProtectedRoute><MultiChamaPortal /></ProtectedRoute>} />
      <Route path="/rosca" element={<ProtectedRoute><ROSCAPage /></ProtectedRoute>} />
      <Route path="/welfare" element={<ProtectedRoute><WelfarePage /></ProtectedRoute>} />
      <Route path="/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
      <Route path="/governance" element={<ProtectedRoute><GovernancePage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

      {/* Admin only */}
      <Route path="/members" element={<ProtectedRoute roles={['chairman', 'admin']}><MembersPage /></ProtectedRoute>} />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
