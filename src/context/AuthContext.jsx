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
  const [activeMembership, setActiveMembership] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fl_membership')); } catch { return null; }
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

        // Auto-pick chama if none stored yet
        const storedChama = localStorage.getItem('fl_chama');
        if (!storedChama && data.memberships?.length) {
          const activeMem = data.memberships.find(m => m.status === 'active') || data.memberships[0];
          const chama = activeMem?.chama || activeMem;
          if (chama?.id) {
            localStorage.setItem('fl_chama', JSON.stringify(chama));
            setActiveChama(chama);
            localStorage.setItem('fl_membership', JSON.stringify(activeMem));
            setActiveMembership(activeMem);
          }
        }
      })
      .catch(() => {
        localStorage.removeItem('fl_token');
        localStorage.removeItem('fl_user');
        localStorage.removeItem('fl_chama');
        localStorage.removeItem('fl_membership');
        setUser(null);
        setActiveChama(null);
        setActiveMembership(null);
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

    // Auto-pick the first active chama + membership from login response
    const activeMem = data.memberships?.length
      ? (data.memberships.find(m => m.status === 'active') || data.memberships[0])
      : null;
    const chamaSource = data.chama || activeMem?.chama || null;
    if (chamaSource?.id) {
      localStorage.setItem('fl_chama', JSON.stringify(chamaSource));
      setActiveChama(chamaSource);
    }
    if (activeMem) {
      localStorage.setItem('fl_membership', JSON.stringify(activeMem));
      setActiveMembership(activeMem);
    }
    return u;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch (_) { /* ignore */ }
    localStorage.removeItem('fl_token');
    localStorage.removeItem('fl_user');
    localStorage.removeItem('fl_chama');
    localStorage.removeItem('fl_membership');
    setUser(null);
    setActiveChama(null);
    setActiveMembership(null);
  }, []);

  const switchChama = useCallback(async (chama, membership) => {
    localStorage.setItem('fl_chama', JSON.stringify(chama));
    setActiveChama(chama);
    if (membership) {
      localStorage.setItem('fl_membership', JSON.stringify(membership));
      setActiveMembership(membership);
    }
  }, []);

  // Role comes from the active membership, not the user object
  // (BR-MEM-003: roles are per-chama, stored on Membership, not User)
  const role = activeMembership?.role || user?.role;
  const isTreasurer = role === 'treasurer';
  const isChairman  = role === 'chairman';
  const isAdminRole = role === 'admin';

  const value = {
    user,
    activeChama,
    activeMembership,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: isAdminRole || isTreasurer || isChairman,
    isTreasurer,
    isChairman,
    isAdminRole,
    canManageRosca: isTreasurer || isAdminRole,
    canManageMembers: isChairman || isAdminRole,
    canReverseTransactions: isTreasurer || isAdminRole,
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
