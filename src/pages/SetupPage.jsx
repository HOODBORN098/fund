import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNavBar from '../components/TopNavBar';
import { useAuth } from '../context/AuthContext';
import { useMutation } from '../hooks/useApi';
import { chamaApi, authApi } from '../api/client';
import { toast, inputCls } from '../components/UI';

// Scope: FundLoop currently supports ROSCA chamas only (see BR-ROSCA-*, WF-ROS-*).
// Welfare is a built-in module of every chama (BR-WEL-*), not a separate chama type —
// every ROSCA chama gets a welfare pool automatically.
const STEPS = ['Account Details', 'Chama Setup', 'Review'];

const ROTATION_METHODS = [
  { id: 'fixed_order', label: 'Fixed Order', desc: 'Members receive payouts in a pre-set sequence.' },
  { id: 'lottery',     label: 'Lottery',     desc: 'Each cycle\u2019s recipient is drawn at random.' },
];

const MISSED_CONTRIBUTION_PENALTIES = [
  { id: 'fine',         label: 'Fine',                desc: 'Flat fine charged to chama penalty pool.' },
  { id: 'double_next',  label: 'Double Next Cycle',   desc: 'Member must pay double on their next contribution.' },
  { id: 'skip_turn',    label: 'Skip Turn',           desc: 'Member loses their rotation slot for this cycle.' },
];

export default function SetupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  const [account, setAccount] = useState({ name: '', email: '', phone: '', password: '' });

  const [chamaDetails, setChamaDetails] = useState({
    name: '',
    memberCount: '',
    contributionAmount: '',
    cycleFrequency: 'monthly',     // weekly | monthly
    rotationMethod: 'fixed_order', // BR-ROSCA-003
    missedContributionPenalty: 'fine', // BR-ROSCA-004
    fineAmount: '',
    swapApprovalThreshold: 66,     // BR-ROSCA-006: 2/3 majority, fixed by rule
    welfareApprovalThreshold: 70,  // BR-WEL-004: fixed by rule
    welfareMaxClaimPercent: 30,    // BR-WEL-003: fixed by rule
  });

  const { mutate: registerUser, loading: registering } = useMutation(authApi.register);
  const { mutate: createChama, loading: creatingChama } = useMutation(chamaApi.create);

  const canProceed = () => {
    if (step === 1) return account.name && account.email && account.phone && account.password.length >= 6;
    if (step === 2) {
      const baseValid = chamaDetails.name && chamaDetails.contributionAmount && chamaDetails.memberCount;
      const penaltyValid = chamaDetails.missedContributionPenalty !== 'fine' || chamaDetails.fineAmount;
      return baseValid && penaltyValid;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (!canProceed()) {
      setError('Please complete all required fields before continuing.');
      return;
    }
    setStep(s => Math.min(STEPS.length, s + 1));
  };

  const handleBack = () => setStep(s => Math.max(1, s - 1));

  const handleFinish = async () => {
    setError('');
    try {
      await registerUser(account);
      await login({ identifier: account.email, password: account.password });

      await createChama({
        type: 'rosca',
        name: chamaDetails.name,
        targetMemberCount: Number(chamaDetails.memberCount),
        rules: {
          contributionAmount: Number(chamaDetails.contributionAmount),
          cycleFrequency: chamaDetails.cycleFrequency,
          rotationMethod: chamaDetails.rotationMethod,
          missedContributionPenalty: chamaDetails.missedContributionPenalty,
          fineAmount: chamaDetails.fineAmount ? Number(chamaDetails.fineAmount) : undefined,
          swapApprovalThreshold: chamaDetails.swapApprovalThreshold,
          welfareApprovalThreshold: chamaDetails.welfareApprovalThreshold,
          welfareMaxClaimPercent: chamaDetails.welfareMaxClaimPercent,
        },
      });

      toast('Chama created successfully!', 'success');
      navigate('/dashboard/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    }
  };

  const loading = registering || creatingChama;
  const f = (setter) => (key) => (e) => setter(p => ({ ...p, [key]: e.target.value }));
  const fc = f(setChamaDetails);
  const fa = f(setAccount);

  return (
    <>
      <TopNavBar />
      <main className="flex-grow flex flex-col items-center py-stack-xl px-margin-desktop">

        {/* Progress */}
        <div className="w-full max-w-4xl mb-stack-xl">
          <div className="flex justify-between items-center mb-stack-sm">
            <span className="font-label-md text-label-md text-primary uppercase tracking-widest">Step {step} of {STEPS.length}</span>
            <span className="font-title-md text-title-md text-on-surface-variant">{STEPS[step - 1]}</span>
          </div>
          <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
            <div className="bg-secondary-container h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${(step / STEPS.length) * 100}%` }} />
          </div>
        </div>

        {error && (
          <div className="w-full max-w-4xl mb-6 p-4 bg-error-container text-on-error-container rounded-lg flex items-center gap-2">
            <span className="material-symbols-outlined">error</span> {error}
          </div>
        )}

        <div className="w-full max-w-4xl">

          {/* Step 1: Account Details */}
          {step === 1 && (
            <div className="max-w-xl mx-auto">
              <div className="mb-stack-lg text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-container mb-md">
                  <span className="material-symbols-outlined text-on-primary text-[24px]">account_balance_wallet</span>
                </div>
                <h2 className="font-headline-lg text-headline-lg text-primary mb-2">Create Your Account</h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  You'll be the administrator and treasurer of this ROSCA chama.
                </p>
              </div>
              <div className="space-y-4">
                <input className={inputCls} placeholder="Full Name" value={account.name} onChange={fa('name')} />
                <input className={inputCls} placeholder="Email Address" type="email" value={account.email} onChange={fa('email')} />
                <input className={inputCls} placeholder="Phone Number (07XXXXXXXX)" value={account.phone} onChange={fa('phone')} />
                <input className={inputCls} placeholder="Password (min. 6 characters)" type="password" value={account.password} onChange={fa('password')} />
              </div>
            </div>
          )}

          {/* Step 2: Chama Setup (ROSCA rules) */}
          {step === 2 && (
            <div className="max-w-2xl mx-auto">
              <div className="mb-stack-lg text-center">
                <h2 className="font-headline-lg text-headline-lg text-primary mb-2">ROSCA Chama Setup</h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  Define your rotation rules. These are enforced automatically once members join.
                </p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-1 uppercase">Chama Name *</label>
                    <input className={inputCls} placeholder="e.g. Umoja Savings Circle" value={chamaDetails.name} onChange={fc('name')} />
                  </div>
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-1 uppercase">Number of Members *</label>
                    <input className={inputCls} type="number" min="2" placeholder="e.g. 10" value={chamaDetails.memberCount} onChange={fc('memberCount')} />
                  </div>
                </div>

                {/* BR-ROSCA-001: fixed contribution amount */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-1 uppercase">Contribution Amount (KES) *</label>
                    <input className={inputCls} type="number" min="1" placeholder="e.g. 1000" value={chamaDetails.contributionAmount} onChange={fc('contributionAmount')} />
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Every member contributes this fixed amount each cycle. (BR-ROSCA-001)</p>
                  </div>
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-1 uppercase">Cycle Frequency *</label>
                    <select className={inputCls} value={chamaDetails.cycleFrequency} onChange={fc('cycleFrequency')}>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>

                {/* BR-ROSCA-003: rotation order */}
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-2 uppercase">Rotation Method *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {ROTATION_METHODS.map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setChamaDetails(p => ({ ...p, rotationMethod: opt.id }))}
                        className={`text-left p-4 rounded-xl border transition-all ${
                          chamaDetails.rotationMethod === opt.id ? 'border-primary ring-2 ring-primary bg-primary-fixed/10' : 'border-outline-variant hover:border-primary-container'
                        }`}
                      >
                        <p className="font-title-md text-title-md text-on-surface">{opt.label}</p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* BR-ROSCA-004: missed contribution penalty */}
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-2 uppercase">Missed Contribution Penalty *</label>
                  <div className="grid grid-cols-3 gap-3">
                    {MISSED_CONTRIBUTION_PENALTIES.map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setChamaDetails(p => ({ ...p, missedContributionPenalty: opt.id }))}
                        className={`text-left p-3 rounded-xl border transition-all ${
                          chamaDetails.missedContributionPenalty === opt.id ? 'border-primary ring-2 ring-primary bg-primary-fixed/10' : 'border-outline-variant hover:border-primary-container'
                        }`}
                      >
                        <p className="font-title-md text-title-md text-on-surface text-sm">{opt.label}</p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                  {chamaDetails.missedContributionPenalty === 'fine' && (
                    <input className={`${inputCls} mt-3`} type="number" min="1" placeholder="Fine amount (KES)"
                      value={chamaDetails.fineAmount} onChange={fc('fineAmount')} />
                  )}
                </div>

                {/* Welfare pool — built-in module, governed rules shown read-only */}
                <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">health_and_safety</span>
                    <p className="font-title-md text-title-md text-primary">Welfare Pool (included automatically)</p>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Every ROSCA chama on FundLoop includes a welfare fund for medical, funeral, and disaster claims.
                    Claims require {chamaDetails.welfareApprovalThreshold}% member approval and are capped at {chamaDetails.welfareMaxClaimPercent}%
                    of the pool balance per claim — these thresholds are fixed platform rules (BR-WEL-003, BR-WEL-004) and aren't editable here.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="max-w-xl mx-auto">
              <div className="mb-stack-lg text-center">
                <h2 className="font-headline-lg text-headline-lg text-primary mb-2">Review & Confirm</h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant">Confirm your details before we set everything up.</p>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg space-y-3">
                <div className="flex justify-between"><span className="text-on-surface-variant">Chama Type</span><span className="font-bold">ROSCA</span></div>
                <div className="flex justify-between"><span className="text-on-surface-variant">Admin Name</span><span className="font-bold">{account.name}</span></div>
                <div className="flex justify-between"><span className="text-on-surface-variant">Email</span><span className="font-bold">{account.email}</span></div>
                <div className="flex justify-between"><span className="text-on-surface-variant">Chama Name</span><span className="font-bold">{chamaDetails.name}</span></div>
                <div className="flex justify-between"><span className="text-on-surface-variant">Members</span><span className="font-bold">{chamaDetails.memberCount}</span></div>
                <div className="flex justify-between"><span className="text-on-surface-variant">Contribution</span><span className="font-bold">KES {chamaDetails.contributionAmount} / {chamaDetails.cycleFrequency}</span></div>
                <div className="flex justify-between"><span className="text-on-surface-variant">Rotation Method</span><span className="font-bold capitalize">{chamaDetails.rotationMethod.replace('_', ' ')}</span></div>
                <div className="flex justify-between"><span className="text-on-surface-variant">Missed Contribution</span><span className="font-bold capitalize">{chamaDetails.missedContributionPenalty.replace('_', ' ')}{chamaDetails.missedContributionPenalty === 'fine' ? ` (KES ${chamaDetails.fineAmount})` : ''}</span></div>
                <div className="flex justify-between pt-3 border-t border-outline-variant"><span className="text-on-surface-variant">Welfare Approval</span><span className="font-bold">{chamaDetails.welfareApprovalThreshold}% required</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="fixed bottom-0 left-0 right-0 bg-surface-container-lowest border-t border-outline-variant py-stack-md z-50">
          <div className="max-w-4xl mx-auto px-margin-desktop flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className="flex items-center gap-2 font-title-md text-title-md text-on-surface-variant hover:text-primary px-stack-lg py-3 rounded-lg transition-all duration-200 disabled:opacity-30"
            >
              <span className="material-symbols-outlined">arrow_back</span> Back
            </button>
            <div className="flex items-center gap-4">
              <p className="hidden sm:block font-body-sm text-body-sm text-on-surface-variant">Don't worry, you can refine these settings later.</p>
              {step < STEPS.length ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 bg-primary text-on-primary hover:bg-primary-container font-title-md text-title-md px-10 py-3 rounded-xl transition-all duration-200"
                >
                  Continue <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex items-center gap-2 bg-primary text-on-primary hover:bg-primary-container font-title-md text-title-md px-10 py-3 rounded-xl transition-all duration-200 disabled:opacity-60"
                >
                  {loading ? 'Setting up…' : 'Finish Setup'} <span className="material-symbols-outlined">check</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
      <div className="h-24" />
    </>
  );
}
