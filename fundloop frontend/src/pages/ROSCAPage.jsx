import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import TopNavBar from '../components/TopNavBar';
import { useAuth } from '../context/AuthContext';
import { useApi, useMutation } from '../hooks/useApi';
import { roscaApi } from '../api/client';
import { PageLoader, ErrorBanner, EmptyState, StatusBadge, Modal, toast } from '../components/UI';

function ContributeModal({ open, onClose, cycle, chamaId, onSuccess }) {
  const [amount, setAmount] = useState('');
  const { mutate, loading, error } = useMutation((d) => roscaApi.contribute(chamaId, cycle?.id, d));
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await mutate({ amount: Number(amount), method: 'mpesa' });
      toast('Contribution initiated — check your phone for M-PESA prompt', 'success');
      onSuccess();
      onClose();
    } catch (_) {}
  };
  return (
    <Modal open={open} onClose={onClose} title="Make Contribution">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-error-container text-on-error-container rounded text-sm">{error}</div>}
        {cycle && (
          <div className="p-3 bg-surface-container rounded-lg text-sm">
            <p><strong>Cycle:</strong> {cycle.name}</p>
            <p><strong>Required Amount:</strong> {cycle.contributionAmount}</p>
          </div>
        )}
        <div>
          <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Amount (KES)</label>
          <input className="w-full p-3 border border-outline-variant rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary"
            type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder={cycle?.contributionAmount || '0'} required />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-outline rounded-lg font-label-md">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-primary text-on-primary rounded-lg font-label-md disabled:opacity-60">
            {loading ? 'Processing…' : 'Pay via M-PESA'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function NewCycleModal({ open, onClose, chamaId, onSuccess }) {
  const [form, setForm] = useState({ name: '', contributionAmount: '', frequency: 'monthly', startDate: '', members: '' });
  const { mutate, loading, error } = useMutation((d) => roscaApi.createCycle(chamaId, d));
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await mutate({ ...form, contributionAmount: Number(form.contributionAmount) });
      toast('ROSCA cycle created', 'success');
      onSuccess();
      onClose();
    } catch (_) {}
  };
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  return (
    <Modal open={open} onClose={onClose} title="New ROSCA Cycle" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-error-container text-on-error-container rounded text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Cycle Name *</label>
            <input className="w-full p-3 border border-outline-variant rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary"
              value={form.name} onChange={f('name')} placeholder="e.g. Standard Circle - Q4" required />
          </div>
          <div>
            <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Contribution Amount (KES) *</label>
            <input className="w-full p-3 border border-outline-variant rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary"
              type="number" min="100" value={form.contributionAmount} onChange={f('contributionAmount')} required />
          </div>
          <div>
            <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Frequency *</label>
            <select className="w-full p-3 border border-outline-variant rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary"
              value={form.frequency} onChange={f('frequency')}>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Start Date *</label>
            <input className="w-full p-3 border border-outline-variant rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary"
              type="date" value={form.startDate} onChange={f('startDate')} required />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-outline rounded-lg font-label-md">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-primary text-on-primary rounded-lg font-label-md disabled:opacity-60">
            {loading ? 'Creating…' : 'Create Cycle'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function ROSCAPage() {
  const { activeChama, canManageRosca } = useAuth();
  const chamaId = activeChama?.id || activeChama?._id;
  const [contributeTarget, setContributeTarget] = useState(null);
  const [newCycleOpen, setNewCycleOpen] = useState(false);

  const { data, loading, error, refetch } = useApi(
    () => roscaApi.list(chamaId),
    [chamaId]
  );

  if (loading) return <><Sidebar /><main className="ml-[260px] flex-grow min-h-screen"><TopNavBar /><PageLoader /></main></>;
  if (error)   return <><Sidebar /><main className="ml-[260px] flex-grow min-h-screen"><TopNavBar /><div className="p-8"><ErrorBanner message={error} onRetry={refetch} /></div></main></>;

  const cycles  = data?.cycles || data || [];
  const stats   = data?.stats  || {};
  const activeCycle = cycles.find(c => c.status === 'active') || cycles[0];

  return (
    <>
      <Sidebar />
      <main className="ml-[260px] flex-grow min-h-screen">
        <TopNavBar />
        <div className="p-stack-lg max-w-container-max mx-auto space-y-stack-lg">

          <section className="flex justify-between items-end">
            <div>
              <nav className="flex items-center gap-2 text-label-md text-outline mb-2">
                <span>ROSCA</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-on-surface-variant font-bold">{activeCycle?.name || 'No active cycle'}</span>
              </nav>
              <h2 className="font-headline-lg text-headline-lg text-primary">Monthly Rotation Management</h2>
              <p className="font-body-md text-body-md text-outline">Manage cycle participants, verify contributions, and monitor payout timelines.</p>
            </div>
            <div className="flex gap-stack-sm">
              {canManageRosca && (
                <button onClick={() => setNewCycleOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:opacity-90 transition-opacity">
                  <span className="material-symbols-outlined">add</span>
                  <span className="font-title-md">New Cycle</span>
                </button>
              )}
            </div>
          </section>

          {/* Stats */}
          <section className="grid grid-cols-12 gap-gutter">
            <div className="col-span-3 bg-surface-container-lowest p-stack-lg rounded-xl border border-outline-variant">
              <p className="font-label-md text-label-md text-outline uppercase tracking-wider">Total Pool Balance</p>
              <h3 className="font-headline-lg text-headline-lg text-primary mt-2">{stats.totalPool || '—'}</h3>
              {stats.contributionRate && (
                <div className="flex items-center gap-2 mt-4 text-green-600">
                  <span className="material-symbols-outlined text-[16px]">trending_up</span>
                  <span className="font-body-sm text-body-sm">{stats.contributionRate} contribution rate</span>
                </div>
              )}
            </div>
            <div className="col-span-3 bg-surface-container-lowest p-stack-lg rounded-xl border border-outline-variant">
              <p className="font-label-md text-label-md text-outline uppercase tracking-wider">Current Payout</p>
              <h4 className="font-title-lg text-title-lg text-primary mt-2">{stats.currentPayoutMember || '—'}</h4>
              {stats.payoutDue && <p className="font-body-sm text-body-sm text-outline mt-1">Due: {stats.payoutDue}</p>}
              {stats.payoutProgress !== undefined && (
                <div className="mt-4 h-1 w-full bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-secondary-container" style={{ width: `${stats.payoutProgress}%` }} />
                </div>
              )}
            </div>
            <div className="col-span-3 bg-surface-container-lowest p-stack-lg rounded-xl border border-outline-variant">
              <p className="font-label-md text-label-md text-outline uppercase tracking-wider">Active Members</p>
              <h3 className="font-headline-lg text-headline-lg text-primary mt-2">{stats.activeMembers ?? '—'}</h3>
            </div>
            <div className="col-span-3 bg-primary-container p-stack-lg rounded-xl border border-primary relative overflow-hidden">
              <p className="font-label-md text-label-md text-on-primary-container opacity-70 uppercase tracking-wider">Next Cycle Forecast</p>
              <h3 className="font-headline-md text-headline-md text-on-primary-container mt-2">{stats.nextCycleForecast || '—'}</h3>
            </div>
          </section>

          {/* Cycles List */}
          {cycles.length === 0 ? (
            <EmptyState icon="account_balance_wallet" title="No ROSCA cycles yet"
              description="Create the first rotation cycle for your Chama."
              action={canManageRosca ? { label: 'Create Cycle', onClick: () => setNewCycleOpen(true) } : undefined} />
          ) : cycles.map((cycle) => (
            <section key={cycle.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
              <div className="p-stack-lg border-b border-outline-variant flex justify-between items-center">
                <div>
                  <h3 className="font-title-lg text-title-lg text-primary">{cycle.name}</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {cycle.frequency} • {cycle.contributionAmount} per round • Started {cycle.startDate}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={cycle.status} />
                  {cycle.status === 'active' && (
                    <button onClick={() => setContributeTarget(cycle)}
                      className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md hover:opacity-90">
                      Contribute
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-container-low border-b border-outline-variant">
                    <tr>
                      {['Position','Member','Status','Contributed','Payout Date','Amount'].map(h => (
                        <th key={h} className="px-6 py-3 font-label-md text-label-md text-outline uppercase text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {(cycle.members || []).length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-6 text-center text-on-surface-variant">No members in this cycle yet.</td></tr>
                    ) : (cycle.members || []).map((m, i) => (
                      <tr key={m.id || i} className="hover:bg-surface-container-low transition-colors">
                        <td className="px-6 py-4 font-title-md text-title-md text-primary">#{m.position}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary-fixed flex items-center justify-center text-xs font-bold text-primary">
                              {(m.name || '?').slice(0,2).toUpperCase()}
                            </div>
                            <span className="font-body-md text-body-md">{m.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4"><StatusBadge status={m.contributionStatus} /></td>
                        <td className="px-6 py-4 font-body-md text-body-md">{m.contributed || '—'}</td>
                        <td className="px-6 py-4 font-body-md text-body-md">{m.payoutDate || '—'}</td>
                        <td className="px-6 py-4 font-title-md text-title-md text-primary">{m.payoutAmount || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      </main>

      <ContributeModal open={!!contributeTarget} onClose={() => setContributeTarget(null)} cycle={contributeTarget} chamaId={chamaId} onSuccess={refetch} />
      <NewCycleModal   open={newCycleOpen}       onClose={() => setNewCycleOpen(false)}      chamaId={chamaId}            onSuccess={refetch} />
    </>
  );
}
