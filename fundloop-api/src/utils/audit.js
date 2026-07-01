const prisma = require('./prisma');

/**
 * Write an immutable audit log entry.
 * Call this from every service function that mutates state.
 * 
 * @param {Object} opts
 * @param {string} opts.eventType  - e.g. 'MemberJoined', 'PayoutReleased'
 * @param {string} [opts.chamaId]
 * @param {string} [opts.actorId]
 * @param {string} [opts.subjectType] - e.g. 'WelfareClaim'
 * @param {string} [opts.subjectId]
 * @param {Object} [opts.payload]
 * @param {Object} [opts.tx]       - prisma transaction client (if inside a $transaction)
 */
async function audit({ eventType, chamaId, actorId, subjectType, subjectId, payload = {}, tx }) {
  const client = tx || prisma;
  await client.auditLog.create({
    data: { eventType, chamaId, actorId, subjectType, subjectId, payload },
  });
}

/**
 * Write an outbox domain event for async processing (notifications, reporting).
 * Write this INSIDE the same $transaction as the business mutation — that's
 * what gives you the "never lose an event" guarantee.
 */
async function emitEvent({ eventType, chamaId, actorId, payload = {}, correlationId, tx }) {
  const client = tx || prisma;
  await client.domainEvent.create({
    data: { eventType, chamaId, actorId, payload, correlationId },
  });
}

module.exports = { audit, emitEvent };
