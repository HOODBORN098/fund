const router = require('express').Router({ mergeParams: true });
const prisma = require('../utils/prisma');
const { authenticate, requireRole, requireActive } = require('../middleware/auth');
const { catchAsync } = require('../utils/errors');

// GET /chamas/:chamaId/dashboard  (admin/treasurer/chairman)
router.get('/', authenticate, requireRole('admin','chairman','treasurer'), catchAsync(async (req, res) => {
  const chamaId = req.params.chamaId;

  const [memberCount, activeCycle, pendingClaims, rroscaWallet, welfareWallet] = await Promise.all([
    prisma.membership.count({ where: { chamaId, status: 'active' } }),
    prisma.roscaCycle.findFirst({ where: { chamaId, status: { in: ['open','in_progress'] } }, orderBy: { createdAt: 'desc' } }),
    prisma.welfareClaim.count({ where: { chamaId, status: 'pending_approval' } }),
    prisma.wallet.findFirst({ where: { ownerType: 'chama_rosca', ownerId: chamaId } }),
    prisma.wallet.findFirst({ where: { ownerType: 'chama_welfare', ownerId: chamaId } }),
  ]);

  const totalContributions = await prisma.transaction.aggregate({
    where: { chamaId, type: 'contribution', status: 'completed' },
    _sum: { amount: true },
  });

  res.json({
    memberCount,
    activeCycle,
    pendingClaims,
    roscaPool:    Number(rroscaWallet?.balance  || 0),
    welfarePool:  Number(welfareWallet?.balance || 0),
    totalContributions: Number(totalContributions._sum.amount || 0),
  });
}));

// GET /chamas/:chamaId/member-dashboard  (any active member)
router.get('/member', authenticate, requireActive, catchAsync(async (req, res) => {
  const chamaId = req.params.chamaId;
  const membershipId = req.membership.id;

  // Fetch activeCycle first — it's needed to conditionally query myContribution
  const [wallet, activeCycle, myClaims] = await Promise.all([
    prisma.wallet.findFirst({ where: { ownerType: 'member', ownerId: req.user.id, chamaId } }),
    prisma.roscaCycle.findFirst({ where: { chamaId, status: { in: ['open','in_progress'] } }, orderBy: { createdAt: 'desc' } }),
    prisma.welfareClaim.findMany({ where: { claimantMembershipId: membershipId } }),
  ]);

  const myContribution = activeCycle
    ? await prisma.contributionRecord.findFirst({ where: { membershipId, cycleId: activeCycle.id } })
    : null;

  res.json({
    walletBalance:     Number(wallet?.balance || 0),
    activeCycle,
    myContribution,
    myClaims,
  });
}));

module.exports = router;
