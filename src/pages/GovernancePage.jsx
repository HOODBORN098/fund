import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import TopNavBar from '../components/TopNavBar';
import { useAuth } from '../context/AuthContext';
import { useApi, useMutation } from '../hooks/useApi';
import { governanceApi } from '../api/client';
import { PageLoader, ErrorBanner, EmptyState, StatusBadge, Modal, toast } from '../components/UI';

function NewMotionModal({ open, onClose, chamaId, onSuccess }) {
  const [form, setForm] = useState({ title: '', description: '', category: 'general', deadline: '' });
  const { mutate, loading, error } = useMutation((d) => governanceApi.create(chamaId, d));
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await mutate(form);
      toast('Motion proposed successfully', 'success');
      onSuccess();
      onClose();
      setForm({ title: '', description: '', category: 'general', deadline: '' });
    } catch (_) {}
  };
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  return (
    <Modal open={open} onClose={onClose} title="Propose New Motion" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-error-container text-on-error-container rounded text-sm">{error}</div>}
        <div>
          <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Motion Title *</label>
          <input className="w-full p-3 border border-outline-variant rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary"
            value={form.title} onChange={f('title')} placeholder="e.g. Increase Monthly Contribution" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Category</label>
            <select className="w-full p-3 border border-outline-variant rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary"
              value={form.category} onChange={f('category')}>
              <option value="general">General</option>
              <option value="financial">Financial</option>
              <option value="welfare">Welfare</option>
              <option value="membership">Membership</option>
              <option value="bylaws">Bylaws Change</option>
            </select>
          </div>
          <div>
            <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Voting Deadline *</label>
            <input className="w-full p-3 border border-outline-variant rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary"
              type="date" value={form.deadline} onChange={f('deadline')} required />
          </div>
        </div>
        <div>
          <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Description *</label>
          <textarea className="w-full p-3 border border-outline-variant rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary"
            rows={4} value={form.description} onChange={f('description')}
            placeholder="Explain the motion in detail for members to make an informed vote…" required />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-outline rounded-lg font-label-md">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-primary text-on-primary rounded-lg font-label-md disabled:opacity-60">
            {loading ? 'Submitting…' : 'Propose Motion'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function VoteModal({ open, onClose, motion, chamaId, onSuccess }) {
  const { mutate, loading, error } = useMutation((d) => governanceApi.vote(chamaId, motion?.id, d));
  const handleVote = async (choice) => {
    try {
      await mutate({ choice });
      toast(`Vote recorded: ${choice}`, 'success');
      onSuccess();
      onClose();
    } catch (_) {}
  };
  return (
    <Modal open={open} onClose={onClose} title="Cast Your Vote">
      {error && <div className="p-3 mb-4 bg-error-container text-on-error-container rounded text-sm">{error}</div>}
      {motion && (
        <div className="mb-6">
          <h4 className="font-title-lg text-title-lg text-primary mb-2">{motion.title}</h4>
          <p className="font-body-md text-body-md text-on-surface-variant">{motion.description}</p>
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={() => handleVote('yes')} disabled={loading}
          className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-title-md hover:opacity-90 disabled:opacity-60">
          Vote Yes
        </button>
        <button onClick={() => handleVote('no')} disabled={loading}
          className="flex-1 py-3 bg-error-container text-error rounded-lg font-title-md hover:opacity-90 disabled:opacity-60">
          Vote No
        </button>
        <button onClick={() => handleVote('abstain')} disabled={loading}
          className="flex-1 py-3 border border-outline text-on-surface rounded-lg font-title-md hover:bg-surface-container disabled:opacity-60">
          Abstain
        </button>
      </div>
    </Modal>
  );
}

export default function GovernancePage() {
  const { activeChama, isAdmin } = useAuth();
  const chamaId = activeChama?.id || activeChama?._id;
  const [motionOpen, setMotionOpen] = useState(false);
  const [voteTarget, setVoteTarget] = useState(null);

  const { data, loading, error, refetch } = useApi(
    () => governanceApi.proposals(chamaId),
    [chamaId]
  );

  if (loading) return <><Sidebar /><main className="ml-[260px] min-h-screen"><TopNavBar showSearch={true} /><PageLoader /></main></>;
  if (error)   return <><Sidebar /><main className="ml-[260px] min-h-screen"><TopNavBar /><div className="p-8"><ErrorBanner message={error} onRetry={refetch} /></div></main></>;

  const stats   = data?.stats   || {};
  const active  = data?.active  || [];
  const history = data?.history || [];

  return (
    <>
      <Sidebar />
      <main className="ml-[260px] min-h-screen">
        <TopNavBar showSearch={true} searchPlaceholder="Search proposals…" />
        <div className="px-margin-desktop py-stack-lg max-w-container-max mx-auto">

          <div className="flex items-end justify-between mb-stack-xl">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-primary">Governance Portal</h2>
              <p className="font-body-lg text-body-lg text-outline">Decision-making and proposal tracking for {activeChama?.name || 'your group'}.</p>
            </div>
            <button onClick={() => setMotionOpen(true)} className="flex items-center gap-2 bg-secondary-container text-on-secondary-container px-6 py-3 rounded-lg font-title-md hover:opacity-90 transition-all shadow-sm active:scale-95">
              <span className="material-symbols-outlined">add</span> Propose New Motion
            </button>
          </div>

          <div className="grid grid-cols-12 gap-gutter mb-stack-xl">
            <div className="col-span-12 lg:col-span-4 grid grid-cols-1 gap-gutter">
              {[
                { label: 'Quorum Requirement', value: stats.quorum || '—', icon: 'groups' },
                { label: 'Eligible Voters', value: stats.eligibleVoters || '—', icon: 'person' },
                { label: 'Avg. Participation', value: stats.avgParticipation || '—', icon: 'analytics', bar: stats.avgParticipationPercent },
              ].map((s, i) => (
                <div key={i} className="bg-white border border-outline-variant rounded-xl p-stack-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-label-md text-label-md text-outline uppercase">{s.label}</span>
                    <span className="material-symbols-outlined text-primary opacity-40">{s.icon}</span>
                  </div>
                  <div className="font-headline-lg text-headline-lg text-primary">{s.value}</div>
                  {s.bar !== undefined && (
                    <div className="w-full bg-surface-container-high h-2 rounded-full mt-4 overflow-hidden">
                      <div className="bg-secondary-container h-full" style={{ width: `${s.bar}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Active Motions */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-gutter">
              <div className="flex items-center justify-between">
                <h3 className="font-title-lg text-title-lg text-primary">Active Motions</h3>
              </div>
              {active.length === 0 ? (
                <EmptyState icon="how_to_vote" title="No active motions" description="Be the first to propose a motion."
                  action={{ label: 'Propose Motion', onClick: () => setMotionOpen(true) }} />
              ) : active.map((motion) => (
                <div key={motion.id} className="bg-white border border-outline-variant rounded-xl p-stack-lg hover:border-primary transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="inline-flex items-center px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed font-label-md text-label-md mb-2">
                        {motion.timeRemaining}
                      </div>
                      <h4 className="font-title-lg text-title-lg text-primary group-hover:text-primary transition-colors">{motion.title}</h4>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined">{motion.icon || 'description'}</span>
                    </div>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-6 line-clamp-2">{motion.description}</p>
                  <div className="flex items-center justify-between pt-6 border-t border-outline-variant">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-fixed flex items-center justify-center font-bold text-xs">
                        {(motion.proposerName || '?').slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-body-sm text-body-sm font-semibold">{motion.proposerName}</p>
                        <p className="font-label-md text-label-md text-outline">Proposer • {motion.proposedDate}</p>
                      </div>
                    </div>
                    {motion.hasVoted ? (
                      <StatusBadge status="Voted" />
                    ) : (
                      <button onClick={() => setVoteTarget(motion)} className="bg-primary text-on-primary px-5 py-2 rounded font-title-md hover:bg-primary-container transition-all active:scale-95">
                        Vote Now
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* History */}
          <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            <div className="px-stack-lg py-stack-md border-b border-outline-variant flex items-center justify-between">
              <h3 className="font-title-lg text-title-lg text-primary">Past Motions & Results</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface text-outline font-label-md text-label-md uppercase">
                  <tr>
                    {['Motion ID & Title','Date Finalized','Tally (Yes/No)','Quorum','Status'].map(h => (
                      <th key={h} className="px-stack-lg py-4 font-semibold tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {history.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">No past motions yet.</td></tr>
                  ) : history.map((m, i) => (
                    <tr key={m.id || i} className="hover:bg-surface transition-colors cursor-default">
                      <td className="px-stack-lg py-5">
                        <p className="font-title-md text-title-md text-primary">{m.title}</p>
                        <p className="font-body-sm text-body-sm text-outline">{m.proposedBy}</p>
                      </td>
                      <td className="px-stack-lg py-5 font-body-sm text-body-sm text-on-surface">{m.finalizedDate}</td>
                      <td className="px-stack-lg py-5">
                        <div className="flex items-center gap-2 w-32">
                          <div className="flex-1 h-2 bg-error-container rounded-full overflow-hidden flex">
                            <div className="bg-secondary-container h-full" style={{ width: `${m.yesPercent}%` }} />
                          </div>
                          <span className="font-code-md text-code-md text-primary">{m.yesPercent}/{100 - m.yesPercent}</span>
                        </div>
                      </td>
                      <td className="px-stack-lg py-5 font-body-sm text-body-sm text-on-surface">{m.quorumMet}</td>
                      <td className="px-stack-lg py-5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${m.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {m.passed ? 'Passed' : 'Failed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <NewMotionModal open={motionOpen} onClose={() => setMotionOpen(false)} chamaId={chamaId} onSuccess={refetch} />
      <VoteModal open={!!voteTarget} onClose={() => setVoteTarget(null)} motion={voteTarget} chamaId={chamaId} onSuccess={refetch} />
    </>
  );
}
