import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNavBar from '../components/TopNavBar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { useApi, useMutation } from '../hooks/useApi';
import { dashboardApi, transactionsApi } from '../api/client';
import { PageLoader, ErrorBanner, StatusBadge, Modal, toast } from '../components/UI';

function StatCard({ icon, iconBg, label, value, badge, sub }) {
  return (
    <div className="bg-surface-container-lowest p-stack-lg rounded-xl border border-outline-variant hover:bg-white transition-all">
      <div className="flex justify-between items-start mb-4">
        <span className={`material-symbols-outlined p-2 ${iconBg} rounded-lg`}>{icon}</span>
        {badge && (
          <span className={`flex items-center font-label-md px-2 py-0.5 rounded-sm text-xs ${badge.cls}`}>
            <span className="material-symbols-outlined text-[14px] mr-1">{badge.icon}</span>
            {badge.text}
          </span>
        )}
      </div>
      <p className="font-label-md text-label-md text-outline uppercase tracking-wider mb-1">{label}</p>
      <h3 className="font-headline-lg text-headline-lg text-primary">{value || '—'}</h3>
      {sub && <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">{sub}</p>}
    </div>
  );
}

function FundTransferModal({ open, onClose, chamaId }) {
  const [form, setForm] = useState({ to: '', amount: '', note: '' });
  const { mutate, loading, error } = useMutation((data) => transactionsApi.transfer(chamaId, data));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await mutate(form);
      toast('Transfer initiated successfully', 'success');
      onClose();
      setForm({ to: '', amount: '', note: '' });
    } catch (_) {}
  };

  return (
    <Modal open={open} onClose={onClose} title="Fund Transfer">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-error-container text-on-error-container rounded text-sm">{error}</div>}
        <div>
          <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Recipient (Member ID / Phone)</label>
          <input className="w-full p-3 border border-outline-variant rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary"
            value={form.to} onChange={e => setForm(p => ({ ...p, to: e.target.value }))} placeholder="e.g. 0712345678" required />
        </div>
        <div>
          <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Amount (KES)</label>
          <input className="w-full p-3 border border-outline-variant rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary"
            type="number" min="1" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" required />
        </div>
        <div>
          <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Note (optional)</label>
          <input className="w-full p-3 border border-outline-variant rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary"
            value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} placeholder="Purpose of transfer" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-outline rounded-lg font-label-md">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-primary text-on-primary rounded-lg font-label-md disabled:opacity-60">
            {loading ? 'Processing…' : 'Send Transfer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminDashboard() {
  const { activeChama, user } = useAuth();
  const chamaId = activeChama?.id || activeChama?._id;
  const navigate = useNavigate();
  const [transferOpen, setTransferOpen] = useState(false);
  const [activityFilter, setActivityFilter] = useState('all');

  const { data, loading, error, refetch } = useApi(
    () => dashboardApi.adminOverview(chamaId),
    [chamaId]
  );

  const handleExport = async () => {
    try {
      const result = await transactionsApi.export(chamaId, { format: 'csv' });
      const url = result.url || result.downloadUrl;
      if (url) window.open(url, '_blank');
      else toast('Export ready. Check your email.', 'info');
    } catch (e) { toast(e.message, 'error'); }
  };

  if (loading) return <><Sidebar /><main className="ml-[260px] min-h-screen flex flex-col"><TopNavBar /><PageLoader /></main></>;
  if (error)   return <><Sidebar /><main className="ml-[260px] min-h-screen flex flex-col"><TopNavBar /><div className="p-8"><ErrorBanner message={error} onRetry={refetch} /></div></main></>;

  const stats    = data?.stats || {};
  const actions  = data?.actionItems || [];
  const activity = (data?.recentActivity || []).filter(a =>
    activityFilter === 'all' || a.category?.toLowerCase() === activityFilter
  );

  return (
    <>
      <Sidebar />
      <main className="ml-[260px] min-h-screen flex flex-col">
        <TopNavBar userName={user?.name} role={user?.role} />
        <div className="flex-1 px-margin-desktop py-stack-lg max-w-container-max w-full mx-auto">

          <div className="flex justify-between items-end mb-stack-xl">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-primary mb-1">Financial Overview</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Welcome back{user?.name ? `, ${user.name}` : ''}. Latest health report for {activeChama?.name || 'your Chama'}.
              </p>
            </div>
            <div className="flex gap-stack-sm">
              <button onClick={handleExport} className="px-4 py-2 bg-surface-container-lowest border border-outline-variant text-primary font-title-md rounded hover:bg-surface-container transition-colors">
                Export Report
              </button>
              <button onClick={() => setTransferOpen(true)} className="px-4 py-2 bg-primary text-on-primary font-title-md rounded hover:bg-primary/90 transition-colors shadow-sm">
                Fund Transfer
              </button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-gutter">
            <div className="col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-gutter">
              <StatCard icon="account_balance" iconBg="bg-primary-fixed text-on-primary-fixed" label="Total Assets" value={stats.totalAssets}
                badge={{ icon: 'trending_up', text: stats.assetGrowth || '+0%', cls: 'text-secondary bg-secondary-container/20' }}
                sub={`Active in ${stats.activeFunds ?? 0} funds`} />
              <StatCard icon="sync_alt" iconBg="bg-secondary-fixed text-on-secondary-fixed" label="Current Cycle" value={stats.currentCycle}
                badge={{ icon: 'event', text: stats.cycleDeadline || '—', cls: 'text-secondary bg-secondary-container/20' }}
                sub={`${stats.contributedCount ?? 0}/${stats.totalMembers ?? 0} contributed`} />
              <StatCard icon="health_and_safety" iconBg="bg-tertiary-fixed text-on-tertiary-fixed-variant" label="Welfare Fund" value={stats.welfareFund}
                badge={{ icon: 'check_circle', text: 'Stable', cls: 'text-primary bg-primary-fixed/20' }}
                sub={`Reserve capacity ${stats.welfareCapacity ?? '—'}`} />
            </div>

            {/* Action Items */}
            <div className="col-span-12 lg:col-span-4 row-span-2">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col h-full">
                <div className="p-stack-lg border-b border-outline-variant flex justify-between items-center">
                  <h4 className="font-title-lg text-title-lg text-primary">Action Items</h4>
                  {actions.length > 0 && <span className="bg-error text-on-error px-2 py-0.5 rounded-full text-xs font-bold">{actions.length}</span>}
                </div>
                <div className="flex-1 p-stack-md space-y-stack-md overflow-y-auto">
                  {actions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                      <span className="material-symbols-outlined text-outline text-3xl">check_circle</span>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">All caught up!</p>
                    </div>
                  ) : actions.map((item, i) => (
                    <div key={i} onClick={() => item.route && navigate(item.route)}
                      className={`p-4 rounded-lg border-l-4 transition-colors cursor-pointer group ${
                        item.priority === 'high'   ? 'bg-error-container/5 border-error hover:bg-error-container/10' :
                        item.priority === 'medium' ? 'bg-secondary-container/5 border-secondary hover:bg-secondary-container/10' :
                        'bg-surface-container-low border-outline hover:bg-surface-container'
                      }`}
                    >
                      <div className="flex justify-between mb-1">
                        <span className={`font-title-md text-title-md ${
                          item.priority === 'high' ? 'text-on-error-container' :
                          item.priority === 'medium' ? 'text-secondary' : 'text-on-surface'
                        }`}>{item.title}</span>
                        <span className="material-symbols-outlined opacity-40 group-hover:opacity-100 transition-opacity">arrow_forward</span>
                      </div>
                      <p className="font-body-md text-body-md text-on-surface-variant">{item.description}</p>
                    </div>
                  ))}
                </div>
                <div className="p-stack-md border-t border-outline-variant">
                  <Link to="/governance" className="block w-full text-center text-primary font-title-md py-2 hover:bg-surface-container rounded transition-colors">
                    View All Tasks
                  </Link>
                </div>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="col-span-12 lg:col-span-8">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
                <div className="p-stack-lg border-b border-outline-variant flex justify-between items-center">
                  <h4 className="font-title-lg text-title-lg text-primary">Recent Activity</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface-variant font-label-md">Filter:</span>
                    <select className="bg-transparent border-none font-title-md text-primary text-sm focus:ring-0 cursor-pointer"
                      value={activityFilter} onChange={e => setActivityFilter(e.target.value)}>
                      <option value="all">All Activities</option>
                      <option value="rosca">ROSCA</option>
                      <option value="welfare">Welfare</option>
                      <option value="governance">Governance</option>
                    </select>
                  </div>
                </div>
                <div className="divide-y divide-outline-variant">
                  {activity.length === 0 ? (
                    <div className="p-8 text-center text-on-surface-variant font-body-md">No activity yet.</div>
                  ) : activity.map((item, i) => (
                    <div key={i} className="p-stack-lg flex items-center gap-stack-lg hover:bg-surface-container-low transition-colors">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.iconBg || 'bg-primary-fixed/20 text-primary'}`}>
                        <span className="material-symbols-outlined">{item.icon || 'swap_horiz'}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-body-md text-body-md text-on-surface">{item.description}</p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">{item.meta}</p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-outline-variant text-center">
                  <Link to="/transactions" className="text-primary font-label-md hover:underline">View Full Ledger →</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </main>
      <FundTransferModal open={transferOpen} onClose={() => setTransferOpen(false)} chamaId={chamaId} />
    </>
  );
}
