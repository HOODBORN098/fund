import React, { useEffect, useRef } from 'react';

/* ── Loading Spinner ───────────────────────────────── */
export function Spinner({ className = '' }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <Spinner />
        <p className="font-body-md text-body-md text-on-surface-variant">Loading…</p>
      </div>
    </div>
  );
}

/* ── Error Banner ──────────────────────────────────── */
export function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-error-container text-on-error-container rounded-xl border border-error/30">
      <span className="material-symbols-outlined text-error">error</span>
      <p className="flex-1 font-body-md text-body-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-1.5 bg-error text-on-error rounded font-label-md text-label-md hover:opacity-90"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/* ── Empty State ───────────────────────────────────── */
export function EmptyState({ icon = 'inbox', title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center">
        <span className="material-symbols-outlined text-outline text-3xl">{icon}</span>
      </div>
      <div>
        <p className="font-title-lg text-title-lg text-on-surface">{title}</p>
        {description && <p className="font-body-md text-body-md text-on-surface-variant mt-1">{description}</p>}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 px-6 py-2 bg-primary text-on-primary rounded font-label-md text-label-md hover:opacity-90"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/* ── Modal ─────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, size = 'md' }) {
  const sizeClass = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];
  const ref = useRef();

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={ref} className={`w-full ${sizeClass} bg-surface rounded-2xl shadow-2xl border border-outline-variant`}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-outline-variant">
          <h3 className="font-title-lg text-title-lg text-primary">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/* ── Toast ─────────────────────────────────────────── */
let _setToast = null;
export function ToastProvider({ children }) {
  const [toast, setToast] = React.useState(null);
  _setToast = setToast;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const icons = { success: 'check_circle', error: 'error', info: 'info', warning: 'warning' };
  const colors = {
    success: 'bg-primary text-on-primary',
    error:   'bg-error text-on-error',
    info:    'bg-secondary-container text-on-secondary-container',
    warning: 'bg-tertiary-container text-on-tertiary-container',
  };

  return (
    <>
      {children}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl ${colors[toast.type || 'info']}`}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            {icons[toast.type || 'info']}
          </span>
          <p className="font-label-md text-label-md">{toast.message}</p>
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}
    </>
  );
}

export function toast(message, type = 'info') {
  if (_setToast) _setToast({ message, type });
}

/* ── Status Badge ──────────────────────────────────── */
export function StatusBadge({ status }) {
  const map = {
    active:    'bg-green-100 text-green-800',
    approved:  'bg-green-100 text-green-800',
    success:   'bg-green-100 text-green-800',
    paid:      'bg-green-100 text-green-800',
    overdue:   'bg-error-container text-error',
    rejected:  'bg-error-container text-error',
    failed:    'bg-error-container text-error',
    pending:   'bg-yellow-100 text-yellow-800',
    review:    'bg-yellow-100 text-yellow-800',
    disbursed: 'bg-primary-fixed text-primary',
    onboarding:'bg-blue-100 text-blue-800',
    inactive:  'bg-surface-container-high text-on-surface-variant',
    closed:    'bg-surface-container-high text-on-surface-variant',
  };
  const cls = map[status?.toLowerCase()] || 'bg-surface-container text-on-surface';
  return (
    <span className={`px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wide ${cls}`}>
      {status}
    </span>
  );
}

/* ── Form Field ────────────────────────────────────── */
export function Field({ label, error, children, required }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
          {label}{required && <span className="text-error ml-1">*</span>}
        </label>
      )}
      {children}
      {error && <p className="font-body-sm text-body-sm text-error">{error}</p>}
    </div>
  );
}

export const inputCls = 'w-full p-3 bg-surface-container-low border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary font-body-md text-body-md outline-none transition-all';
