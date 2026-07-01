const router = require('express').Router({ mergeParams: true });
const prisma = require('../utils/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const { AppError, catchAsync } = require('../utils/errors');
const { audit } = require('../utils/audit');

// ─── Settings ────────────────────────────────────────────────────────────────

// GET /chamas/:chamaId/settings
router.get('/settings', authenticate, catchAsync(async (req, res) => {
  const chama = await prisma.chama.findUniqueOrThrow({ where: { id: req.params.chamaId } });
  const isOfficer = ['chairman','treasurer','admin'].includes(req.membership.role);

  // Members only see public config; officers see full constitution
  res.json({
    name: chama.name,
    type: chama.type,
    constitution: isOfficer ? chama.constitution : {
      rosca:    { contributionAmount: chama.constitution?.rosca?.contributionAmount },
      welfare:  { approvalThreshold: chama.constitution?.welfare?.approvalThreshold,
                  allowedTypes:      chama.constitution?.welfare?.allowedTypes },
    },
  });
}));

// PUT /chamas/:chamaId/settings
// Financial/threshold changes should go through governance vote — this handles
// only cosmetic/non-financial settings (name, type).
router.put('/settings', authenticate, requireRole('admin','chairman'), catchAsync(async (req, res) => {
  const { name, type } = req.body;
  const chama = await prisma.chama.update({
    where: { id: req.params.chamaId },
    data: { ...(name && { name }), ...(type && { type }) },
  });
  await audit({ eventType: 'SettingsUpdated', chamaId: chama.id, actorId: req.user.id, payload: req.body });
  res.json({ chama });
}));

// ─── Reports ─────────────────────────────────────────────────────────────────

// GET /chamas/:chamaId/reports/financial
router.get('/reports/financial', authenticate, requireRole('treasurer','chairman','admin'), catchAsync(async (req, res) => {
  const chamaId = req.params.chamaId;
  const { period = 'month' } = req.query;

  const from = new Date();
  if (period === 'week')  from.setDate(from.getDate() - 7);
  if (period === 'month') from.setMonth(from.getMonth() - 1);
  if (period === 'year')  from.setFullYear(from.getFullYear() - 1);

  const [totalIn, totalOut, byType, wallets] = await Promise.all([
    prisma.transaction.aggregate({
      where: { chamaId, type: { in: ['deposit','contribution'] }, status: 'completed', createdAt: { gte: from } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { chamaId, type: { in: ['payout','welfare_claim','withdrawal'] }, status: 'completed', createdAt: { gte: from } },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ['type'], where: { chamaId, status: 'completed', createdAt: { gte: from } },
      _sum: { amount: true },
    }),
    prisma.wallet.findMany({ where: { chamaId } }),
  ]);

  res.json({
    period,
    totalInflow:  Number(totalIn._sum.amount  || 0),
    totalOutflow: Number(totalOut._sum.amount || 0),
    byType: byType.map(r => ({ type: r.type, amount: Number(r._sum.amount || 0) })),
    wallets: wallets.map(w => ({ ...w, balance: Number(w.balance) })),
  });
}));

// GET /chamas/:chamaId/reports/members
router.get('/reports/members', authenticate, requireRole('treasurer','chairman','admin'), catchAsync(async (req, res) => {
  const chamaId = req.params.chamaId;

  const members = await prisma.membership.findMany({
    where: { chamaId },
    include: {
      user: { select: { fullName: true, phone: true, email: true } },
      _count: { select: { contributionRecords: true, welfareClaims: true } },
    },
  });

  res.json({ members });
}));

module.exports = router;
