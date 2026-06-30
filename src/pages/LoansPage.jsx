import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import TopNavBar from '../components/TopNavBar';
import { useAuth } from '../context/AuthContext';
import { useApi, useMutation } from '../hooks/useApi';
import { loansApi } from '../api/client';
import { PageLoader, ErrorBanner, EmptyState, StatusBadge, Modal, toast } from '../components/UI';

function ApplyLoanModal({ open, onClose, chamaId, onSuccess }) {
  const [form, setForm] = useState({ amount: '', purpose: '', term: '3', guarantor: '' });
  const { mutate, loading, error } = useMutation((d) => loansApi.apply(chamaId, d));
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await mutate(form);
      toast('Loan application submitted successfully', 'success');
      onSuccess();
      onClose();
      setForm({ amount: '', purpose: '', term: '3', guarantor: '' });
    } catch (_) {}
  };
  return (
    <Modal open={open} onClose={onClose} title="New Loan Application" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-error-container text-on-error-container rounded text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Amount (KES) *</label>
            <input className="w-full p-3 border border-outline-variant rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary"
              type="number" min="1000" value={form.amount} onChange={e => setForm(p=>({...p,amount:e.target.value}))} required />
          </div>
          <div>
            <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Term (months) *</label>
            <select className="w-full p-3 border border-outline-variant rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary"
              value={form.term} onChange={e => setForm(p=>({...p,term:e.target.value}))}>
              <option value="1">1 month</option>
              <option value="3">3 months</option>
              <option value="6">6 months</option>
              <option value="12">12 months</option>
              <option value="24">24 months</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Purpose *</label>
          <select className="w-full p-3 border border-outline-variant rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary"
            value={form.purpose} onChange={e => setForm(p=>({...p,purpose:e.target.value}))} required>
            <option value="">Select purpose…</option>
            <option value="business">Business Expansion</option>
            <option value="education">Education</option>
            <option value="medical">Medical</option>
            <option value="emergency">Emergency</option>
            <option value="housing">Housing</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Guarantor (Member ID / Phone)</label>
          <input className="w-full p-3 border border-outline-variant rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary"
            value={form.guarantor} onChange={e => setForm(p=>({...p,guarantor:e.target.value}))} placeholder="Optional" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-outline rounded-lg font-label-md">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-primary text-on-primary rounded-lg font-label-md disabled:opacity-60">
            {loading ? 'Submitting…' : 'Submit Application'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function RepayModal({ open, onClose, loan, chamaId, onSuccess }) {
  const [amount, setAmount] = useState('');
  const { mutate, loading, error } = useMutation((d) => loansApi.repay(chamaId, loan?.id, d));
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await mutate({ amount: Number(amount) });
      toast('Repayment recorded successfully', 'success');
      onSuccess();
      onClose();
    } catch (_) {}
  };
  return (
    <Modal open={open} onClose={onClose} title="Record Repayment">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-error-container text-on-error-container rounded text-sm">{error}</div>}
        {loan && (
          <div className="p-3 bg-surface-container rounded-lg text-sm space-y-1">
            <p><strong>Loan:</strong> {loan.id}</p>
            <p><strong>Borrower:</strong> {loan.memberName}</p>
            <p><strong>Outstanding:</strong> {loan.balance}</p>
          </div>
        )}
        <div>
          <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Repayment Amount (KES)</label>
          <input className="w-full p-3 border border-outline-variant rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary"
            type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} required />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-outline rounded-lg font-label-md">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-primary text-on-primary rounded-lg font-label-md disabled:opacity-60">
            {loading ? 'Processing…' : 'Record Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function LoansPage() {
  const { activeChama, isAdmin } = useAuth();
  const chamaId = activeChama?.id || activeChama?._id;
  const [applyOpen, setApplyOpen] = useState(false);
  const [repayLoan, setRepayLoan] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const { data, loading, error, refetch } = useApi(
    () => loansApi.list(chamaId),
    [chamaId]
  );

  const { mutate: approveLoan } = useMutation((id) => loansApi.approve(chamaId, id));
  const { mutate: rejectLoan  } = useMutation((id) => loansApi.reject(chamaId, id, {}));
  const { mutate: disburseLoan} = useMutation((id) => loansApi.disburse(chamaId, id));

  const handleApprove = async (id) => {
    try { await approveLoan(id); toast('Loan approved', 'success'); refetch(); } catch (e) { toast(e.message, 'error'); }
  };
  const handleReject = async (id) => {
    try { await rejectLoan(id); toast('Loan rejected', 'info'); refetch(); } catch (e) { toast(e.message, 'error'); }
  };
  const handleDisburse = async (id) => {
    try { await disburseLoan(id); toast('Loan disbursed via M-PESA', 'success'); refetch(); } catch (e) { toast(e.message, 'error'); }
  };

  const handleExport = async () => {
    try {
      window.print();
    } catch (e) { toast(e.message, 'error'); }
  };

  if (loading) return <><Sidebar /><main className="ml-[260px] min-h-screen"><TopNavBar /><PageLoader /></main></>;
  if (error)   return <><Sidebar /><main className="ml-[260px] min-h-screen"><TopNavBar /><div className="p-8"><ErrorBanner message={error} onRetry={refetch} /></div></main></>;

  const loans  = data?.loans || data || [];
  const stats  = data?.stats || {};
  const allLoans = loans.filter(l => statusFilter === 'all' || l.status?.toLowerCase() === statusFilter);
  const paged  = allLoans.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const totalPages = Math.ceil(allLoans.length / PAGE_SIZE);

  return (
    <>
      <Sidebar />
      <main className="ml-[260px] min-h-screen">
        <TopNavBar />
        <div className="max-w-container-max mx-auto p-margin-desktop space-y-stack-lg">

          {/* Header */}
          <div className="flex justify-between items-end">
            <div>
              <nav className="flex text-label-md text-outline mb-2 gap-2">
                <span>Organization</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span>Loan Management</span>
              </nav>
              <h2 className="font-headline-lg text-headline-lg text-primary">Active Loan Portfolio</h2>
            </div>
            <div className="flex gap-stack-md">
              <button onClick={handleExport} className="flex items-center gap-2 px-stack-lg py-3 border border-outline text-primary font-title-md rounded-lg hover:bg-surface-container-low transition-all">
                <span className="material-symbols-outlined">download</span> Export Report
              </button>
              <button onClick={() => setApplyOpen(true)} className="flex items-center gap-2 px-stack-lg py-3 bg-primary text-on-primary font-title-md rounded-lg hover:bg-primary/90 transition-all shadow-sm active:scale-95">
                <span className="material-symbols-outlined">add</span> New {isAdmin ? 'Disbursement' : 'Application'}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
            {[
              { label: 'Total Outstanding', value: stats.totalOutstanding || 'KES 0', icon: 'account_balance', bg: 'bg-primary-fixed' },
              { label: 'Overdue Count',     value: `${stats.overdueCount ?? 0} Members`, icon: 'event_busy', bg: 'bg-error-container', errBadge: true },
              { label: 'Avg. Repayment Rate', value: stats.repaymentRate || '—', icon: 'hourglass_top', bg: 'bg-secondary-container' },
              { label: '30-Day Forecast',   value: stats.forecast || '—', icon: 'payments', bg: 'bg-primary', dark: true },
            ].map((s, i) => (
              <div key={i} className={`p-stack-lg border border-outline-variant rounded-xl flex flex-col justify-between hover:shadow-md transition-shadow ${s.dark ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 ${s.bg} rounded-lg ${s.dark ? 'bg-white/10' : ''}`}>
                    <span className="material-symbols-outlined">{s.icon}</span>
                  </div>
                  {s.errBadge && <span className="text-label-md text-error flex items-center gap-1 bg-error-container/30 px-2 py-1 rounded">High Priority</span>}
                </div>
                <div>
                  <p className={`font-label-md text-label-md uppercase tracking-wider ${s.dark ? 'opacity-70' : 'text-outline'}`}>{s.label}</p>
                  <h3 className="font-display-lg text-display-lg mt-1">{s.value}</h3>
                </div>
              </div>
            ))}
          </div>

          {/* Table */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            <div className="p-stack-lg border-b border-outline-variant flex justify-between items-center bg-surface-container-low/30">
              <h4 className="font-title-lg text-title-lg text-primary">Loan Ledger</h4>
              <div className="flex items-center gap-2">
                {['all','active','pending','overdue','disbursed','closed'].map(s => (
                  <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-colors ${statusFilter === s ? 'bg-primary text-on-primary' : 'border border-outline-variant hover:bg-surface-container-low'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    {['Member Name','Loan ID','Original Amount','Balance','Next Payment','Status','Action'].map(h => (
                      <th key={h} className="px-stack-lg py-4 font-label-md text-label-md text-outline uppercase text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {paged.length === 0 ? (
                    <tr><td colSpan={7}><EmptyState icon="payments" title="No loans found" description="No loans match your current filter." /></td></tr>
                  ) : paged.map((loan, i) => (
                    <tr key={loan.id || i} className={`hover:bg-surface-container-low transition-colors cursor-pointer ${loan.status === 'overdue' ? 'bg-error-container/5' : ''}`}>
                      <td className="px-stack-lg py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center font-bold text-primary text-xs">
                            {(loan.memberName || '?').slice(0,2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-title-md text-title-md text-primary">{loan.memberName}</p>
                            <p className="font-body-sm text-body-sm text-outline">{loan.memberTier || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-stack-lg py-4 font-code-md text-code-md text-on-surface-variant">{loan.id}</td>
                      <td className="px-stack-lg py-4 font-body-md text-body-md">{loan.originalAmount}</td>
                      <td className="px-stack-lg py-4 font-title-md text-title-md text-primary text-right">{loan.balance}</td>
                      <td className={`px-stack-lg py-4 font-body-md text-body-md ${loan.status === 'overdue' ? 'text-error font-bold' : ''}`}>{loan.nextPaymentDate || '—'}</td>
                      <td className="px-stack-lg py-4"><StatusBadge status={loan.status} /></td>
                      <td className="px-stack-lg py-4">
                        <div className="flex items-center gap-1">
                          {isAdmin && loan.status === 'pending' && (
                            <>
                              <button onClick={() => handleApprove(loan.id)} className="px-2 py-1 bg-primary text-on-primary rounded text-xs font-bold hover:opacity-90">Approve</button>
                              <button onClick={() => handleReject(loan.id)} className="px-2 py-1 bg-error-container text-error rounded text-xs font-bold hover:opacity-90">Reject</button>
                            </>
                          )}
                          {isAdmin && loan.status === 'approved' && (
                            <button onClick={() => handleDisburse(loan.id)} className="px-2 py-1 bg-secondary text-on-secondary rounded text-xs font-bold hover:opacity-90">Disburse</button>
                          )}
                          {['active','overdue','disbursed'].includes(loan.status) && (
                            <button onClick={() => setRepayLoan(loan)} className="px-2 py-1 bg-surface-container-high text-on-surface rounded text-xs font-bold hover:bg-surface-container">Repay</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-stack-md border-t border-outline-variant flex justify-between items-center bg-surface-container-low/30">
              <p className="font-body-sm text-body-sm text-outline">Showing {paged.length} of {allLoans.length} loans</p>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                  className="p-1 border border-outline-variant rounded-lg hover:bg-surface-container-low disabled:opacity-50">
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
                  <button key={n} onClick={() => setPage(n)}
                    className={`px-3 py-1 rounded-lg text-body-sm ${n === page ? 'bg-primary text-on-primary' : 'hover:bg-surface-container-low'}`}>{n}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                  className="p-1 border border-outline-variant rounded-lg hover:bg-surface-container-low disabled:opacity-50">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      <ApplyLoanModal open={applyOpen} onClose={() => setApplyOpen(false)} chamaId={chamaId} onSuccess={refetch} />
      <RepayModal open={!!repayLoan} onClose={() => setRepayLoan(null)} loan={repayLoan} chamaId={chamaId} onSuccess={refetch} />
    </>
  );
}
