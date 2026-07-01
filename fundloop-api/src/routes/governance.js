const router = require('express').Router({ mergeParams: true });
const prisma = require('../utils/prisma');
const { authenticate, requireRole, requireActive } = require('../middleware/auth');
const { AppError, catchAsync } = require('../utils/errors');
const { audit, emitEvent } = require('../utils/audit');
const { sendSMS, SMS } = require('../utils/sms');

// GET /chamas/:chamaId/governance/proposals
router.get('/proposals', authenticate, catchAsync(async (req, res) => {
  const chamaId = req.params.chamaId;

  const [totalMembers, votes] = await Promise.all([
    prisma.membership.count({ where: { chamaId, status: 'active' } }),
    prisma.vote.findMany({
      where: { chamaId, subjectType: { in: ['motion','rule_change'] } },
      include: { ballots: true, createdBy: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const format = v => {
    const approvals = v.ballots.filter(b => b.choice === 'approve').length;
    const myBallot  = v.ballots.find(b => b.membershipId === req.membership.id);
    return {
      id: v.id, title: v.title, description: v.description,
      category: v.subjectType, status: v.status, deadline: v.deadline,
      requiredThreshold: Number(v.requiredThreshold),
      approvalCount: approvals, totalVoters: totalMembers,
      approvalPercent: totalMembers > 0 ? Math.round((approvals / totalMembers) * 100) : 0,
      hasVoted: !!myBallot, voteChoice: myBallot?.choice || null,
      createdBy: v.createdBy?.fullName, createdAt: v.createdAt,
    };
  };

  const active  = votes.filter(v => v.status === 'open').map(format);
  const history = votes.filter(v => v.status !== 'open').map(format);

  // Stats for GovernancePage stat cards
  const participationRates = votes.map(v => (totalMembers > 0 ? v.ballots.length / totalMembers : 0));
  const avgParticipation   = participationRates.length > 0
    ? participationRates.reduce((a, b) => a + b, 0) / participationRates.length : 0;

  res.json({
    stats: { quorum: 0.6, eligibleVoters: totalMembers, avgParticipation, avgParticipationPercent: Math.round(avgParticipation * 100) },
    active,
    history,
  });
}));

// GET /chamas/:chamaId/governance/proposals/:id
router.get('/proposals/:id', authenticate, catchAsync(async (req, res) => {
  const vote = await prisma.vote.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { ballots: true },
  });
  res.json(vote);
}));

// POST /chamas/:chamaId/governance/proposals
// WF-GOV-001
router.post('/proposals', authenticate, requireActive, catchAsync(async (req, res) => {
  const chamaId = req.params.chamaId;
  const { title, description, category = 'motion', deadline } = req.body;
  if (!title) throw new AppError('Proposal title required');

  const chama = await prisma.chama.findUniqueOrThrow({ where: { id: chamaId } });
  const gov = chama.constitution?.governance || {};

  // Constitutional changes need 75% threshold (BR-GOV-003)
  const requiredThreshold = category === 'rule_change'
    ? (gov.constitutionalThreshold || 0.75)
    : (gov.simpleMajority || 0.501);

  const vote = await prisma.$transaction(async (tx) => {
    const v = await tx.vote.create({
      data: {
        chamaId, subjectType: category, subjectId: 'standalone',
        title, description, requiredThreshold,
        deadline: deadline ? new Date(deadline) : null,
        createdById: req.user.id,
      },
    });

    await emitEvent({ eventType: 'ProposalCreated', chamaId, actorId: req.user.id,
                      payload: { voteId: v.id, title, category }, tx });
    await audit({ eventType: 'ProposalCreated', chamaId, actorId: req.user.id, subjectId: v.id, tx });

    return v;
  });

  // Notify all members
  const allMembers = await prisma.membership.findMany({ where: { chamaId, status: 'active' }, include: { user: true } });
  for (const m of allMembers) {
    await sendSMS(m.user.phone, SMS.voteRequired(title));
  }

  res.status(201).json(vote);
}));

// POST /chamas/:chamaId/governance/proposals/:id/vote
router.post('/proposals/:id/vote', authenticate, requireActive, catchAsync(async (req, res) => {
  const chamaId = req.params.chamaId;
  const { choice } = req.body;
  if (!['approve','reject','abstain'].includes(choice)) throw new AppError('Choice must be approve, reject, or abstain');

  const vote = await prisma.vote.findUniqueOrThrow({ where: { id: req.params.id }, include: { ballots: true } });
  if (vote.chamaId !== chamaId) throw new AppError('Not in this chama', 403);
  if (vote.status !== 'open') throw new AppError('Vote is closed');

  const totalActive = await prisma.membership.count({ where: { chamaId, status: 'active' } });

  const updated = await prisma.$transaction(async (tx) => {
    // UNIQUE constraint prevents double-voting
    await tx.voteBallot.create({ data: { voteId: vote.id, membershipId: req.membership.id, choice } });

    const allBallots = await tx.voteBallot.findMany({ where: { voteId: vote.id } });
    const approvals  = allBallots.filter(b => b.choice === 'approve').length;
    const approvalRate = totalActive > 0 ? approvals / totalActive : 0;

    await emitEvent({ eventType: 'VoteCast', chamaId, actorId: req.user.id,
                      payload: { voteId: vote.id, choice, approvalRate }, tx });
    await audit({ eventType: 'VoteCast', chamaId, actorId: req.user.id, subjectId: vote.id,
                  payload: { choice, approvalRate }, tx });

    if (approvalRate >= Number(vote.requiredThreshold)) {
      await tx.vote.update({ where: { id: vote.id }, data: { status: 'passed', closedAt: new Date() } });

      // EVT-GOV-002 RuleChanged — if it's a rule_change type, update the rules table
      if (vote.subjectType === 'rule_change') {
        await emitEvent({ eventType: 'RuleChanged', chamaId, actorId: req.user.id,
                          payload: { voteId: vote.id }, tx });
        await audit({ eventType: 'RuleChanged', chamaId, actorId: req.user.id, subjectId: vote.id, tx });
      }
    }

    return approvalRate;
  });

  res.json({ message: `Vote recorded: ${choice}`, approvalRate: updated });
}));

// PATCH /chamas/:chamaId/governance/proposals/:id/close
router.patch('/proposals/:id/close', authenticate, requireRole('chairman','admin'), catchAsync(async (req, res) => {
  const vote = await prisma.vote.update({
    where: { id: req.params.id },
    data: { status: 'closed', closedAt: new Date() },
  });
  await audit({ eventType: 'VoteClosed', chamaId: req.params.chamaId, actorId: req.user.id, subjectId: vote.id });
  res.json(vote);
}));

// GET /chamas/:chamaId/governance/meetings
router.get('/meetings', authenticate, catchAsync(async (req, res) => {
  res.json({ meetings: [] }); // Stub — meetings feature not in current frontend scope
}));

// POST /chamas/:chamaId/governance/meetings
router.post('/meetings', authenticate, requireRole('chairman','admin'), catchAsync(async (req, res) => {
  throw new AppError('Meetings not yet implemented', 501);
}));

module.exports = router;
