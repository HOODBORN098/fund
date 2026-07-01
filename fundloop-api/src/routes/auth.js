const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../utils/prisma');
const { signToken } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');
const { AppError, catchAsync } = require('../utils/errors');
const { z } = require('zod');
const { audit } = require('../utils/audit');

const registerSchema = z.object({
  fullName: z.string().min(2),
  email:    z.string().email(),
  phone:    z.string().min(9),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

// POST /auth/register
router.post('/register', catchAsync(async (req, res) => {
  const data = registerSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: { fullName: data.fullName, email: data.email, phone: data.phone, passwordHash },
  });

  const token = signToken({ sub: user.id });
  await audit({ eventType: 'UserRegistered', actorId: user.id, payload: { email: user.email } });

  res.status(201).json({ token, user: safeUser(user) });
}));

// POST /auth/login
router.post('/login', catchAsync(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) throw new AppError('Invalid email or password', 401);

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) throw new AppError('Invalid email or password', 401);

  const token = signToken({ sub: user.id });

  // Return memberships so frontend can show chama switcher
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, status: { in: ['active', 'pending'] } },
    include: { chama: true },
  });

  res.json({ token, user: safeUser(user), memberships });
}));

// POST /auth/logout
router.post('/logout', authenticate, catchAsync(async (req, res) => {
  // Stateless JWT: just acknowledge. If you add refresh tokens,
  // delete the session row here.
  res.status(204).send();
}));

// GET /auth/me
router.get('/me', authenticate, catchAsync(async (req, res) => {
  const memberships = await prisma.membership.findMany({
    where: { userId: req.user.id, status: { in: ['active', 'pending', 'invited'] } },
    include: { chama: true },
  });
  res.json({ user: safeUser(req.user), memberships });
}));

// POST /auth/forgot-password
router.post('/forgot-password', catchAsync(async (req, res) => {
  // Always 200 — don't leak whether the email exists (BR: security)
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    // TODO: generate a reset token, store it, send SMS/email
    // For now: stub
    console.log(`[STUB] Password reset requested for ${email}`);
  }
  res.json({ message: 'If that email exists, a reset link has been sent.' });
}));

// POST /auth/reset-password
router.post('/reset-password', catchAsync(async (req, res) => {
  const { token, newPassword } = req.body;
  // TODO: validate the reset token, find the user, update password
  // Stub for now
  throw new AppError('Password reset not yet implemented', 501);
}));

// PUT /auth/password
router.put('/password', authenticate, catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new AppError('Both passwords required');

  const valid = await bcrypt.compare(currentPassword, req.user.passwordHash);
  if (!valid) throw new AppError('Current password is incorrect', 401);

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const updated = await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } });

  await audit({ eventType: 'PasswordChanged', actorId: req.user.id });
  res.json({ user: safeUser(updated) });
}));

// PUT /auth/profile
router.put('/profile', authenticate, catchAsync(async (req, res) => {
  const { fullName, phone } = req.body;
  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: { ...(fullName && { fullName }), ...(phone && { phone }) },
  });
  res.json({ user: safeUser(updated) });
}));

function safeUser(u) {
  const { passwordHash, ...safe } = u;
  return safe;
}

module.exports = router;
