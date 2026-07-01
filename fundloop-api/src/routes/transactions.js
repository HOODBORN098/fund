const router = require('express').Router({ mergeParams: true });
const prisma = require('../utils/prisma');
const { authenticate, requireRole, requireActive } = require('../middleware/auth');
const { AppError, catchAsync } = require('../utils/errors');
const { audit, emitEvent } = require('../utils/audit');
const { atomicTransfer, getOrCreateWallet } = require('../utils/wallet');
const { sendSMS, SMS } = require('../utils/sms');

// GET /chamas/:chamaId/transactions
router.get('/', authenticate, catchAsync(async (req, res) => {
  const { page = 1, limit = 15, category, status, from, to } = req.query;
  const chamaId = req.params.chamaId;

  const where = { chamaId };
  if (category && category !== 'all') where.type = category;
  if (status   && status   !== 'all') where.status = status;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to)   where.createdAt.lte = new Date(to);
  }

  const [total, transactions] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where, orderBy: { createdAt: 'desc' },
      skip:  (Number(page) - 1) * Number(limit),
      take:   Number(limit),
    }),
  ]);

  res.json({ transactions: transactions.map(serializeTxn), total, page: Number(page), limit: Number(limit) });
}));

// GET /chamas/:chamaId/transactions/export
router.get('/export', authenticate, catchAsync(async (req, res) => {
  const chamaId = req.params.chamaId;
  const transactions = await prisma.transaction.findMany({
    where: { chamaId }, orderBy: { createdAt: 'desc' }, take: 1000,
  });

  const csv = [
    'Date,Reference,Type,Amount,Status',
    ...transactions.map(t =>
      `${t.createdAt.toISOString()},${t.reference || t.id},${t.type},${Number(t.amount)},${t.status}`
    ),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="fundloop-transactions.csv"`);
  res.send(csv);
}));

// GET /chamas/:chamaId/transactions/:id
router.get('/:id', authenticate, catchAsync(async (req, res) => {
  const txn = await prisma.transaction.findUniqueOrThrow({ where: { id: req.params.id } });
  res.json(serializeTxn(txn));
}));

// POST /chamas/:chamaId/transactions/topup
// WF-FIN-001: M-Pesa / card deposit into member wallet
router.post('/topup', authenticate, requireActive, catchAsync(async (req, res) => {
  const { amount, paymentMethod = 'MPESA' } = req.body;
  const idempotencyKey = req.headers['idempotency-key'];
  const chamaId = req.params.chamaId;

  if (!amount || Number(amount) <= 0) throw new AppError('Amount must be positive');
  const amountBig = BigInt(Math.round(Number(amount)));

  // In dev: simulate instant success. In prod: initiate STK push, handle via webhook.
  const memberWallet = await getOrCreateWallet(null, { ownerType: 'member', ownerId: req.user.id, chamaId });
  const chamaWallet  = await prisma.wallet.findFirst({ where: { ownerType: 'chama_general', ownerId: chamaId } });

  if (!chamaWallet) throw new AppError('Chama wallet not found');

  const txn = await prisma.$transaction(async (tx) => {
    // Just credit the member wallet directly (simulating a confirmed gateway callback)
    await tx.wallet.update({ where: { id: memberWallet.id }, data: { balance: { increment: amountBig } } });

    const newBalance = memberWallet.balance + amountBig;
    const t = await tx.transaction.create({
      data: { chamaId, type: 'deposit', toWalletId: memberWallet.id, amount: amountBig,
              status: 'completed', idempotencyKey, actorId: req.user.id,
              metadata: { paymentMethod }, completedAt: new Date() },
    });
    await tx.ledgerEntry.create({
      data: { transactionId: t.id, walletId: memberWallet.id, direction: 'credit', amount: amountBig, balanceAfter: newBalance },
    });

    // EVT-FIN-001 WalletTopUp
    await emitEvent({ eventType: 'WalletTopUp', chamaId, actorId: req.user.id, payload: { amount: Number(amountBig) }, tx });
    await audit({ eventType: 'WalletTopUp', chamaId, actorId: req.user.id, payload: { amount: Number(amountBig) }, tx });

    return t;
  });

  await sendSMS(req.user.phone, SMS.walletTopUp(Number(amountBig)));
  res.status(201).json(serializeTxn(txn));
}));

// POST /chamas/:chamaId/transactions/withdraw
router.post('/withdraw', authenticate, requireActive, catchAsync(async (req, res) => {
  // Stub — actual M-Pesa B2C integration goes here
  throw new AppError('Withdraw not yet implemented', 501);
}));

// POST /chamas/:chamaId/transactions/transfer
router.post('/transfer', authenticate, requireRole('treasurer','admin'), catchAsync(async (req, res) => {
  const { fromWalletId, toWalletId, amount } = req.body;
  if (!fromWalletId || !toWalletId || !amount) throw new AppError('fromWalletId, toWalletId, and amount required');

  const txn = await prisma.$transaction(async (tx) => {
    const t = await atomicTransfer(tx, {
      fromWalletId, toWalletId,
      amount: BigInt(Math.round(Number(amount))),
      type: 'transfer', chamaId: req.params.chamaId, actorId: req.user.id,
    });
    await audit({ eventType: 'TransferMade', chamaId: req.params.chamaId, actorId: req.user.id,
                  payload: { fromWalletId, toWalletId, amount: Number(amount) }, tx });
    return t;
  });

  res.status(201).json(serializeTxn(txn));
}));

// POST /chamas/:chamaId/transactions/:id/reverse
// BR-FIN-002: completed transactions cannot be edited — create a reversal transaction instead.
// WF-FIN-002: treasurer/admin only.
router.post('/:id/reverse', authenticate, requireRole('treasurer','admin'), catchAsync(async (req, res) => {
  const { reason } = req.body;
  if (!reason) throw new AppError('Reversal reason required');

  const original = await prisma.transaction.findUniqueOrThrow({ where: { id: req.params.id } });

  if (original.chamaId !== req.params.chamaId) throw new AppError('Transaction not in this chama', 403);
  if (original.status !== 'completed') throw new AppError('Only completed transactions can be reversed', 409);
  if (original.reversedById) throw new AppError('Transaction has already been reversed', 409);

  const result = await prisma.$transaction(async (tx) => {
    // Reverse the wallet movements
    const reversal = await atomicTransfer(tx, {
      fromWalletId: original.toWalletId,
      toWalletId:   original.fromWalletId,
      amount: original.amount,
      type: 'reversal',
      chamaId: original.chamaId,
      actorId: req.user.id,
      metadata: { reversesId: original.id, reason },
    });

    // Link the two transactions
    await tx.transaction.update({ where: { id: reversal.id   }, data: { reversesId: original.id } });
    await tx.transaction.update({ where: { id: original.id   }, data: { status: 'reversed', reversedById: reversal.id } });

    // EVT-FIN-003 TransactionReversed — HIGH PRIORITY audit
    await emitEvent({ eventType: 'TransactionReversed', chamaId: original.chamaId, actorId: req.user.id,
                      payload: { originalId: original.id, amount: Number(original.amount), reason }, tx });
    await audit({ eventType: 'TransactionReversed', chamaId: original.chamaId, actorId: req.user.id,
                  subjectType: 'Transaction', subjectId: original.id,
                  payload: { reason, reversalId: reversal.id }, tx });

    return reversal;
  });

  // Notify affected member (best-effort — don't crash if no user found)
  try {
    if (original.metadata?.userId) {
      const u = await prisma.user.findUnique({ where: { id: original.metadata.userId } });
      if (u) await sendSMS(u.phone, SMS.transactionReversed(Number(original.amount), reason));
    }
  } catch {}

  res.status(201).json(serializeTxn(result));
}));

function serializeTxn(t) {
  return { ...t, amount: Number(t.amount) };
}

module.exports = router;
