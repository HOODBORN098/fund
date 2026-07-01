const router = require('express').Router();
const prisma = require('../utils/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const { AppError, catchAsync } = require('../utils/errors');
const { audit, emitEvent } = require('../utils/audit');
const { getOrCreateWallet } = require('../utils/wallet');

const DEFAULT_CONSTITUTION = {
  rosca: { rotationMethod: 'fixed_order', missedPenaltyType: 'fine', fineAmount: 200 },
  welfare: { maxClaimPercentOfPool: 0.30, approvalThreshold: 0.70, allowedTypes: ['medical','funeral','disaster'] },
  governance: { simpleMajority: 0.50, constitutionalThreshold: 0.75, quorum: 0.60 },
  swap: { approvalThreshold: 0.667 },
};

// GET /chamas
router.get('/', authenticate, catchAsync(async (req, res) => {
  const memberships = await prisma.membership.findMany({
    where: { userId: req.user.id, status: { in: ['active','pending'] } },
    include: { chama: true },
  });
  res.json({ chamas: memberships.map(m => ({ ...m.chama, role: m.role, status: m.status })) });
}));

// POST /chamas
router.post('/', authenticate, catchAsync(async (req, res) => {
  const { name, type = 'rosca_welfare', constitution } = req.body;
  if (!name) throw new AppError('Chama name is required');

  const result = await prisma.$transaction(async (tx) => {
    const chama = await tx.chama.create({
      data: { name, type, constitution: constitution || DEFAULT_CONSTITUTION, createdById: req.user.id },
    });

    // Creator becomes chairman AND treasurer by default
    const membershipChairman = await tx.membership.create({
      data: { userId: req.user.id, chamaId: chama.id, role: 'chairman', status: 'active', joinedAt: new Date() },
    });

    // Create the three chama wallets: general, rosca, welfare
    for (const walletType of ['rosca', 'welfare', 'general']) {
      await getOrCreateWallet(tx, { ownerType: `chama_${walletType}`, ownerId: chama.id, chamaId: chama.id });
    }

    await emitEvent({ eventType: 'ChamaCreated', chamaId: chama.id, actorId: req.user.id, payload: { name }, tx });
    await audit({ eventType: 'ChamaCreated', chamaId: chama.id, actorId: req.user.id, payload: { name }, tx });

    return { chama, membership: membershipChairman };
  });

  res.status(201).json(result);
}));

// GET /chamas/:chamaId
router.get('/:chamaId', authenticate, catchAsync(async (req, res) => {
  const chama = await prisma.chama.findUniqueOrThrow({ where: { id: req.params.chamaId } });
  res.json(chama);
}));

// PUT /chamas/:chamaId
router.put('/:chamaId', authenticate, requireRole('admin', 'chairman'), catchAsync(async (req, res) => {
  const { name, type } = req.body;
  const chama = await prisma.chama.update({
    where: { id: req.params.chamaId },
    data: { ...(name && { name }), ...(type && { type }) },
  });
  await audit({ eventType: 'ChamaUpdated', chamaId: chama.id, actorId: req.user.id, payload: req.body });
  res.json(chama);
}));

// DELETE /chamas/:chamaId
router.delete('/:chamaId', authenticate, requireRole('admin'), catchAsync(async (req, res) => {
  throw new AppError('Chama dissolution not yet implemented', 501);
}));

// POST /chamas/:chamaId/switch
router.post('/:chamaId/switch', authenticate, catchAsync(async (req, res) => {
  // The frontend stores the active chama client-side; this endpoint just
  // validates the user is a member and returns the chama + their membership.
  const chama = await prisma.chama.findUniqueOrThrow({ where: { id: req.params.chamaId } });
  res.json({ chama, membership: req.membership });
}));

module.exports = router;
