import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TopNavBar from '../components/TopNavBar';
import Footer from '../components/Footer';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard/admin';

  const [form, setForm] = useState({ identifier: '', password: '', remember: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.identifier || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const user = await login({ identifier: form.identifier, password: form.password });
      const dest = user?.role === 'member' ? '/dashboard/member' : '/dashboard/admin';
      navigate(from !== '/login' ? from : dest, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TopNavBar variant="landing" />
      <main className="flex-grow flex items-center justify-center px-margin-mobile relative overflow-hidden py-3xl">
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
          <span className="material-symbols-outlined text-primary text-[600px] security-shield-animate select-none opacity-5">shield</span>
        </div>

        <div className="w-full max-w-[440px] bg-surface-container-lowest border border-outline-variant rounded-lg login-card-shadow p-lg md:p-xl relative z-10">
          <div className="text-center mb-xl">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-container mb-md">
              <span className="material-symbols-outlined text-on-primary text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
            </div>
            <h1 className="font-headline-md text-headline-md text-primary mb-xs">Sign In</h1>
            <p className="font-body-sm text-body-sm text-secondary">Access your secure institutional dashboard</p>
          </div>

          {error && (
            <div className="mb-md flex items-center gap-2 p-3 bg-error-container text-on-error-container rounded-lg text-sm">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          <form className="space-y-md" onSubmit={handleSubmit}>
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-xs" htmlFor="identifier">
                Email or Phone Number
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline text-[20px]">mail</span>
                <input
                  className="w-full pl-[48px] pr-md py-md bg-surface-container-lowest border border-outline rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-body-md outline-none"
                  id="identifier"
                  name="identifier"
                  placeholder="email@domain.com or 07XXXXXXXX"
                  type="text"
                  value={form.identifier}
                  onChange={handleChange}
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-xs">
                <label className="block font-label-md text-label-md text-on-surface-variant" htmlFor="password">Password</label>
                <Link className="font-label-sm text-label-sm text-primary hover:underline transition-all" to="/forgot-password">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline text-[20px]">key</span>
                <input
                  className="w-full pl-[48px] pr-12 py-md bg-surface-container-lowest border border-outline rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-body-md outline-none"
                  id="password"
                  name="password"
                  placeholder="••••••••••••"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-primary"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-sm py-xs">
              <input
                className="w-5 h-5 border-outline rounded-sm text-primary cursor-pointer"
                id="remember"
                name="remember"
                type="checkbox"
                checked={form.remember}
                onChange={handleChange}
              />
              <label className="font-body-sm text-body-sm text-on-surface cursor-pointer select-none" htmlFor="remember">
                Remember this device for 30 days
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary py-md px-lg rounded-lg font-label-md text-label-md flex items-center justify-center gap-sm hover:opacity-90 active:opacity-80 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-xl pt-lg border-t border-outline-variant text-center">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              New to FundLoop?{' '}
              <Link className="text-primary font-label-md hover:underline ml-xs" to="/setup">
                Create an Account
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
