const router = require('express').Router({ mergeParams: true });
const { v4: uuidv4 } = require('uuid');
const prisma = require('../utils/prisma');
const { authenticate, requireRole, requireActive } = require('../middleware/auth');
const { AppError, catchAsync } = require('../utils/errors');
const { audit, emitEvent } = require('../utils/audit');
const { sendSMS, SMS } = require('../utils/sms');

// GET /chamas/:chamaId/members
router.get('/', authenticate, catchAsync(async (req, res) => {
  const memberships = await prisma.membership.findMany({
    where: { chamaId: req.params.chamaId },
    include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
  });
  res.json({ members: memberships });
}));

// GET /chamas/:chamaId/members/:id
router.get('/:id', authenticate, catchAsync(async (req, res) => {
  const membership = await prisma.membership.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
  });
  res.json(membership);
}));

// POST /chamas/:chamaId/members/invite
router.post('/invite', authenticate, requireActive, catchAsync(async (req, res) => {
  const { name, phone, email, role = 'member' } = req.body;
  if (!phone) throw new AppError('Phone number required');

  const chamaId = req.params.chamaId;
  const chama = await prisma.chama.findUniqueOrThrow({ where: { id: chamaId } });

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invitation = await prisma.invitation.create({
    data: { chamaId, inviterId: req.user.id, phone, email, proposedRole: role, token, expiresAt },
  });

  // EVT-MEM-004 InvitationSent
  const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/join?token=${token}`;
  await sendSMS(phone, SMS.invitationSent(chama.name, inviteLink));
  await audit({ eventType: 'InvitationSent', chamaId, actorId: req.user.id, payload: { phone, role }, tx: null });

  res.status(201).json({ invitation, inviteLink });
}));

// PATCH /chamas/:chamaId/members/:id/approve
// WF-MEM-001 — approve a pending membership
// BR: chairman/admin only (canManageMembers on frontend)
router.patch('/:id/approve', authenticate, requireRole('chairman','admin'), catchAsync(async (req, res) => {
  const chamaId = req.params.chamaId;
  const membership = await prisma.membership.findUniqueOrThrow({ where: { id: req.params.id } });

  if (membership.status !== 'pending') throw new AppError('Member is not in pending status');

  const updated = await prisma.$transaction(async (tx) => {
    const m = await tx.membership.update({
      where: { id: membership.id },
      data: { status: 'active', joinedAt: new Date() },
      include: { user: true, chama: true },
    });

    // EVT-MEM-001 MemberJoined
    await emitEvent({ eventType: 'MemberJoined', chamaId, actorId: req.user.id, payload: { memberId: m.userId, role: m.role }, tx });
    await audit({ eventType: 'MemberJoined', chamaId, actorId: req.user.id, subjectId: m.id, tx });
    await sendSMS(m.user.phone, SMS.memberJoined(m.chama.name));

    return m;
  });

  res.json(updated);
}));

// PATCH /chamas/:chamaId/members/:id/suspend
// WF-MEM-002 — chairman/admin only (NOT treasurer — BR-MEM-003)
router.patch('/:id/suspend', authenticate, requireRole('chairman','admin'), catchAsync(async (req, res) => {
  const chamaId = req.params.chamaId;
  const { reason } = req.body;
  if (!reason) throw new AppError('Suspension reason required');

  const membership = await prisma.membership.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { user: true },
  });

  if (membership.status !== 'active') throw new AppError('Member is not active');

  const updated = await prisma.$transaction(async (tx) => {
    const m = await tx.membership.update({
      where: { id: membership.id },
      data: { status: 'suspended', suspendedAt: new Date(), suspendedById: req.user.id, suspendedReason: reason },
    });

    // Mark any open rotation positions ineligible
    await tx.rotationPosition.updateMany({
      where: { membershipId: m.id, status: 'pending' },
      data: { status: 'ineligible' },
    });

    // Freeze pending welfare claims
    await tx.welfareClaim.updateMany({
      where: { claimantMembershipId: m.id, status: 'pending_approval' },
      data: { status: 'rejected', rejectedReason: 'Member suspended' },
    });

    // EVT-MEM-002 MemberSuspended
    await emitEvent({ eventType: 'MemberSuspended', chamaId, actorId: req.user.id, payload: { memberId: m.userId, reason }, tx });
    await audit({ eventType: 'MemberSuspended', chamaId, actorId: req.user.id, subjectId: m.id, payload: { reason }, tx });
    await sendSMS(membership.user.phone, SMS.memberSuspended());

    return m;
  });

  res.json(updated);
}));

// DELETE /chamas/:chamaId/members/:id
router.delete('/:id', authenticate, requireRole('chairman','admin'), catchAsync(async (req, res) => {
  const updated = await prisma.membership.update({
    where: { id: req.params.id },
    data: { status: 'removed' },
  });
  await audit({ eventType: 'MemberRemoved', chamaId: req.params.chamaId, actorId: req.user.id, subjectId: req.params.id });
  res.json({ message: 'Member removed', membership: updated });
}));

module.exports = router;
