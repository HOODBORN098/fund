const { AppError } = require('./errors');
const { audit, emitEvent } = require('./audit');

/**
 * Atomic debit + credit between two wallets.
 * ALWAYS call this inside an existing prisma.$transaction — never standalone.
 * BR-FIN-004: debit and credit must succeed together.
 * BR-FIN-001: wallet balance cannot go below zero (enforced by CHECK constraint + this check).
 * BR-FIN-005: every movement gets a ledger entry.
 *
 * @param {Object} tx         - prisma transaction client
 * @param {Object} opts
 * @param {string} opts.fromWalletId
 * @param {string} opts.toWalletId
 * @param {bigint} opts.amount
 * @param {string} opts.type  - TransactionType enum value
 * @param {string} opts.chamaId
 * @param {string} [opts.actorId]
 * @param {string} [opts.idempotencyKey]
 * @param {Object} [opts.metadata]
 * @returns {Promise<Transaction>}
 */
async function atomicTransfer(tx, { fromWalletId, toWalletId, amount, type, chamaId, actorId, idempotencyKey, metadata = {} }) {
  if (amount <= 0n) throw new AppError('Transfer amount must be positive');

  // Check idempotency (BR-FIN-003)
  if (idempotencyKey) {
    const existing = await tx.transaction.findUnique({ where: { idempotencyKey } });
    if (existing) return existing;
  }

  // Lock and read source wallet
  const fromWallet = await tx.wallet.findUniqueOrThrow({ where: { id: fromWalletId } });
  if (fromWallet.balance < amount) throw new AppError('Insufficient wallet balance', 400);

  const toWallet = await tx.wallet.findUniqueOrThrow({ where: { id: toWalletId } });

  const newFromBalance = fromWallet.balance - amount;
  const newToBalance   = toWallet.balance   + amount;

  // Debit source
  await tx.wallet.update({ where: { id: fromWalletId }, data: { balance: newFromBalance } });
  // Credit destination
  await tx.wallet.update({ where: { id: toWalletId   }, data: { balance: newToBalance   } });

  // Record transaction
  const txn = await tx.transaction.create({
    data: {
      chamaId, type, fromWalletId, toWalletId,
      amount, status: 'completed', idempotencyKey,
      actorId, metadata, completedAt: new Date(),
    },
  });

  // Immutable ledger entries (BR-FIN-005)
  await tx.ledgerEntry.createMany({
    data: [
      { transactionId: txn.id, walletId: fromWalletId, direction: 'debit',  amount, balanceAfter: newFromBalance },
      { transactionId: txn.id, walletId: toWalletId,   direction: 'credit', amount, balanceAfter: newToBalance   },
    ],
  });

  return txn;
}

/**
 * Find or create a wallet for the given owner.
 */
async function getOrCreateWallet(tx, { ownerType, ownerId, chamaId, currency = 'KES' }) {
  const existing = await tx.wallet.findFirst({
    where: { ownerType, ownerId, chamaId: chamaId || null },
  });
  if (existing) return existing;

  return tx.wallet.create({
    data: { ownerType, ownerId, chamaId, currency, balance: 0n },
  });
}

module.exports = { atomicTransfer, getOrCreateWallet };
