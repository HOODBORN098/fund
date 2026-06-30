import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, chamaApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fl_user')); } catch { return null; }
  });
  const [activeChama, setActiveChama] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fl_chama')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Listen for 401s from any API call
  useEffect(() => {
    const handler = () => { setUser(null); setActiveChama(null); };
    window.addEventListener('fl_unauthorized', handler);
    return () => window.removeEventListener('fl_unauthorized', handler);
  }, []);

  // Validate token on mount
  useEffect(() => {
    const token = localStorage.getItem('fl_token');
    if (!token) { setLoading(false); return; }

    authApi.me()
      .then((data) => {
        const u = data.user || data;
        setUser(u);
        localStorage.setItem('fl_user', JSON.stringify(u));
      })
      .catch(() => {
        localStorage.removeItem('fl_token');
        localStorage.removeItem('fl_user');
        localStorage.removeItem('fl_chama');
        setUser(null);
        setActiveChama(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (credentials) => {
    setError(null);
    const data = await authApi.login(credentials);
    const token = data.token || data.accessToken;
    const u     = data.user  || data;

    localStorage.setItem('fl_token', token);
    localStorage.setItem('fl_user', JSON.stringify(u));
    setUser(u);

    // If backend returns default chama, store it
    if (data.chama) {
      localStorage.setItem('fl_chama', JSON.stringify(data.chama));
      setActiveChama(data.chama);
    }
    return u;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch (_) { /* ignore */ }
    localStorage.removeItem('fl_token');
    localStorage.removeItem('fl_user');
    localStorage.removeItem('fl_chama');
    setUser(null);
    setActiveChama(null);
  }, []);

  const switchChama = useCallback(async (chama) => {
    localStorage.setItem('fl_chama', JSON.stringify(chama));
    setActiveChama(chama);
  }, []);

  // Granular role flags — BR-MEM-003 (Role Permissions) treats treasurer,
  // chairman, and admin as having DISTINCT authorities, not interchangeable
  // ones. Use the specific flag that matches the rule you're enforcing;
  // only fall back to the broad `isAdmin` for things genuinely open to
  // any of the three (e.g. "show the elevated nav section").
  const role = user?.role;
  const isTreasurer = role === 'treasurer';
  const isChairman  = role === 'chairman';
  const isAdminRole = role === 'admin';

  const value = {
    user,
    activeChama,
    loading,
    error,
    isAuthenticated: !!user,
    // Broad "is this an officer of some kind" flag — keep using this only
    // for UI that's genuinely role-agnostic (e.g. which dashboard to land on).
    isAdmin: isAdminRole || isTreasurer || isChairman,
    isTreasurer,
    isChairman,
    isAdminRole,
    // BR-GOV-001: only Treasurer initiates ROSCA cycles/payouts.
    // Admin gets an override since they own chama configuration generally.
    canManageRosca: isTreasurer || isAdminRole,
    // WF-MEM-002: suspension is a Chairman/Admin action, not Treasurer's.
    canManageMembers: isChairman || isAdminRole,
    // BR-FIN-002 / WF-FIN-002: reversal is Treasurer/Admin only.
    canReverseTransactions: isTreasurer || isAdminRole,
    // BR-GOV-002: Chairman can veto a welfare claim outright.
    canVetoClaim: isChairman || isAdminRole,
    login,
    logout,
    switchChama,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
