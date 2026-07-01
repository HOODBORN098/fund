import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import TopNavBar from '../components/TopNavBar';
import Footer from '../components/Footer';
import { authApi } from '../api/client';
import { inputCls } from '../components/UI';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TopNavBar variant="landing" />
      <main className="flex-grow flex items-center justify-center px-margin-mobile py-3xl">
        <div className="w-full max-w-[440px] bg-surface-container-lowest border border-outline-variant rounded-lg p-lg md:p-xl">
          <div className="text-center mb-xl">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-container mb-md">
              <span className="material-symbols-outlined text-on-primary text-[24px]">mail</span>
            </div>
            <h1 className="font-headline-md text-headline-md text-primary mb-xs">Reset Password</h1>
            <p className="font-body-sm text-body-sm text-secondary">We'll send you a link to reset your password</p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="p-4 bg-primary-container text-on-primary-container rounded-lg flex items-center gap-3">
                <span className="material-symbols-outlined">check_circle</span>
                <p className="font-body-md text-body-md text-left">If an account exists for {email}, a reset link has been sent.</p>
              </div>
              <Link to="/login" className="inline-block text-primary font-label-md hover:underline">Back to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-md">
              {error && <div className="p-3 bg-error-container text-on-error-container rounded text-sm">{error}</div>}
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">Email Address</label>
                <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@domain.com" required />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-primary text-on-primary py-md rounded-lg font-label-md flex items-center justify-center gap-sm hover:opacity-90 transition-all disabled:opacity-60">
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
              <div className="text-center pt-2">
                <Link to="/login" className="font-label-sm text-label-sm text-primary hover:underline">Back to Login</Link>
              </div>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
