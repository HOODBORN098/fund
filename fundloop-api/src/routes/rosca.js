const router = require('express').Router({ mergeParams: true });
const prisma = require('../utils/prisma');
const { authenticate, requireRole, requireActive } = require('../middleware/auth');
const { AppError, catchAsync } = require('../utils/errors');
const { audit, emitEvent } = require('../utils/audit');
const { atomicTransfer, getOrCreateWallet } = require('../utils/wallet');
const { sendSMS, SMS } = require('../utils/sms');

// GET /chamas/:chamaId/rosca
router.get('/', authenticate, catchAsync(async (req, res) => {
  const chamaId = req.params.chamaId;
  const cycles = await prisma.roscaCycle.findMany({
    where: { chamaId }, orderBy: { cycleNumber: 'desc' },
    include: { payout: true, _count: { select: { contributionRecords: true } } },
  });

  const rroscaWallet = await prisma.wallet.findFirst({ where: { ownerType: 'chama_rosca', ownerId: chamaId } });
  const activeCycle  = cycles.find(c => ['open','in_progress'].includes(c.status));

  res.json({
    cycles: cycles.map(serializeCycle),
    poolBalance: Number(rroscaWallet?.balance || 0),
    activeCycle: activeCycle ? serializeCycle(activeCycle) : null,
    memberCount: await prisma.membership.count({ where: { chamaId, status: 'active' } }),
  });
}));

// GET /chamas/:chamaId/rosca/:id
router.get('/:id', authenticate, catchAsync(async (req, res) => {
  const cycle = await prisma.roscaCycle.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      rotationPositions: { include: { membership: { include: { user: { select: { fullName: true } } } } }, orderBy: { position: 'asc' } },
      contributionRecords: true,
      payout: true,
    },
  });
  res.json(serializeCycle(cycle));
}));

// POST /chamas/:chamaId/rosca
// BR-GOV-001: only Treasurer/Admin can start a cycle.
// WF-ROS-001
router.post('/', authenticate, requireRole('treasurer','admin'), catchAsync(async (req, res) => {
  const chamaId = req.params.chamaId;
  const { name, contributionAmount, frequency = 'monthly', startDate, rotationMethod } = req.body;
  if (!contributionAmount || Number(contributionAmount) <= 0) throw new AppError('Contribution amount must be positive');

  // Validate: no other open/in_progress cycle for this chama
  const existing = await prisma.roscaCycle.findFirst({ where: { chamaId, status: { in: ['open','in_progress'] } } });
  if (existing) throw new AppError('A cycle is already active for this chama');

  const chama = await prisma.chama.findUniqueOrThrow({ where: { id: chamaId } });
  const constitution = chama.constitution;
  const method = rotationMethod || constitution?.rosca?.rotationMethod || 'fixed_order';

  const activeMembers = await prisma.membership.findMany({
    where: { chamaId, status: 'active' }, orderBy: { joinedAt: 'asc' },
    include: { user: { select: { fullName: true, phone: true } } },
  });
  if (activeMembers.length < 2) throw new AppError('At least 2 active members required to start a cycle');

  const lastCycle = await prisma.roscaCycle.findFirst({ where: { chamaId }, orderBy: { cycleNumber: 'desc' } });
  const cycleNumber = (lastCycle?.cycleNumber || 0) + 1;

  const deadline = startDate ? new Date(startDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const cycle = await prisma.$transaction(async (tx) => {
    const c = await tx.roscaCycle.create({
      data: {
        chamaId, name: name || `Cycle #${cycleNumber}`,
        cycleNumber, contributionAmount: BigInt(Math.round(Number(contributionAmount))),
        frequency, rotationMethod: method, status: 'open',
        contributionDeadline: deadline, startedById: req.user.id,
      },
    });

    // Assign rotation positions
    let ordered = [...activeMembers];
    if (method === 'lottery') ordered = ordered.sort(() => Math.random() - 0.5);

    await tx.rotationPosition.createMany({
      data: ordered.map((m, i) => ({ cycleId: c.id, membershipId: m.id, position: i + 1 })),
    });

    // Create blank contribution records for all active members
    await tx.contributionRecord.createMany({
      data: activeMembers.map(m => ({ cycleId: c.id, membershipId: m.id, amount: c.contributionAmount })),
    });

    // EVT-ROS-001 CycleStarted
    await emitEvent({ eventType: 'CycleStarted', chamaId, actorId: req.user.id,
                      payload: { cycleId: c.id, cycleNumber, contributionAmount: Number(c.contributionAmount) }, tx });
    await audit({ eventType: 'CycleStarted', chamaId, actorId: req.user.id, subjectId: c.id, tx });

    return c;
  });

  // Notify all members (EVT-ROS-001)
  const recipientPosition = await prisma.rotationPosition.findFirst({ where: { cycleId: cycle.id, position: 1 }, include: { membership: { include: { user: true } } } });
  for (const m of activeMembers) {
    await sendSMS(m.user.phone, SMS.cycleStarted(cycleNumber, Number(cycle.contributionAmount), deadline.toLocaleDateString(), recipientPosition?.membership?.user?.fullName || 'TBD'));
  }

  res.status(201).json(serializeCycle(cycle));
}));

// POST /chamas/:chamaId/rosca/:id/contribute
// WF-ROS-002
router.post('/:id/contribute', authenticate, requireActive, catchAsync(async (req, res) => {
  const chamaId = req.params.chamaId;
  const idempotencyKey = req.headers['idempotency-key'];
  const { amount, method = 'wallet' } = req.body;

  const cycle = await prisma.roscaCycle.findUniqueOrThrow({ where: { id: req.params.id } });
  if (cycle.chamaId !== chamaId) throw new AppError('Cycle not in this chama', 403);
  if (cycle.status !== 'open') throw new AppError('Cycle is not accepting contributions');

  // BR-ROSCA-001: fixed contribution amount
  const expected = cycle.contributionAmount;
  const given = BigInt(Math.round(Number(amount)));
  if (given !== expected) throw new AppError(`Contribution must be exactly KES ${Number(expected)}`);

  const memberWallet = await prisma.wallet.findFirst({ where: { ownerType: 'member', ownerId: req.user.id, chamaId } });
  if (!memberWallet) throw new AppError('No wallet found. Please top up first.');

  const roscaWallet = await prisma.wallet.findFirst({ where: { ownerType: 'chama_rosca', ownerId: chamaId } });
  if (!roscaWallet) throw new AppError('ROSCA pool wallet not found');

  const result = await prisma.$transaction(async (tx) => {
    // Atomic transfer: member wallet → ROSCA pool (BR-FIN-004)
    const txn = await atomicTransfer(tx, {
      fromWalletId: memberWallet.id, toWalletId: roscaWallet.id,
      amount: given, type: 'contribution', chamaId, actorId: req.user.id, idempotencyKey,
      metadata: { cycleId: cycle.id, membershipId: req.membership.id },
    });

    // Mark contribution as paid
    await tx.contributionRecord.updateMany({
      where: { cycleId: cycle.id, membershipId: req.membership.id },
      data: { status: 'paid', transactionId: txn.id, paidAt: new Date() },
    });

    // EVT-ROS-002 ContributionPaid
    await emitEvent({ eventType: 'ContributionPaid', chamaId, actorId: req.user.id,
                      payload: { cycleId: cycle.id, amount: Number(given), transactionId: txn.id }, tx });
    await audit({ eventType: 'ContributionPaid', chamaId, actorId: req.user.id, subjectId: cycle.id, tx });

    // Check if all active members have paid → trigger payout
    const unpaid = await tx.contributionRecord.count({ where: { cycleId: cycle.id, status: 'pending' } });

    return { txn, allPaid: unpaid === 0 };
  });

  await sendSMS(req.user.phone, SMS.contributionPaid(Number(given), cycle.cycleNumber));

  // Auto-trigger payout if all contributions received (BR-ROSCA-002)
  if (result.allPaid) {
    await triggerPayout(chamaId, cycle, req.user.id);
  }

  res.status(201).json(serializeTxn(result.txn));
}));

// POST /chamas/:chamaId/rosca/:id/payout
// WF-ROS-003: Treasurer manual override or auto-triggered
router.post('/:id/payout', authenticate, requireRole('treasurer','admin'), catchAsync(async (req, res) => {
  const chamaId = req.params.chamaId;
  const cycle = await prisma.roscaCycle.findUniqueOrThrow({ where: { id: req.params.id } });
  if (cycle.chamaId !== chamaId) throw new AppError('Cycle not in this chama', 403);

  const payout = await triggerPayout(chamaId, cycle, req.user.id);
  res.status(201).json({ ...payout, amount: Number(payout.amount) });
}));

// GET /chamas/:chamaId/rosca/:id/members
router.get('/:id/members', authenticate, catchAsync(async (req, res) => {
  const positions = await prisma.rotationPosition.findMany({
    where: { cycleId: req.params.id },
    include: { membership: { include: { user: { select: { fullName: true } } } } },
    orderBy: { position: 'asc' },
  });
  res.json({ members: positions });
}));

// POST /chamas/:chamaId/rosca/:id/members
router.post('/:id/members', authenticate, requireRole('treasurer','admin'), catchAsync(async (req, res) => {
  const { membershipId } = req.body;
  const lastPos = await prisma.rotationPosition.findFirst({ where: { cycleId: req.params.id }, orderBy: { position: 'desc' } });
  const pos = await prisma.rotationPosition.create({
    data: { cycleId: req.params.id, membershipId, position: (lastPos?.position || 0) + 1 },
  });
  res.status(201).json(pos);
}));

// ─── Internal helper: release payout ─────────────────────────────────────────
async function triggerPayout(chamaId, cycle, actorId) {
  // BR-ROSCA-005: one payout per cycle (enforced by DB unique constraint too)
  const existingPayout = await prisma.payout.findUnique({ where: { cycleId: cycle.id } });
  if (existingPayout) throw new AppError('Payout already issued for this cycle', 409);

  // BR-ROSCA-002: all active members must have paid
  const unpaid = await prisma.contributionRecord.count({ where: { cycleId: cycle.id, status: 'pending' } });
  if (unpaid > 0) throw new AppError(`${unpaid} members have not yet contributed`);

  // Find next eligible rotation position (skip suspended/ineligible)
  const nextPosition = await prisma.rotationPosition.findFirst({
    where: { cycleId: cycle.id, status: 'pending' },
    orderBy: { position: 'asc' },
    include: { membership: { include: { user: true, chama: true } } },
  });
  if (!nextPosition) throw new AppError('No eligible rotation position found');

  const recipient = nextPosition.membership;
  const roscaWallet  = await prisma.wallet.findFirst({ where: { ownerType: 'chama_rosca', ownerId: chamaId } });
  const memberWallet = await getOrCreateWallet(null, { ownerType: 'member', ownerId: recipient.userId, chamaId });

  const payoutAmount = roscaWallet.balance;

  const payout = await prisma.$transaction(async (tx) => {
    // Atomic: ROSCA pool → recipient wallet (BR-FIN-004)
    const txn = await atomicTransfer(tx, {
      fromWalletId: roscaWallet.id, toWalletId: memberWallet.id,
      amount: payoutAmount, type: 'payout', chamaId, actorId,
      metadata: { cycleId: cycle.id, recipientMembershipId: recipient.id },
    });

    const p = await tx.payout.create({
      data: { cycleId: cycle.id, recipientMembershipId: recipient.id, amount: payoutAmount, transactionId: txn.id, releasedAt: new Date() },
    });

    await tx.roscaCycle.update({ where: { id: cycle.id }, data: { status: 'completed' } });
    await tx.rotationPosition.update({ where: { id: nextPosition.id }, data: { status: 'received' } });

    // EVT-ROS-004 PayoutReleased
    await emitEvent({ eventType: 'PayoutReleased', chamaId, actorId,
                      payload: { cycleId: cycle.id, recipientId: recipient.userId, amount: Number(payoutAmount), transactionId: txn.id }, tx });
    await audit({ eventType: 'PayoutReleased', chamaId, actorId, subjectId: cycle.id,
                  payload: { recipientId: recipient.userId, amount: Number(payoutAmount) }, tx });
    return p;
  });

  // Notify recipient and find next member
  await sendSMS(recipient.user.phone, SMS.payoutReleased(Number(payoutAmount)));

  const nextNext = await prisma.rotationPosition.findFirst({
    where: { cycleId: cycle.id, status: 'pending' },
    orderBy: { position: 'asc' },
    include: { membership: { include: { user: true } } },
  });

  const allMembers = await prisma.membership.findMany({ where: { chamaId, status: 'active' }, include: { user: true } });
  for (const m of allMembers) {
    await sendSMS(m.user.phone, SMS.cycleComplete(cycle.cycleNumber, nextNext?.membership?.user?.fullName || 'TBD'));
  }

  return payout;
}

function serializeCycle(c) {
  return { ...c, contributionAmount: Number(c.contributionAmount) };
}

function serializeTxn(t) {
  return { ...t, amount: Number(t.amount) };
}

module.exports = router;
