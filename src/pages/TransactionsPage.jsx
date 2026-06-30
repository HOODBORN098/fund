import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import TopNavBar from '../components/TopNavBar';
import { useAuth } from '../context/AuthContext';
import { useApi, useMutation } from '../hooks/useApi';
import { transactionsApi } from '../api/client';
import { PageLoader, ErrorBanner, EmptyState, StatusBadge, Modal, toast } from '../components/UI';

function ReverseModal({ open, onClose, tx, chamaId, onSuccess }) {
  const [reason, setReason] = useState('');
  const { mutate, loading, error } = useMutation((data) => transactionsApi.reverse(chamaId, tx?.id, data));
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await mutate({ reason });
      toast('Transaction reversed', 'success');
      onSuccess();
      onClose();
      setReason('');
    } catch (_) {}
  };
  return (
    <Modal open={open} onClose={onClose} title="Reverse Transaction">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-error-container text-on-error-container rounded text-sm">{error}</div>}
        {tx && (
          <div className="p-3 bg-surface-container rounded-lg text-sm">
            <p><strong>Reference:</strong> {tx.reference || tx.id}</p>
            <p><strong>Amount:</strong> {tx.amount}</p>
          </div>
        )}
        <div>
          <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Reason for reversal *</label>
          <textarea className="w-full p-3 border border-outline-variant rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary"
            rows={3} value={reason} onChange={e => setReason(e.target.value)} required
            placeholder="e.g. Duplicate payment error" />
        </div>
        <p className="font-body-sm text-body-sm text-outline">
          This creates a new reversal entry — the original transaction record is never edited (BR-FIN-002).
        </p>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-outline rounded-lg font-label-md">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-error-container text-error rounded-lg font-label-md disabled:opacity-60">
            {loading ? 'Reversing…' : 'Confirm Reversal'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function TransactionsPage() {
  const { activeChama, canReverseTransactions } = useAuth();
  const chamaId = activeChama?.id || activeChama?._id;
  const [filters, setFilters] = useState({ category: 'all', status: 'all', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [reverseTarget, setReverseTarget] = useState(null);
  const PAGE_SIZE = 15;

  const { data, loading, error, refetch } = useApi(
    () => transactionsApi.list(chamaId, { page, limit: PAGE_SIZE, ...filters }),
    [chamaId, page, filters.category, filters.status, filters.from, filters.to]
  );

  const handleExport = async () => {
    try {
      const res = await transactionsApi.export(chamaId, filters);
      if (res.url) window.open(res.url, '_blank');
      else toast('Export will be emailed to you shortly.', 'info');
    } catch (e) { toast(e.message, 'error'); }
  };

  if (loading) return <><Sidebar /><main className="ml-[260px] min-h-screen"><TopNavBar /><PageLoader /></main></>;
  if (error)   return <><Sidebar /><main className="ml-[260px] min-h-screen"><TopNavBar /><div className="p-8"><ErrorBanner message={error} onRetry={refetch} /></div></main></>;

  const txs = data?.transactions || data || [];
  const total = data?.total || txs.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <Sidebar />
      <main className="ml-[260px] min-h-screen">
        <TopNavBar />
        <div className="px-margin-desktop py-stack-lg max-w-container-max mx-auto space-y-stack-lg">

          <div className="flex justify-between items-end">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-primary">Transaction Ledger</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">Complete financial history for {activeChama?.name || 'your Chama'}.</p>
            </div>
            <button onClick={handleExport} className="flex items-center gap-2 px-stack-lg py-3 border border-outline text-primary font-title-md rounded-lg hover:bg-surface-container-low transition-all">
              <span className="material-symbols-outlined">download</span> Export CSV
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
            <select className="px-3 py-2 border border-outline-variant rounded-lg bg-surface outline-none"
              value={filters.category} onChange={e => { setFilters(p => ({ ...p, category: e.target.value })); setPage(1); }}>
              <option value="all">All Categories</option>
              <option value="rosca">ROSCA</option>
              <option value="welfare">Welfare</option>
              <option value="deposit">Deposits</option>
              <option value="withdrawal">Withdrawals</option>
            </select>
            <select className="px-3 py-2 border border-outline-variant rounded-lg bg-surface outline-none"
              value={filters.status} onChange={e => { setFilters(p => ({ ...p, status: e.target.value })); setPage(1); }}>
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            <input type="date" className="px-3 py-2 border border-outline-variant rounded-lg bg-surface outline-none"
              value={filters.from} onChange={e => { setFilters(p => ({ ...p, from: e.target.value })); setPage(1); }} />
            <span className="text-on-surface-variant">to</span>
            <input type="date" className="px-3 py-2 border border-outline-variant rounded-lg bg-surface outline-none"
              value={filters.to} onChange={e => { setFilters(p => ({ ...p, to: e.target.value })); setPage(1); }} />
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            {txs.length === 0 ? (
              <EmptyState icon="receipt_long" title="No transactions found" description="Try adjusting your filters." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-surface-container-low border-b border-outline-variant">
                    <tr>
                      {['Date','Reference','Description','Category','Amount','Status', canReverseTransactions ? 'Actions' : null].filter(Boolean).map(h => (
                        <th key={h} className="px-6 py-4 font-label-md text-label-md text-outline uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {txs.map((tx, i) => (
                      <tr key={tx.id || i} className="hover:bg-surface-container-low transition-colors">
                        <td className="px-6 py-4 font-body-md text-body-md">{tx.date}</td>
                        <td className="px-6 py-4 font-code-md text-code-md text-outline">{tx.reference || tx.id}</td>
                        <td className="px-6 py-4 font-title-md text-title-md text-primary">{tx.description}</td>
                        <td className="px-6 py-4 font-body-md text-body-md capitalize">{tx.category}</td>
                        <td className={`px-6 py-4 font-title-md text-title-md ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'credit' ? '+' : '-'}{tx.amount}
                        </td>
                        <td className="px-6 py-4"><StatusBadge status={tx.status} /></td>
                        {canReverseTransactions && (
                          <td className="px-6 py-4">
                            {tx.status === 'success' && (
                              <button onClick={() => setReverseTarget(tx)} className="text-xs font-bold text-error hover:underline">
                                Reverse
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {txs.length > 0 && (
              <div className="p-4 border-t border-outline-variant flex items-center justify-between">
                <p className="font-body-sm text-body-sm text-outline">Showing {(page-1)*PAGE_SIZE + 1}–{Math.min(page*PAGE_SIZE, total)} of {total}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                    className="px-3 py-1 border border-outline-variant rounded disabled:opacity-30">
                    <span className="material-symbols-outlined text-base">chevron_left</span>
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages}
                    className="px-3 py-1 border border-outline-variant rounded disabled:opacity-30">
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <ReverseModal open={!!reverseTarget} onClose={() => setReverseTarget(null)} tx={reverseTarget} chamaId={chamaId} onSuccess={refetch} />
    </>
  );
}
