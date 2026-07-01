const router = require('express').Router({ mergeParams: true });
const prisma = require('../utils/prisma');
const { authenticate, requireRole, requireActive } = require('../middleware/auth');
const { AppError, catchAsync } = require('../utils/errors');
const { audit, emitEvent } = require('../utils/audit');
const { atomicTransfer, getOrCreateWallet } = require('../utils/wallet');
const { sendSMS, SMS } = require('../utils/sms');

// GET /chamas/:chamaId/welfare/claims
// Returns all the fields the frontend needs for its vote-tally UI
router.get('/claims', authenticate, catchAsync(async (req, res) => {
  const chamaId = req.params.chamaId;
  const totalActive = await prisma.membership.count({ where: { chamaId, status: 'active' } });

  const claims = await prisma.welfareClaim.findMany({
    where: { chamaId }, orderBy: { submittedAt: 'desc' },
    include: {
      claimant: { include: { user: { select: { fullName: true } } } },
      vote: { include: { ballots: true } },
    },
  });

  const chama = await prisma.chama.findUniqueOrThrow({ where: { id: chamaId } });
  const requiredApproval = chama.constitution?.welfare?.approvalThreshold ?? 0.70;

  const result = claims.map(c => {
    const approvals = c.vote?.ballots.filter(b => b.choice === 'approve').length || 0;
    const approvalRate = totalActive > 0 ? approvals / totalActive : 0; // BR-WEL-004: against total voters, not cast ballots

    const myBallot = c.vote?.ballots.find(b => b.membershipId === req.membership.id);

    return {
      id: c.id,
      claimantId:      c.claimant.userId,
      memberName:      c.claimant.user.fullName,
      type:            c.emergencyType,
      amount:          Number(c.amount),
      description:     c.description,
      evidenceUrls:    c.evidenceUrls,
      status:          c.status,
      submittedAt:     c.submittedAt,
      approvalRate,
      requiredApproval,
      hasVoted:        !!myBallot,
      voteChoice:      myBallot?.choice || null,
      rejectedReason:  c.rejectedReason,
    };
  });

  res.json({ claims: result, requiredApproval });
}));

// GET /chamas/:chamaId/welfare/claims/:id
router.get('/claims/:id', authenticate, catchAsync(async (req, res) => {
  const claim = await prisma.welfareClaim.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      claimant: { include: { user: { select: { fullName: true } } } },
      vote: { include: { ballots: true } },
    },
  });
  res.json(claim);
}));

// POST /chamas/:chamaId/welfare/claims
// WF-WEL-001
router.post('/claims', authenticate, requireActive, catchAsync(async (req, res) => {
  const chamaId = req.params.chamaId;
  const { type, amount, description, evidenceUrls = [] } = req.body;

  const chama = await prisma.chama.findUniqueOrThrow({ where: { id: chamaId } });
  const constitution = chama.constitution?.welfare || {};

  // BR-WEL-001: only approved emergency types
  const allowedTypes = constitution.allowedTypes || ['medical','funeral','disaster'];
  if (!allowedTypes.includes(type)) throw new AppError(`Emergency type must be one of: ${allowedTypes.join(', ')}`);

  // BR-WEL-005: evidence required
  if (!evidenceUrls || evidenceUrls.length === 0) throw new AppError('Evidence is required (attach at least one document URL)');

  // BR-VAL-003: amount > 0
  if (!amount || Number(amount) <= 0) throw new AppError('Claim amount must be greater than zero');

  // BR-WEL-002: only active members
  // (already enforced by requireActive middleware)

  // BR-WEL-006: one active claim per member
  const activeClaim = await prisma.welfareClaim.findFirst({
    where: { claimantMembershipId: req.membership.id, status: { in: ['pending_approval','approved','pending_funds'] } },
  });
  if (activeClaim) throw new AppError('You already have an active welfare claim');

  // BR-WEL-003: amount ≤ 30% of welfare pool
  const welfareWallet = await prisma.wallet.findFirst({ where: { ownerType: 'chama_welfare', ownerId: chamaId } });
  const poolBalance = Number(welfareWallet?.balance || 0);
  const maxClaim = poolBalance * (constitution.maxClaimPercentOfPool || 0.30);
  if (Number(amount) > maxClaim) throw new AppError(`Claim exceeds 30% of welfare pool (max: KES ${Math.floor(maxClaim)})`);

  const amountBig = BigInt(Math.round(Number(amount)));
  const requiredThreshold = constitution.approvalThreshold || 0.70;

  const claim = await prisma.$transaction(async (tx) => {
    // Create the claim
    const c = await tx.welfareClaim.create({
      data: { chamaId, claimantMembershipId: req.membership.id, emergencyType: type, amount: amountBig, description, evidenceUrls },
    });

    // BR-WEL-004: create a vote requiring 70% approval
    const vote = await tx.vote.create({
      data: { chamaId, subjectType: 'welfare_claim', subjectId: c.id,
              title: `Welfare claim: ${type} (KES ${Number(amountBig)})`,
              description, requiredThreshold, createdById: req.user.id },
    });

    // Link vote to claim
    await tx.welfareClaim.update({ where: { id: c.id }, data: { voteId: vote.id } });

    // EVT-WEL-001 ClaimSubmitted
    await emitEvent({ eventType: 'ClaimSubmitted', chamaId, actorId: req.user.id,
                      payload: { claimId: c.id, type, amount: Number(amountBig) }, tx });
    await audit({ eventType: 'ClaimSubmitted', chamaId, actorId: req.user.id, subjectId: c.id, tx });

    return c;
  });

  // SMS all members to vote
  const allMembers = await prisma.membership.findMany({ where: { chamaId, status: 'active' }, include: { user: true } });
  for (const m of allMembers) {
    await sendSMS(m.user.phone, SMS.claimSubmitted(req.user.fullName, type, Number(amountBig)));
  }

  res.status(201).json({ ...claim, amount: Number(claim.amount) });
}));

// POST /chamas/:chamaId/welfare/claims/:id/vote
// WF-WEL-002 — any active member except the claimant
router.post('/claims/:id/vote', authenticate, requireActive, catchAsync(async (req, res) => {
  const chamaId = req.params.chamaId;
  const { choice } = req.body;

  if (!['approve','reject','abstain'].includes(choice)) throw new AppError('Choice must be approve, reject, or abstain');

  const claim = await prisma.welfareClaim.findUniqueOrThrow({ where: { id: req.params.id }, include: { vote: true } });
  if (claim.chamaId !== chamaId) throw new AppError('Claim not in this chama', 403);
  if (claim.status !== 'pending_approval') throw new AppError('This claim is no longer accepting votes');
  if (claim.claimantMembershipId === req.membership.id) throw new AppError('You cannot vote on your own claim');
  if (!claim.voteId) throw new AppError('No vote record associated with this claim');

  const chama = await prisma.chama.findUniqueOrThrow({ where: { id: chamaId } });
  const requiredThreshold = chama.constitution?.welfare?.approvalThreshold || 0.70;
  const totalActive = await prisma.membership.count({ where: { chamaId, status: 'active' } });

  const updatedClaim = await prisma.$transaction(async (tx) => {
    // Insert ballot (UNIQUE constraint prevents double-voting)
    await tx.voteBallot.create({ data: { voteId: claim.voteId, membershipId: req.membership.id, choice } });

    // Tally
    const ballots  = await tx.voteBallot.findMany({ where: { voteId: claim.voteId } });
    const approvals = ballots.filter(b => b.choice === 'approve').length;
    const rejects   = ballots.filter(b => b.choice === 'reject').length;
    const approvalRate = totalActive > 0 ? approvals / totalActive : 0;
    const rejectRate   = totalActive > 0 ? rejects   / totalActive : 0;

    let updatedStatus = null;

    // EVT-GOV-001 VoteCast (always)
    await emitEvent({ eventType: 'VoteCast', chamaId, actorId: req.user.id,
                      payload: { claimId: claim.id, choice, approvalRate }, tx });
    await audit({ eventType: 'VoteCast', chamaId, actorId: req.user.id, subjectId: claim.id,
                  payload: { choice, approvalRate }, tx });

    // Check if approval threshold met (BR-WEL-004)
    if (approvalRate >= requiredThreshold) {
      updatedStatus = 'approved';
      await tx.welfareClaim.update({ where: { id: claim.id }, data: { status: 'approved' } });
      await tx.vote.update({ where: { id: claim.voteId }, data: { status: 'passed', closedAt: new Date() } });

      await emitEvent({ eventType: 'ClaimApproved', chamaId, actorId: req.user.id,
                        payload: { claimId: claim.id, approvalRate }, tx });
      await audit({ eventType: 'ClaimApproved', chamaId, actorId: req.user.id, subjectId: claim.id, tx });
    }
    // Check if approval is now mathematically impossible (>30% have rejected)
    else if (rejectRate > (1 - requiredThreshold)) {
      updatedStatus = 'rejected';
      await tx.welfareClaim.update({ where: { id: claim.id }, data: { status: 'rejected', rejectedReason: 'Vote did not reach required approval' } });
      await tx.vote.update({ where: { id: claim.voteId }, data: { status: 'failed', closedAt: new Date() } });

      await emitEvent({ eventType: 'ClaimRejected', chamaId, actorId: req.user.id,
                        payload: { claimId: claim.id, approvalRate }, tx });
      await audit({ eventType: 'ClaimRejected', chamaId, actorId: req.user.id, subjectId: claim.id, tx });
    }

    return { ...claim, status: updatedStatus || claim.status, approvalRate };
  });

  // Send SMS to claimant if vote closed
  if (updatedClaim.status === 'approved') {
    const claimant = await prisma.membership.findUnique({ where: { id: claim.claimantMembershipId }, include: { user: true } });
    if (claimant) await sendSMS(claimant.user.phone, SMS.claimApproved());
  } else if (updatedClaim.status === 'rejected') {
    const claimant = await prisma.membership.findUnique({ where: { id: claim.claimantMembershipId }, include: { user: true } });
    if (claimant) await sendSMS(claimant.user.phone, SMS.claimRejected('Vote did not reach required approval'));
  }

  res.json({ message: `Vote recorded: ${choice}`, claim: updatedClaim });
}));

// PATCH /chamas/:chamaId/welfare/claims/:id/approve
// WF-WEL-003: DISBURSEMENT — only fires once vote threshold is met (status='approved')
// Treasurer/admin only
router.patch('/claims/:id/approve', authenticate, requireRole('treasurer','admin'), catchAsync(async (req, res) => {
  const chamaId = req.params.chamaId;
  const claim = await prisma.welfareClaim.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { claimant: { include: { user: true } } },
  });

  if (claim.chamaId !== chamaId) throw new AppError('Claim not in this chama', 403);
  if (claim.status !== 'approved') throw new AppError('Claim has not been approved by vote yet. 70% member approval required first.', 409);

  const welfareWallet = await prisma.wallet.findFirst({ where: { ownerType: 'chama_welfare', ownerId: chamaId } });
  if (!welfareWallet) throw new AppError('Welfare wallet not found');

  // Insufficient funds → pending_funds state (WF-WEL-003 branch)
  if (welfareWallet.balance < claim.amount) {
    await prisma.welfareClaim.update({ where: { id: claim.id }, data: { status: 'pending_funds' } });
    return res.json({ status: 'pending_funds', message: 'Insufficient welfare pool balance. Claim set to PENDING_FUNDS.' });
  }

  const claimantWallet = await getOrCreateWallet(null, { ownerType: 'member', ownerId: claim.claimant.userId, chamaId });

  const result = await prisma.$transaction(async (tx) => {
    // Atomic: welfare pool → claimant wallet (BR-FIN-004)
    const txn = await atomicTransfer(tx, {
      fromWalletId: welfareWallet.id, toWalletId: claimantWallet.id,
      amount: claim.amount, type: 'welfare_claim', chamaId, actorId: req.user.id,
      metadata: { claimId: claim.id },
    });

    await tx.welfareClaim.update({ where: { id: claim.id }, data: { status: 'disbursed' } });
    const disb = await tx.welfareDisbursement.create({
      data: { claimId: claim.id, transactionId: txn.id, disbursedAt: new Date() },
    });

    // EVT-WEL-004 WelfareDisbursed
    await emitEvent({ eventType: 'WelfareDisbursed', chamaId, actorId: req.user.id,
                      payload: { claimId: claim.id, amount: Number(claim.amount), transactionId: txn.id }, tx });
    await audit({ eventType: 'WelfareDisbursed', chamaId, actorId: req.user.id, subjectId: claim.id,
                  payload: { amount: Number(claim.amount) }, tx });

    return { disbursement: disb, transaction: txn };
  });

  await sendSMS(claim.claimant.user.phone, SMS.welfareDisbursed(Number(claim.amount)));
  res.json({ status: 'disbursed', ...result });
}));

// PATCH /chamas/:chamaId/welfare/claims/:id/reject
// BR-GOV-002: Chairman veto — bypasses the vote
router.patch('/claims/:id/reject', authenticate, requireRole('chairman','admin'), catchAsync(async (req, res) => {
  const chamaId = req.params.chamaId;
  const { reason } = req.body;

  const claim = await prisma.welfareClaim.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { claimant: { include: { user: true } } },
  });
  if (claim.chamaId !== chamaId) throw new AppError('Claim not in this chama', 403);
  if (['disbursed','rejected'].includes(claim.status)) throw new AppError('Claim already closed');

  const updated = await prisma.$transaction(async (tx) => {
    const c = await tx.welfareClaim.update({
      where: { id: claim.id },
      data: { status: 'rejected', rejectedReason: reason || 'Vetoed by chairman', vetoedById: req.user.id },
    });
    if (claim.voteId) await tx.vote.update({ where: { id: claim.voteId }, data: { status: 'failed', closedAt: new Date() } });

    await emitEvent({ eventType: 'ClaimRejected', chamaId, actorId: req.user.id,
                      payload: { claimId: claim.id, reason, vetoed: true }, tx });
    await audit({ eventType: 'ClaimVetoed', chamaId, actorId: req.user.id, subjectId: claim.id,
                  payload: { reason, vetoedBy: req.user.id }, tx });
    return c;
  });

  await sendSMS(claim.claimant.user.phone, SMS.claimRejected(reason || 'Vetoed by chairman'));
  res.json(updated);
}));

// GET /chamas/:chamaId/welfare/balance
router.get('/balance', authenticate, catchAsync(async (req, res) => {
  const chamaId = req.params.chamaId;
  const wallet = await prisma.wallet.findFirst({ where: { ownerType: 'chama_welfare', ownerId: chamaId } });
  const balance = Number(wallet?.balance || 0);

  const chama = await prisma.chama.findUniqueOrThrow({ where: { id: chamaId } });
  const maxPercent = chama.constitution?.welfare?.maxClaimPercentOfPool || 0.30;

  res.json({ amount: balance, capacityPercent: Math.min((balance / 100000) * 100, 100) });
}));

// POST /chamas/:chamaId/welfare/contribute
router.post('/contribute', authenticate, requireActive, catchAsync(async (req, res) => {
  const chamaId = req.params.chamaId;
  const { amount } = req.body;
  if (!amount || Number(amount) <= 0) throw new AppError('Amount must be positive');

  const amountBig = BigInt(Math.round(Number(amount)));
  const memberWallet  = await prisma.wallet.findFirst({ where: { ownerType: 'member', ownerId: req.user.id, chamaId } });
  const welfareWallet = await prisma.wallet.findFirst({ where: { ownerType: 'chama_welfare', ownerId: chamaId } });

  if (!memberWallet || !welfareWallet) throw new AppError('Wallet not found');

  const txn = await prisma.$transaction(async (tx) => {
    const t = await atomicTransfer(tx, {
      fromWalletId: memberWallet.id, toWalletId: welfareWallet.id,
      amount: amountBig, type: 'contribution', chamaId, actorId: req.user.id,
      metadata: { purpose: 'welfare_contribution' },
    });
    await audit({ eventType: 'WelfareContribution', chamaId, actorId: req.user.id,
                  payload: { amount: Number(amountBig) }, tx });
    return t;
  });

  res.status(201).json({ ...txn, amount: Number(txn.amount) });
}));

module.exports = router;
