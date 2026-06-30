import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NotFoundPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const homeRoute = isAuthenticated ? (isAdmin ? '/dashboard/admin' : '/dashboard/member') : '/';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-margin-mobile text-center bg-background">
      <span className="material-symbols-outlined text-primary text-[80px] mb-4">search_off</span>
      <h1 className="font-display-lg text-display-lg text-primary mb-2">404</h1>
      <p className="font-title-lg text-title-lg text-on-surface-variant mb-8">This page doesn't exist.</p>
      <Link to={homeRoute} className="px-8 py-3 bg-primary text-on-primary rounded-lg font-label-md hover:opacity-90 transition-all">
        Back to {isAuthenticated ? 'Dashboard' : 'Home'}
      </Link>
    </div>
  );
}
