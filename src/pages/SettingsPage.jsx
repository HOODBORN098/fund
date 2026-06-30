import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import TopNavBar from '../components/TopNavBar';
import { useAuth } from '../context/AuthContext';
import { useApi, useMutation } from '../hooks/useApi';
import { settingsApi, membersApi } from '../api/client';
import { PageLoader, ErrorBanner, EmptyState, Modal, toast, inputCls } from '../components/UI';

const TABS = ['general', 'membership', 'financial', 'security', 'notifications'];

function InviteMemberModal({ open, onClose, chamaId, onSuccess }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'member' });
  const { mutate, loading, error } = useMutation((d) => membersApi.invite(chamaId, d));
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await mutate(form);
      toast('Invitation sent', 'success');
      onSuccess();
      onClose();
      setForm({ name: '', email: '', phone: '', role: 'member' });
    } catch (_) {}
  };
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  return (
    <Modal open={open} onClose={onClose} title="Invite Member">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-error-container text-on-error-container rounded text-sm">{error}</div>}
        <input className={inputCls} placeholder="Full Name" value={form.name} onChange={f('name')} required />
        <input className={inputCls} placeholder="Email Address" type="email" value={form.email} onChange={f('email')} required />
        <input className={inputCls} placeholder="Phone Number (07XXXXXXXX)" value={form.phone} onChange={f('phone')} required />
        <select className={inputCls} value={form.role} onChange={f('role')}>
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

export default function SettingsPage() {
  const { activeChama, isAdmin } = useAuth();
  const chamaId = activeChama?.id || activeChama?._id;
  const [activeTab, setActiveTab] = useState('general');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [dirty, setDirty] = useState(false);

  const { data: settings, loading, error, refetch } = useApi(() => settingsApi.get(chamaId), [chamaId]);
  const { data: membersData, refetch: refetchMembers } = useApi(() => membersApi.list(chamaId), [chamaId]);
  const { mutate: saveSettings, loading: saving } = useMutation((d) => settingsApi.update(chamaId, d));
  const { mutate: removeMember } = useMutation((id) => membersApi.remove(chamaId, id));
  const { mutate: suspendMember } = useMutation((id) => membersApi.suspend(chamaId, id));

  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings]);

  const update = (path, value) => {
    setForm(prev => {
      const next = { ...prev };
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...(obj[keys[i]] || {}) };
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return next;
    });
    setDirty(true);
  };

  const getVal = (path, fallback = '') => {
    if (!form) return fallback;
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), form) ?? fallback;
  };

  const handleSave = async () => {
    try {
      await saveSettings(form);
      toast('Settings saved successfully', 'success');
      setDirty(false);
      refetch();
    } catch (e) { toast(e.message, 'error'); }
  };

  const handleDiscard = () => { setForm(settings); setDirty(false); };

  const handleRemoveMember = async (id) => {
    try { await removeMember(id); toast('Member removed', 'info'); refetchMembers(); } catch (e) { toast(e.message, 'error'); }
  };
  const handleSuspendMember = async (id) => {
    try { await suspendMember(id); toast('Member suspended', 'info'); refetchMembers(); } catch (e) { toast(e.message, 'error'); }
  };

  const tabBtnClass = (tab) =>
    tab === activeTab
      ? 'w-full flex items-center gap-3 px-4 py-3 rounded text-left transition-all bg-surface-container-high border-l-4 border-secondary text-primary font-title-md text-title-md'
      : 'w-full flex items-center gap-3 px-4 py-3 rounded text-left transition-all hover:bg-surface-container text-on-surface-variant font-title-md text-title-md';

  if (loading || !form) return <><Sidebar /><main className="ml-[260px] min-h-screen"><TopNavBar /><PageLoader /></main></>;
  if (error)             return <><Sidebar /><main className="ml-[260px] min-h-screen"><TopNavBar /><div className="p-8"><ErrorBanner message={error} onRetry={refetch} /></div></main></>;

  const members = membersData?.members || membersData || [];

  return (
    <>
      <Sidebar />
      <main className="ml-[260px] min-h-screen">
        <TopNavBar showSearch={true} searchPlaceholder="Search settings, members, or rules…" />

        <div className="max-w-container-max mx-auto px-margin-desktop py-stack-xl">
          <div className="mb-stack-xl flex justify-between items-end">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-primary">Platform Settings</h2>
              <p className="font-body-lg text-body-lg text-outline mt-2">Manage your Chama's identity, governance structure, and financial protocols.</p>
            </div>
            <div className="flex gap-4">
              <button onClick={handleDiscard} disabled={!dirty}
                className="px-6 py-2 border border-outline text-on-surface font-title-md rounded hover:bg-surface-container transition-colors disabled:opacity-40">
                Discard
              </button>
              <button onClick={handleSave} disabled={!dirty || saving}
                className="px-8 py-2 bg-primary text-on-primary font-title-md rounded hover:brightness-110 transition-all shadow-sm disabled:opacity-50">
                {saving ? 'Saving…' : 'Save All Changes'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-gutter">
            <aside className="col-span-3 space-y-stack-sm">
              {TABS.map(tab => (
                <button key={tab} className={tabBtnClass(tab)} onClick={() => setActiveTab(tab)}>
                  <span className="material-symbols-outlined">
                    {{ general: 'info', membership: 'groups', financial: 'monetization_on', security: 'security', notifications: 'notifications_active' }[tab]}
                  </span>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}{tab === 'general' ? ' Info' : tab === 'financial' ? ' Rules' : ''}
                </button>
              ))}
            </aside>

            <div className="col-span-9 space-y-gutter">

              {activeTab === 'general' && (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg">
                  <h3 className="font-title-lg text-title-lg text-primary mb-stack-md">General Identity</h3>
                  <div className="grid grid-cols-2 gap-stack-lg">
                    <div className="space-y-1">
                      <label className="font-label-md text-label-md text-outline uppercase">Chama Name</label>
                      <input className={inputCls} value={getVal('general.name')} onChange={e => update('general.name', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="font-label-md text-label-md text-outline uppercase">Entity Type</label>
                      <select className={inputCls} value={getVal('general.entityType')} onChange={e => update('general.entityType', e.target.value)}>
                        <option value="rosca">Investment Club (ROSCA)</option>
                        <option value="family">Family Savings Fund</option>
                        <option value="cooperative">Business Cooperative</option>
                      </select>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="font-label-md text-label-md text-outline uppercase">Mission Statement</label>
                      <textarea className={inputCls} rows="3" value={getVal('general.mission')} onChange={e => update('general.mission', e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'membership' && (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg">
                  <div className="flex justify-between items-center mb-stack-md">
                    <h3 className="font-title-lg text-title-lg text-primary">Membership & Roles</h3>
                    {isAdmin && (
                      <button onClick={() => setInviteOpen(true)} className="bg-primary text-on-primary px-4 py-2 rounded font-title-md flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">person_add</span> Invite Member
                      </button>
                    )}
                  </div>
                  {members.length === 0 ? (
                    <EmptyState icon="groups" title="No members yet" description="Invite your first member to get started."
                      action={isAdmin ? { label: 'Invite Member', onClick: () => setInviteOpen(true) } : undefined} />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-surface border-b border-outline-variant">
                          <tr>
                            <th className="px-4 py-3 font-label-md text-label-md text-outline uppercase">Member</th>
                            <th className="px-4 py-3 font-label-md text-label-md text-outline uppercase">Role</th>
                            <th className="px-4 py-3 font-label-md text-label-md text-outline uppercase">Status</th>
                            {isAdmin && <th className="px-4 py-3 font-label-md text-label-md text-outline uppercase text-right">Actions</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/30">
                          {members.map(m => (
                            <tr key={m.id} className="hover:bg-surface-container-low transition-colors">
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                                    {(m.name || '?').slice(0,2).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-title-md text-title-md">{m.name}</p>
                                    <p className="font-body-sm text-body-sm text-outline">{m.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span className="px-2 py-1 text-[11px] font-bold rounded uppercase bg-secondary-container/20 text-on-secondary-container">{m.role}</span>
                              </td>
                              <td className="px-4 py-4">
                                <span className={`flex items-center gap-1.5 text-xs font-bold ${m.status === 'active' ? 'text-green-600' : 'text-outline'}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${m.status === 'active' ? 'bg-green-600' : 'bg-outline'}`} /> {m.status}
                                </span>
                              </td>
                              {isAdmin && (
                                <td className="px-4 py-4 text-right">
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => handleSuspendMember(m.id)} className="text-xs font-bold text-secondary hover:underline">Suspend</button>
                                    <button onClick={() => handleRemoveMember(m.id)} className="text-xs font-bold text-error hover:underline">Remove</button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'financial' && (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg">
                  <h3 className="font-title-lg text-title-lg text-primary mb-stack-md">Financial Governance</h3>
                  <div className="grid grid-cols-2 gap-stack-lg">
                    <div className="space-y-4">
                      <h4 className="font-label-md text-label-md text-secondary uppercase tracking-widest border-b border-outline-variant pb-2">ROSCA Protocol</h4>
                      <div className="space-y-1">
                        <label className="font-body-md text-body-md font-medium">Monthly Contribution (KES)</label>
                        <input className={inputCls} type="number" value={getVal('financial.monthlyContribution')} onChange={e => update('financial.monthlyContribution', Number(e.target.value))} />
                      </div>
                      <div className="space-y-1">
                        <label className="font-body-md text-body-md font-medium">Cycle Frequency</label>
                        <select className={inputCls} value={getVal('financial.cycleFrequency')} onChange={e => update('financial.cycleFrequency', e.target.value)}>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-label-md text-label-md text-secondary uppercase tracking-widest border-b border-outline-variant pb-2">Penalties & Welfare</h4>
                      <div className="space-y-1">
                        <label className="font-body-md text-body-md font-medium">Missed Contribution Fine (KES)</label>
                        <input className={inputCls} type="number" value={getVal('financial.fineAmount')} onChange={e => update('financial.fineAmount', Number(e.target.value))} />
                        <p className="font-body-sm text-body-sm text-on-surface-variant">Applied per BR-ROSCA-004 when a member misses their contribution deadline.</p>
                      </div>
                      <div className="space-y-1">
                        <label className="font-body-md text-body-md font-medium">Welfare Max Claim (% of pool)</label>
                        <input className={inputCls} type="number" step="1" value={getVal('financial.welfareMaxClaimPercent')} onChange={e => update('financial.welfareMaxClaimPercent', Number(e.target.value))} />
                        <p className="font-body-sm text-body-sm text-on-surface-variant">Platform-wide cap is 30% (BR-WEL-003); set at or below that here.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg">
                  <h3 className="font-title-lg text-title-lg text-primary mb-stack-md">Security & Visibility</h3>
                  <div className="space-y-stack-md">
                    {[
                      { key: 'security.twoFactor',   icon: 'vibration',  label: 'Two-Factor Authentication (2FA)', desc: 'Require a secondary code for all major transactions and login.' },
                      { key: 'security.publicVisible',icon: 'visibility', label: 'Public Visibility', desc: 'Allow non-members to see basic Chama stats and mission.' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between p-4 bg-surface-container-low rounded">
                        <div className="flex items-center gap-4">
                          <span className="material-symbols-outlined text-primary text-3xl">{item.icon}</span>
                          <div>
                            <p className="font-title-md text-title-md">{item.label}</p>
                            <p className="font-body-sm text-body-sm text-outline">{item.desc}</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            checked={!!getVal(item.key, false)}
                            onChange={e => update(item.key, e.target.checked)}
                            className="sr-only peer" type="checkbox"
                          />
                          <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg">
                  <h3 className="font-title-lg text-title-lg text-primary mb-stack-md">Alert Configurations</h3>
                  <div className="grid grid-cols-2 gap-gutter">
                    <div className="space-y-stack-md">
                      <h4 className="font-label-md text-label-md text-outline uppercase">Transaction Alerts</h4>
                      {[
                        { key: 'notifications.email', label: 'Email Notifications' },
                        { key: 'notifications.sms',   label: 'SMS Notifications' },
                      ].map(item => (
                        <div key={item.key} className="flex items-center gap-3">
                          <input
                            checked={!!getVal(item.key, false)}
                            onChange={e => update(item.key, e.target.checked)}
                            className="w-4 h-4 text-primary focus:ring-primary border-outline-variant rounded" type="checkbox"
                          />
                          <span className="font-body-md text-body-md">{item.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-stack-md">
                      <h4 className="font-label-md text-label-md text-outline uppercase">Governance Alerts</h4>
                      {[
                        { key: 'notifications.meetingReminders', label: 'Meeting Reminders' },
                        { key: 'notifications.votingOpened',     label: 'Voting Period Opened' },
                      ].map(item => (
                        <div key={item.key} className="flex items-center gap-3">
                          <input
                            checked={!!getVal(item.key, false)}
                            onChange={e => update(item.key, e.target.checked)}
                            className="w-4 h-4 text-primary focus:ring-primary border-outline-variant rounded" type="checkbox"
                          />
                          <span className="font-body-md text-body-md">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <InviteMemberModal open={inviteOpen} onClose={() => setInviteOpen(false)} chamaId={chamaId} onSuccess={refetchMembers} />
    </>
  );
}
