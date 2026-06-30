import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNavBar from '../components/TopNavBar';
import { useAuth } from '../context/AuthContext';
import { useApi, useMutation } from '../hooks/useApi';
import { chamaApi } from '../api/client';
import { PageLoader, ErrorBanner, EmptyState, Modal, toast, inputCls } from '../components/UI';

function NewChamaModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', type: 'rosca', monthlyContribution: '' });
  const { mutate, loading, error } = useMutation(chamaApi.create);
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await mutate({ ...form, monthlyContribution: Number(form.monthlyContribution) });
      toast('Chama created successfully', 'success');
      onSuccess();
      onClose();
    } catch (_) {}
  };
  return (
    <Modal open={open} onClose={onClose} title="Add New Chama">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-error-container text-on-error-container rounded text-sm">{error}</div>}
        <input className={inputCls} placeholder="Chama Name" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} required />
        <select className={inputCls} value={form.type} onChange={e => setForm(p=>({...p,type:e.target.value}))}>
          <option value="rosca">ROSCA</option>
          <option value="welfare">Welfare</option>
          <option value="investment">Investment</option>
          <option value="table_banking">Table Banking</option>
        </select>
        <input className={inputCls} type="number" placeholder="Monthly Contribution (KES)" value={form.monthlyContribution} onChange={e => setForm(p=>({...p,monthlyContribution:e.target.value}))} required />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-outline rounded-lg font-label-md">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-primary text-on-primary rounded-lg font-label-md disabled:opacity-60">
            {loading ? 'Creating…' : 'Create Chama'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function MultiChamaPortal() {
  const { switchChama } = useAuth();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, loading, error, refetch } = useApi(() => chamaApi.list(), []);

  const handleSelect = async (chama) => {
    await switchChama(chama);
    navigate('/dashboard/admin');
  };

  if (loading) return <><Sidebar /><main className="ml-[260px] min-h-screen flex flex-col"><TopNavBar /><PageLoader /></main></>;
  if (error)   return <><Sidebar /><main className="ml-[260px] min-h-screen flex flex-col"><TopNavBar /><div className="p-8"><ErrorBanner message={error} onRetry={refetch} /></div></main></>;

  const chamas = data?.chamas || data || [];

  return (
    <>
      <Sidebar />
      <main className="ml-[260px] min-h-screen flex flex-col">
        <TopNavBar />
        <section className="p-margin-desktop max-w-container-max mx-auto w-full">
          <div className="flex justify-between items-end mb-stack-xl">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-primary mb-2">Portfolio Overview</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant">
                You are currently managing {chamas.length} active {chamas.length === 1 ? 'Chama' : 'Chamas'} with shared governance.
              </p>
            </div>
            <button onClick={() => setCreateOpen(true)} className="bg-primary text-on-primary px-6 py-3 rounded-xl font-title-md flex items-center gap-2 shadow-sm hover:bg-primary-container transition-all active:scale-95">
              <span className="material-symbols-outlined">add_circle</span> Add New Chama
            </button>
          </div>

          {chamas.length === 0 ? (
            <EmptyState icon="account_balance" title="No Chamas yet" description="Create your first Chama to get started."
              action={{ label: 'Create Chama', onClick: () => setCreateOpen(true) }} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
              {chamas.map(chama => (
                <div key={chama.id} onClick={() => handleSelect(chama)}
                  className="bg-surface-container-lowest border border-outline-variant chama-card p-6 rounded-xl cursor-pointer flex flex-col justify-between h-[280px] hover:shadow-lg hover:border-primary transition-all">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-14 h-14 rounded-lg bg-surface-container flex items-center justify-center overflow-hidden border border-outline-variant">
                        <span className="material-symbols-outlined text-primary text-2xl">account_balance</span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-label-md font-label-md ${
                        chama.status === 'active' ? 'bg-green-100 text-green-800' :
                        chama.status === 'onboarding' ? 'bg-blue-100 text-blue-800' : 'bg-surface-container-high text-on-surface-variant'
                      }`}>{chama.status}</span>
                    </div>
                    <h3 className="font-title-lg text-title-lg text-primary">{chama.name}</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">{chama.description || chama.type}</p>
                  </div>
                  <div className="pt-6 border-t border-outline-variant grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-1">Members</p>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[18px] text-primary">group</span>
                        <span className="font-headline-md text-headline-md text-primary">{chama.memberCount ?? '—'}</span>
                      </div>
                    </div>
                    <div>
                      <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-1">Total Assets</p>
                      <span className="font-headline-md text-headline-md text-primary">{chama.totalAssets || '—'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <NewChamaModal open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={refetch} />
    </>
  );
}
