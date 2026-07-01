import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import TopNavBar from '../components/TopNavBar';
import { useAuth } from '../context/AuthContext';
import { useApi, useMutation } from '../hooks/useApi';
import { welfareApi } from '../api/client';
import { PageLoader, ErrorBanner, EmptyState, StatusBadge, Modal, toast } from '../components/UI';

function NewClaimModal({ open, onClose, chamaId, onSuccess }) {
  const [form, setForm] = useState({ type: '', amount: '', description: '', supporting: '' });
  const { mutate, loading, error } = useMutation((d) => welfareApi.submit(chamaId, d));
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await mutate({ 
        type: form.type, 
        amount: Number(form.amount), 
        description: form.description, 
        evidenceUrls: form.supporting ? [form.supporting] : []
      });
      toast('Welfare claim submitted for review', 'success');
      onSuccess();
      onClose();
      setForm({ type: '', amount: '', description: '', supporting: '' });
    } catch (_) {}
  };
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setForm(p => ({ ...p, supporting: reader.result }));
      reader.readAsDataURL(file);
    } else {
      setForm(p => ({ ...p, supporting: '' }));
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Submit Welfare Claim" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-error-container text-on-error-container rounded text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Emergency Type *</label>
            <select className="w-full p-3 border border-outline-variant rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary"
              value={form.type} onChange={f('type')} required>
              <option value="">Select type…</option>
              <option value="medical">Medical Emergency</option>
              <option value="funeral">Funeral Support</option>
              <option value="disaster">Natural Disaster</option>
              <option value="other">Other Critical Need</option>
            </select>
          </div>
          <div>
            <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Requested Amount (KES) *</label>
            <input className="w-full p-3 border border-outline-variant rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary"
              type="number" min="1" value={form.amount} onChange={f('amount')} placeholder="0.00" required />
          </div>
        </div>
        <div>
          <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Description of Need *</label>
          <textarea className="w-full p-3 border border-outline-variant rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary"
            rows={4} value={form.description} onChange={f('description')}
            placeholder="Provide detailed context for the welfare committee…" required />
        </div>
        <div>
          <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Supporting Document (Image) *</label>
          <input className="w-full p-2 border border-outline-variant rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-on-primary hover:file:bg-primary/90"
            type="file" accept="image/*" onChange={handleFileChange} required />
          {form.supporting && <img src={form.supporting} alt="Preview" className="mt-2 h-20 w-auto rounded object-cover" />}
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-outline rounded-lg font-label-md">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-primary text-on-primary rounded-lg font-label-md disabled:opacity-60">
            {loading ? 'Submitting…' : 'Submit Claim'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function WelfarePage() {
  const { activeChama, user, isTreasurer, isAdminRole, canVetoClaim } = useAuth();
  const chamaId = activeChama?.id || activeChama?._id;
  const [claimOpen, setClaimOpen] = useState(false);

  const { data, loading, error, refetch } = useApi(
    () => Promise.all([welfareApi.claims(chamaId), welfareApi.balance(chamaId)])
            .then(([claimsRes, bal]) => ({ claims: claimsRes.claims ?? claimsRes, balance: bal })),
    [chamaId]
  );

  const { mutate: castVote }     = useMutation((id, choice) => welfareApi.vote(chamaId, id, { choice }));
  const { mutate: disburseClaim } = useMutation((id) => welfareApi.approve(chamaId, id));
  const { mutate: rejectClaim }   = useMutation((id) => welfareApi.reject(chamaId, id, {}));

  const handleVote = async (id, choice) => {
    try { await castVote(id, choice); toast(`Vote recorded: ${choice}`, 'success'); refetch(); } catch (e) { toast(e.message, 'error'); }
  };
  // BR-WEL-004: requires 70% approval vote — disbursement only fires once
  // threshold is met, and only Treasurer/Admin can trigger the Finance
  // Domain transfer (BR-FIN-004, WF-WEL-003).
  const handleDisburse = async (id) => {
    try { await disburseClaim(id); toast('Claim approved and disbursed', 'success'); refetch(); } catch (e) { toast(e.message, 'error'); }
  };
  // BR-GOV-002: Chairman can veto regardless of vote tally.
  const handleVeto = async (id) => {
    try { await rejectClaim(id); toast('Claim rejected', 'info'); refetch(); } catch (e) { toast(e.message, 'error'); }
  };

  if (loading) return <><Sidebar /><main className="ml-[260px] min-h-screen"><TopNavBar showSearch={true} searchPlaceholder="Search claims…" showSwitch={true} /><PageLoader /></main></>;
  if (error)   return <><Sidebar /><main className="ml-[260px] min-h-screen"><TopNavBar /><div className="p-8"><ErrorBanner message={error} onRetry={refetch} /></div></main></>;

  const claims  = data?.claims  || [];
  const balance = data?.balance || {};

  return (
    <>
      <Sidebar />
      <main className="ml-[260px] min-h-screen">
        <TopNavBar showSearch={true} searchPlaceholder="Search claims or documents…" showSwitch={true} />
        <div className="px-margin-desktop py-stack-lg max-w-container-max mx-auto">

          <div className="flex justify-between items-end mb-stack-lg">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-primary">Welfare Fund</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">Manage and monitor emergency relief claims for your group members.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-lg border border-outline-variant bg-surface-container-lowest flex items-center gap-4 min-w-[200px]">
                <div className="w-10 h-10 bg-primary-container/20 rounded-full flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">payments</span>
                </div>
                <div>
                  <p className="font-label-md text-label-md text-outline">POOL BALANCE</p>
                  <p className="font-title-lg text-title-lg text-primary">{balance.amount || '—'}</p>
                </div>
              </div>
              <button onClick={() => setClaimOpen(true)} className="px-6 py-3 bg-primary text-on-primary rounded-lg font-title-md hover:opacity-90 transition-all shadow-sm">
                + New Claim
              </button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-gutter">
            {/* Claims Table */}
            <section className="col-span-12 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
              <div className="p-stack-lg border-b border-outline-variant flex items-center justify-between">
                <h3 className="font-title-lg text-title-lg text-primary">Claims Register</h3>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-on-surface-variant">Fund Capacity:</span>
                  <div className="w-32 h-2 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${balance.capacityPercent || 0}%` }} />
                  </div>
                  <span className="font-bold text-primary">{balance.capacityPercent || 0}%</span>
                </div>
              </div>

              {claims.length === 0 ? (
                <EmptyState icon="health_and_safety" title="No welfare claims"
                  description="No claims have been submitted yet."
                  action={{ label: 'Submit First Claim', onClick: () => setClaimOpen(true) }} />
              ) : (
                <div className="divide-y divide-outline-variant">
                  {claims.map((claim, i) => (
                    <div key={claim.id || i} className="p-stack-lg flex items-start gap-4 hover:bg-surface-container-low transition-colors">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        claim.type === 'medical' ? 'bg-red-100 text-red-600' :
                        claim.type === 'funeral' ? 'bg-gray-100 text-gray-600' :
                        'bg-orange-100 text-orange-600'
                      }`}>
                        <span className="material-symbols-outlined text-[20px]">{
                          claim.type === 'medical' ? 'local_hospital' :
                          claim.type === 'funeral' ? 'church' : 'emergency'
                        }</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-title-md text-title-md text-primary">{claim.memberName}</p>
                            <p className="font-body-sm text-body-sm text-on-surface-variant capitalize">{claim.type?.replace('_', ' ')} • {new Date(claim.submittedAt).toLocaleDateString()}</p>
                            <p className="font-body-md text-body-md text-on-surface mt-1">{claim.description}</p>
                            {claim.evidenceUrls?.length > 0 && (
                              <div className="mt-2 flex gap-2">
                                {claim.evidenceUrls.map((url, idx) => (
                                  <img key={idx} src={url} alt="Evidence" className="h-16 w-16 object-cover rounded border border-outline-variant" />
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <p className="font-title-lg text-title-lg text-primary">KES {claim.amount}</p>
                            <StatusBadge status={claim.status} />
                          </div>
                        </div>
                        {claim.status === 'pending' && (() => {
                          const required = claim.requiredApproval ?? 0.7; // BR-WEL-004
                          const approvalRate = claim.approvalRate ?? 0;
                          const thresholdMet = approvalRate >= required;
                          return (
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                                  <div className="h-full bg-primary" style={{ width: `${Math.round(approvalRate * 100)}%` }} />
                                </div>
                                <span className="font-label-md text-label-md text-outline whitespace-nowrap">
                                  {Math.round(approvalRate * 100)}% of {Math.round(required * 100)}% needed
                                </span>
                              </div>
                              <div className="flex gap-2 items-center flex-wrap">
                                {claim.hasVoted ? (
                                  <StatusBadge status="Voted" />
                                ) : claim.claimantId !== user?.id && (
                                  <>
                                    <button onClick={() => handleVote(claim.id, 'approve')} className="px-4 py-1.5 bg-primary text-on-primary rounded font-label-md text-sm hover:opacity-90">
                                      Vote Approve
                                    </button>
                                    <button onClick={() => handleVote(claim.id, 'reject')} className="px-4 py-1.5 border border-outline text-on-surface rounded font-label-md text-sm hover:bg-surface-container">
                                      Vote Reject
                                    </button>
                                  </>
                                )}
                                {(isTreasurer || isAdminRole) && thresholdMet && (
                                  <button onClick={() => handleDisburse(claim.id)} className="px-4 py-1.5 bg-primary text-on-primary rounded font-label-md text-sm hover:opacity-90">
                                    Disburse Funds
                                  </button>
                                )}
                                {canVetoClaim && (
                                  <button onClick={() => handleVeto(claim.id)} className="px-4 py-1.5 bg-error-container text-error rounded font-label-md text-sm hover:opacity-90">
                                    Veto / Reject
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <NewClaimModal open={claimOpen} onClose={() => setClaimOpen(false)} chamaId={chamaId} onSuccess={refetch} />
    </>
  );
}
