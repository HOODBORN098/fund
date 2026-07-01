/**
 * Missed Contribution Background Job
 * WF-ROS-004: When a cycle's contribution deadline passes,
 * find all members who haven't paid and apply penalties per constitution.
 *
 * Runs every hour via cron. In production, consider running this as a
 * separate worker process or a cloud scheduled function.
 */

const cron = require('node-cron');
const prisma = require('../utils/prisma');
const { audit, emitEvent } = require('../utils/audit');
const { sendSMS, SMS } = require('../utils/sms');

async function checkMissedContributions() {
  try {
    const now = new Date();

    // Find open cycles whose deadline has passed
    const overdueCycles = await prisma.roscaCycle.findMany({
      where: { status: 'open', contributionDeadline: { lt: now } },
      include: { chama: true },
    });

    for (const cycle of overdueCycles) {
      const constitution = cycle.chama.constitution?.rosca || {};
      const penaltyType  = constitution.missedPenaltyType || 'fine';
      const fineAmount   = BigInt(constitution.fineAmount || 200);

      // Find all pending (not yet paid) contributions for this cycle
      const missed = await prisma.contributionRecord.findMany({
        where: { cycleId: cycle.id, status: 'pending' },
        include: { membership: { include: { user: true } } },
      });

      for (const record of missed) {
        await prisma.$transaction(async (tx) => {
          // Mark contribution as missed
          await tx.contributionRecord.update({ where: { id: record.id }, data: { status: 'missed' } });

          // Apply penalty
          await tx.penalty.create({
            data: {
              membershipId: record.membershipId,
              cycleId:      cycle.id,
              type:         penaltyType,
              amount:       penaltyType === 'fine' ? fineAmount : null,
            },
          });

          // Mark rotation position ineligible for this cycle (BR-ROSCA-004)
          if (penaltyType === 'skip_turn') {
            await tx.rotationPosition.updateMany({
              where: { cycleId: cycle.id, membershipId: record.membershipId },
              data: { status: 'ineligible' },
            });
          }

          // EVT-ROS-003 ContributionMissed
          await emitEvent({
            eventType: 'ContributionMissed',
            chamaId:   cycle.chamaId,
            payload: { cycleId: cycle.id, memberId: record.membership.userId, penaltyType, fineAmount: Number(fineAmount) },
            tx,
          });
          await audit({
            eventType: 'ContributionMissed',
            chamaId:   cycle.chamaId,
            subjectId: record.id,
            payload: { penaltyType, fineAmount: Number(fineAmount) },
            tx,
          });
        });

        // Notify member
        await sendSMS(record.membership.user.phone, SMS.contributionMissed(cycle.cycleNumber, Number(fineAmount)));
      }

      // Transition cycle status to in_progress (deadline passed, some may have paid)
      await prisma.roscaCycle.update({ where: { id: cycle.id }, data: { status: 'in_progress' } });
    }

    // Process unprocessed domain events (outbox pattern)
    await processOutbox();

  } catch (err) {
    console.error('[CRON ERROR] checkMissedContributions:', err);
  }
}

/**
 * Process pending domain events from the outbox table.
 * This is where you'd dispatch to Notification/Reporting handlers.
 * Currently: just marks them processed (SMS is sent inline in service functions).
 * Expand this as you add async subscribers.
 */
async function processOutbox() {
  const pending = await prisma.domainEvent.findMany({
    where: { processedAt: null, failedAt: null },
    take: 50,
    orderBy: { createdAt: 'asc' },
  });

  for (const evt of pending) {
    try {
      // TODO: add handlers per eventType (Reporting, external webhooks, etc.)
      // e.g. if (evt.eventType === 'PayoutReleased') await updateRoscaReport(evt);

      await prisma.domainEvent.update({
        where: { id: evt.id },
        data:  { processedAt: new Date() },
      });
    } catch (err) {
      await prisma.domainEvent.update({
        where: { id: evt.id },
        data:  { failedAt: new Date(), failureReason: err.message },
      });
    }
  }
}

function startJobs() {
  // Check every hour
  cron.schedule('0 * * * *', () => {
    console.log('[CRON] Running missed contribution check...');
    checkMissedContributions();
  });

  // Process outbox every minute
  cron.schedule('* * * * *', () => {
    processOutbox();
  });

  console.log('[CRON] Background jobs started');
}

module.exports = { startJobs, checkMissedContributions, processOutbox };
