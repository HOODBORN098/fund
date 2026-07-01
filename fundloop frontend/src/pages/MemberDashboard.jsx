import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNavBar from '../components/TopNavBar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { useApi, useMutation } from '../hooks/useApi';
import { dashboardApi, transactionsApi } from '../api/client';
import { PageLoader, ErrorBanner, StatusBadge, Modal, toast } from '../components/UI';

function TopUpModal({ open, onClose, chamaId, onSuccess }) {
  const [amount, setAmount] = useState('');
  const { mutate, loading, error } = useMutation((d) => transactionsApi.topUp(chamaId, d));
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await mutate({ amount: Number(amount), method: 'mpesa' });
      toast('M-PESA STK push sent to your phone', 'success');
      onSuccess?.();
      onClose();
      setAmount('');
    } catch (_) {}
  };
  return (
    <Modal open={open} onClose={onClose} title="Top Up Wallet via M-PESA">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-error-container text-on-error-container rounded text-sm">{error}</div>}
        <div>
          <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Amount (KES)</label>
          <input className="w-full p-3 border border-outline-variant rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary"
            type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 5000" required />
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant">An STK push will be sent to your registered phone number.</p>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-outline rounded-lg font-label-md">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-primary text-on-primary rounded-lg font-label-md disabled:opacity-60">
            {loading ? 'Sending…' : 'Send STK Push'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function WithdrawModal({ open, onClose, chamaId, onSuccess }) {
  const [form, setForm] = useState({ amount: '', destination: '' });
  const { mutate, loading, error } = useMutation((d) => transactionsApi.withdraw(chamaId, d));
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await mutate(form);
      toast('Withdrawal request submitted', 'success');
      onSuccess?.();
      onClose();
    } catch (_) {}
  };
  return (
    <Modal open={open} onClose={onClose} title="Withdraw Funds">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-error-container text-on-error-container rounded text-sm">{error}</div>}
        <div>
          <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Amount (KES)</label>
          <input className="w-full p-3 border border-outline-variant rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary"
            type="number" min="1" value={form.amount} onChange={e => setForm(p=>({...p,amount:e.target.value}))} placeholder="0.00" required />
        </div>
        <div>
          <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Destination Phone / Account</label>
          <input className="w-full p-3 border border-outline-variant rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary"
            value={form.destination} onChange={e => setForm(p=>({...p,destination:e.target.value}))} placeholder="07XXXXXXXX" required />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-outline rounded-lg font-label-md">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-primary text-on-primary rounded-lg font-label-md disabled:opacity-60">
            {loading ? 'Processing…' : 'Submit Request'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function MemberDashboard() {
  const { activeChama, user } = useAuth();
  const chamaId = activeChama?.id || activeChama?._id;
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [txFilter, setTxFilter] = useState('all');
  const [page, setPage] = useState(1);

  const { data, loading, error, refetch } = useApi(
    () => dashboardApi.memberOverview(chamaId),
    [chamaId]
  );

  const handleExport = async () => {
    try {
      const res = await transactionsApi.export(chamaId, { format: 'pdf' });
      if (res.url) window.open(res.url, '_blank');
      else toast('Statement will be emailed to you.', 'info');
    } catch (e) { toast(e.message, 'error'); }
  };

  if (loading) return <><Sidebar /><main className="ml-[260px] min-h-screen flex flex-col"><TopNavBar /><PageLoader /></main></>;
  if (error)   return <><Sidebar /><main className="ml-[260px] min-h-screen flex flex-col"><TopNavBar /><div className="p-8"><ErrorBanner message={error} onRetry={refetch} /></div></main></>;

  const wallet   = data?.wallet   || {};
  const rosca    = data?.rosca    || {};
  const welfareClaim = data?.welfareClaim || {};
  const payout   = data?.nextPayout || {};
  const txs      = (data?.transactions || []).filter(t =>
    txFilter === 'all' || t.category?.toLowerCase() === txFilter
  );
  const totalTx  = data?.totalTransactions || txs.length;

  return (
    <>
      <Sidebar />
      <main className="ml-[260px] min-h-screen flex flex-col">
        <TopNavBar userName={user?.name} role={user?.role} />
        <div className="p-stack-lg max-w-container-max w-full mx-auto space-y-stack-lg">

          <div className="flex justify-between items-end">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-primary">Member Dashboard</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Welcome back{user?.name ? `, ${user.name}` : ''}. Your financial status is up to date.
              </p>
            </div>
            <div className="flex gap-stack-sm">
              <button onClick={handleExport} className="px-6 py-2 border border-primary text-primary font-title-md rounded hover:bg-primary/5 transition-colors active:scale-95">
                Download Statement
              </button>
              <button onClick={refetch} className="px-6 py-2 bg-primary text-on-primary font-title-md rounded hover:opacity-90 transition-colors active:scale-95">
                Refresh
              </button>
            </div>
          </div>

          <div className="bento-grid">
            {/* Wallet Balance */}
            <div className="bento-card col-span-12 lg:col-span-4 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <p className="font-label-md text-label-md text-outline uppercase tracking-wider">Total Wallet Balance</p>
                  <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
                </div>
                <h3 className="font-display-lg text-display-lg text-primary">{wallet.balance || 'KSh 0.00'}</h3>
                {wallet.growth && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">trending_up</span> {wallet.growth}
                    </span>
                    <span className="font-body-sm text-body-sm text-outline">vs last month</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-8">
                <button onClick={() => setTopUpOpen(true)} className="bg-primary text-on-primary py-3 rounded font-title-md flex items-center justify-center gap-2 active:scale-95">
                  <span className="material-symbols-outlined">add_circle</span> Top Up
                </button>
                <button onClick={() => setWithdrawOpen(true)} className="border border-outline text-primary py-3 rounded font-title-md flex items-center justify-center gap-2 hover:bg-surface-container-low active:scale-95">
                  <span className="material-symbols-outlined">outbox</span> Withdraw
                </button>
              </div>
            </div>

            {/* Next Contribution */}
            <div className="bento-card col-span-12 lg:col-span-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-fixed/20 rounded-full -mr-16 -mt-16" />
              <p className="font-label-md text-label-md text-outline uppercase mb-4">Next Contribution</p>
              <h4 className="font-title-lg text-title-lg text-primary mb-1">{rosca.groupName || '—'}</h4>
              <p className="font-body-md text-body-md text-on-surface-variant mb-6">{rosca.dueDate ? `Due on ${rosca.dueDate}` : 'No upcoming contribution'}</p>
              {rosca.amount && (
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center">
                    <span className="font-body-md text-body-md text-on-surface-variant">Amount Due</span>
                    <span className="font-title-md text-title-md text-primary">{rosca.amount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-body-md text-body-md text-on-surface-variant">Round Status</span>
                    <span className="font-title-md text-title-md text-primary">{rosca.round}</span>
                  </div>
                  <div className="w-full bg-surface-container-highest h-1.5 rounded-full">
                    <div className="bg-secondary-container h-full rounded-full transition-all" style={{ width: `${rosca.progress || 0}%` }} />
                  </div>
                </div>
              )}
              {rosca.cycleId ? (
                <Link to={`/rosca`} className="w-full bg-secondary text-on-secondary font-bold py-3 rounded flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span> Pay Now
                </Link>
              ) : (
                <p className="text-center font-body-sm text-body-sm text-on-surface-variant">Not enrolled in a ROSCA cycle</p>
              )}
            </div>

            {/* Welfare + Payout */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <div className="bento-card bg-surface-container-low border-none">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-label-md text-label-md text-outline uppercase">Welfare Claim Status</p>
                    <h4 className="font-headline-md text-headline-md text-primary">{welfareClaim.status ? welfareClaim.status.replace('_', ' ') : 'No Active Claim'}</h4>
                  </div>
                  {welfareClaim.amount && <StatusBadge status={welfareClaim.status} />}
                </div>
                {welfareClaim.amount && <p className="font-body-sm text-body-sm text-on-surface-variant">Requested: {welfareClaim.amount}</p>}
                <Link to="/welfare" className="mt-4 text-primary font-title-md flex items-center gap-1 hover:underline">
                  {welfareClaim.id ? 'View Claim' : 'Submit a Claim'} <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
              <div className="bento-card border-secondary-fixed/50 bg-secondary-fixed/5">
                <p className="font-label-md text-label-md text-secondary-fixed-variant uppercase mb-2">Next ROSCA Payout</p>
                <div className="flex justify-between items-end">
                  <div>
                    <h4 className="font-headline-md text-headline-md text-secondary">{payout.amount || 'N/A'}</h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">{payout.date ? `Scheduled: ${payout.date}` : 'Not scheduled'}</p>
                  </div>
                  {payout.position && (
                    <div className="text-right">
                      <p className="font-label-md text-label-md text-outline">POSITION</p>
                      <p className="font-title-lg text-title-lg text-primary">#{payout.position}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bento-card col-span-12">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-stack-lg gap-4">
                <div>
                  <h3 className="font-title-lg text-title-lg text-primary">Recent Activity</h3>
                  <p className="font-body-sm text-body-sm text-outline">Your last financial interactions</p>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                  {['all','contributions','welfare','withdrawals'].map(f => (
                    <button key={f} onClick={() => setTxFilter(f)}
                      className={`px-4 py-1.5 rounded-full text-body-sm font-label-md capitalize transition-colors ${txFilter === f ? 'bg-primary text-on-primary' : 'border border-outline-variant hover:bg-surface-container'}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant">
                      {['Date','Transaction ID','Description','Category','Amount','Status'].map(h => (
                        <th key={h} className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {txs.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant font-body-md">No transactions found.</td></tr>
                    ) : txs.map((tx, i) => (
                      <tr key={tx.id || i} className="hover:bg-surface-container-low transition-colors cursor-pointer">
                        <td className="px-6 py-4 font-body-md text-body-md">{tx.date}</td>
                        <td className="px-6 py-4 font-code-md text-code-md text-outline">{tx.reference || tx.id}</td>
                        <td className="px-6 py-4 font-title-md text-title-md text-primary">{tx.description}</td>
                        <td className="px-6 py-4 font-body-md text-body-md">{tx.category}</td>
                        <td className={`px-6 py-4 font-title-md text-title-md ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'credit' ? '+' : '-'}{tx.amount}
                        </td>
                        <td className="px-6 py-4"><StatusBadge status={tx.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-stack-lg flex items-center justify-between border-t border-outline-variant pt-6">
                <p className="font-body-sm text-body-sm text-outline">Showing {txs.length} of {totalTx} transactions</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                    className="px-3 py-1 border border-outline-variant rounded disabled:opacity-30">
                    <span className="material-symbols-outlined text-base">chevron_left</span>
                  </button>
                  <button onClick={() => setPage(p => p+1)}
                    className="px-3 py-1 border border-outline-variant rounded hover:bg-surface-container">
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </main>

      <TopUpModal   open={topUpOpen}    onClose={() => setTopUpOpen(false)}    chamaId={chamaId} onSuccess={refetch} />
      <WithdrawModal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} chamaId={chamaId} onSuccess={refetch} />
    </>
  );
}
