import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './UI';

export default function ProtectedRoute({ children, adminOnly = false, roles = null }) {
  const { isAuthenticated, isAdmin, isTreasurer, isChairman, isAdminRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard/member" replace />;
  }

  if (roles) {
    const roleMap = { treasurer: isTreasurer, chairman: isChairman, admin: isAdminRole };
    const allowed = roles.some(r => roleMap[r]);
    if (!allowed) return <Navigate to="/dashboard/member" replace />;
  }

  return children;
}
