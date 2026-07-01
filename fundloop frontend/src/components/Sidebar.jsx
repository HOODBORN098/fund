import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Modal, toast } from './UI';

function NewTransactionModal({ open, onClose, chamaId }) {
  const [form, setForm] = useState({ type: 'topup', amount: '', destination: '' });
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    onClose();
    if (form.type === 'topup') navigate('/dashboard/member');
    else navigate('/transactions');
  };

  return (
    <Modal open={open} onClose={onClose} title="New Transaction">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Transaction Type</label>
          <select className="w-full p-3 border border-outline-variant rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary"
            value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
            <option value="topup">Wallet Top-Up</option>
            <option value="withdrawal">Withdrawal</option>
            <option value="transfer">Fund Transfer</option>
          </select>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant">You'll be redirected to complete this transaction.</p>
        <button type="submit" className="w-full py-2.5 bg-primary text-on-primary rounded-lg font-label-md">Continue</button>
      </form>
    </Modal>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const path = location.pathname;
  const { logout, activeChama, isAdmin, canManageMembers } = useAuth();
  const navigate = useNavigate();
  const [txModalOpen, setTxModalOpen] = useState(false);
  const chamaId = activeChama?.id || activeChama?._id;

  const getLinkClass = (route) => {
    const isActive = path === route || (route !== '/dashboard/admin' && path.startsWith(route));
    return isActive
      ? "flex items-center gap-3 px-stack-lg py-3 text-secondary-fixed bg-primary-container rounded-lg mx-2 transition-all duration-100 active:scale-95"
      : "flex items-center gap-3 px-stack-lg py-3 text-on-primary opacity-70 hover:opacity-100 hover:bg-primary-container/50 transition-colors duration-200 rounded-lg mx-2";
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const dashboardRoute = isAdmin ? '/dashboard/admin' : '/dashboard/member';

  return (
    <>
      <aside className="fixed left-0 top-0 h-full w-[260px] z-50 bg-primary border-r border-outline-variant flex flex-col py-stack-lg transition-all duration-300">
        <div className="px-stack-lg mb-stack-xl">
          <Link to={dashboardRoute} className="flex items-center gap-stack-sm mb-stack-xs">
            <div className="w-10 h-10 bg-secondary-container rounded flex items-center justify-center text-on-secondary-container">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>group_work</span>
            </div>
            <div>
              <h1 className="font-headline-md text-headline-md font-bold text-on-primary leading-none">FundLoop</h1>
              <p className="font-body-sm text-body-sm text-on-primary opacity-60">{activeChama?.name || 'Multi-tenant Finance'}</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 space-y-1">
          <Link className={getLinkClass(dashboardRoute)} to={dashboardRoute}>
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-title-md text-title-md">Dashboard</span>
          </Link>
          <Link className={getLinkClass('/rosca')} to="/rosca">
            <span className="material-symbols-outlined">account_balance_wallet</span>
            <span className="font-title-md text-title-md">ROSCA</span>
          </Link>
          <Link className={getLinkClass('/welfare')} to="/welfare">
            <span className="material-symbols-outlined">health_and_safety</span>
            <span className="font-title-md text-title-md">Welfare</span>
          </Link>
          <Link className={getLinkClass('/transactions')} to="/transactions">
            <span className="material-symbols-outlined">receipt_long</span>
            <span className="font-title-md text-title-md">Transactions</span>
          </Link>
          {canManageMembers && (
            <Link className={getLinkClass('/members')} to="/members">
              <span className="material-symbols-outlined">groups</span>
              <span className="font-title-md text-title-md">Members</span>
            </Link>
          )}
          <Link className={getLinkClass('/governance')} to="/governance">
            <span className="material-symbols-outlined">gavel</span>
            <span className="font-title-md text-title-md">Governance</span>
          </Link>
          <Link className={getLinkClass('/settings')} to="/settings">
            <span className="material-symbols-outlined">settings</span>
            <span className="font-title-md text-title-md">Settings</span>
          </Link>
        </nav>
        <div className="px-2 mb-stack-lg">
          <button onClick={() => setTxModalOpen(true)} className="w-full bg-secondary-container text-on-secondary-container font-title-md py-3 rounded flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all">
            <span className="material-symbols-outlined">add</span>
            New Transaction
          </button>
        </div>
        <div className="border-t border-outline-variant/20 pt-stack-lg">
          <a className="flex items-center gap-3 px-stack-lg py-3 text-on-primary opacity-70 hover:opacity-100 transition-colors duration-200 cursor-pointer"
            href="mailto:support@fundloop.app">
            <span className="material-symbols-outlined">help</span>
            <span className="font-title-md text-title-md">Support</span>
          </a>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-stack-lg py-3 text-on-primary opacity-70 hover:opacity-100 transition-colors duration-200 text-left">
            <span className="material-symbols-outlined">logout</span>
            <span className="font-title-md text-title-md">Logout</span>
          </button>
        </div>
      </aside>

      <NewTransactionModal open={txModalOpen} onClose={() => setTxModalOpen(false)} chamaId={chamaId} />
    </>
  );
}
