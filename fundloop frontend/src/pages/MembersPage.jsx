import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import TopNavBar from '../components/TopNavBar';
import { useAuth } from '../context/AuthContext';
import { useApi, useMutation } from '../hooks/useApi';
import { membersApi } from '../api/client';
import { PageLoader, ErrorBanner, EmptyState, StatusBadge, Modal, toast, inputCls } from '../components/UI';

function InviteModal({ open, onClose, chamaId, onSuccess }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'member' });
  const { mutate, loading, error } = useMutation((d) => membersApi.invite(chamaId, d));
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await mutate(form);
      toast('Invitation sent', 'success');
      onSuccess(); onClose();
      setForm({ name: '', email: '', phone: '', role: 'member' });
    } catch (_) {}
  };
  return (
    <Modal open={open} onClose={onClose} title="Invite New Member">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-error-container text-on-error-container rounded text-sm">{error}</div>}
        <input className={inputCls} placeholder="Full Name" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} required />
        <input className={inputCls} placeholder="Email Address" type="email" value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} required />
        <input className={inputCls} placeholder="Phone Number (07XXXXXXXX)" value={form.phone} onChange={e => setForm(p=>({...p,phone:e.target.value}))} required />
        <select className={inputCls} value={form.role} onChange={e => setForm(p=>({...p,role:e.target.value}))}>
          <option value="member">Member</option>
          <option value="treasurer">Treasurer</option>
          <option value="secretary">Secretary</option>
          <option value="chairman">Chairman</option>
        </select>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-outline rounded-lg font-label-md">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-primary text-on-primary rounded-lg font-label-md disabled:opacity-60">
            {loading ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function MembersPage() {
  const { activeChama, isAdmin, canManageMembers } = useAuth();
  const chamaId = activeChama?.id || activeChama?._id;
  const [inviteOpen, setInviteOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, loading, error, refetch } = useApi(() => membersApi.list(chamaId), [chamaId]);
  const { mutate: approveMember } = useMutation((id) => membersApi.approve(chamaId, id));
  const { mutate: suspendMember } = useMutation((id) => membersApi.suspend(chamaId, id));
  const { mutate: removeMember }  = useMutation((id) => membersApi.remove(chamaId, id));

  const handleApprove = async (id) => { try { await approveMember(id); toast('Member approved', 'success'); refetch(); } catch (e) { toast(e.message, 'error'); } };
  const handleSuspend = async (id) => { try { await suspendMember(id); toast('Member suspended', 'info'); refetch(); } catch (e) { toast(e.message, 'error'); } };
  const handleRemove  = async (id) => { try { await removeMember(id);  toast('Member removed', 'info'); refetch(); } catch (e) { toast(e.message, 'error'); } };

  if (loading) return <><Sidebar /><main className="ml-[260px] min-h-screen"><TopNavBar showSearch={true} /><PageLoader /></main></>;
  if (error)   return <><Sidebar /><main className="ml-[260px] min-h-screen"><TopNavBar /><div className="p-8"><ErrorBanner message={error} onRetry={refetch} /></div></main></>;

  let members = data?.members || data || [];
  if (search) members = members.filter(m => m.name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase()));
  if (statusFilter !== 'all') members = members.filter(m => m.status === statusFilter);

  return (
    <>
      <Sidebar />
      <main className="ml-[260px] min-h-screen">
        <TopNavBar showSearch={false} />
        <div className="px-margin-desktop py-stack-lg max-w-container-max mx-auto space-y-stack-lg">

          <div className="flex justify-between items-end">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-primary">Members</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">Manage {activeChama?.name || 'your Chama'}'s membership roster.</p>
            </div>
            {isAdmin && (
              <button onClick={() => setInviteOpen(true)} className="flex items-center gap-2 px-stack-lg py-3 bg-primary text-on-primary font-title-md rounded-lg hover:opacity-90 transition-all shadow-sm">
                <span className="material-symbols-outlined">person_add</span> Invite Member
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-3 flex items-center text-outline">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </span>
              <input className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg outline-none focus:ring-2 focus:ring-primary"
                placeholder="Search members…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2">
              {['all','active','pending','suspended'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize ${statusFilter === s ? 'bg-primary text-on-primary' : 'border border-outline-variant hover:bg-surface-container'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            {members.length === 0 ? (
              <EmptyState icon="groups" title="No members found" description="Try adjusting your search or filters."
                action={isAdmin ? { label: 'Invite Member', onClick: () => setInviteOpen(true) } : undefined} />
            ) : (
              <table className="w-full text-left">
                <thead className="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    {['Member','Role','Joined','Status', canManageMembers ? 'Actions' : null].filter(Boolean).map(h => (
                      <th key={h} className="px-6 py-4 font-label-md text-label-md text-outline uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {members.map(m => (
                    <tr key={m.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center font-bold text-primary text-xs">
                            {(m.name || '?').slice(0,2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-title-md text-title-md text-primary">{m.name}</p>
                            <p className="font-body-sm text-body-sm text-outline">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-body-md text-body-md capitalize">{m.role}</td>
                      <td className="px-6 py-4 font-body-md text-body-md">{m.joinedDate || '—'}</td>
                      <td className="px-6 py-4"><StatusBadge status={m.status} /></td>
                      {canManageMembers && (
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {m.status === 'pending' && (
                              <button onClick={() => handleApprove(m.id)} className="text-xs font-bold text-primary hover:underline">Approve</button>
                            )}
                            {m.status === 'active' && (
                              <button onClick={() => handleSuspend(m.id)} className="text-xs font-bold text-secondary hover:underline">Suspend</button>
                            )}
                            <button onClick={() => handleRemove(m.id)} className="text-xs font-bold text-error hover:underline">Remove</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} chamaId={chamaId} onSuccess={refetch} />
    </>
  );
}
