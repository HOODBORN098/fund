const { verifyToken } = require('../utils/jwt');
const prisma = require('../utils/prisma');
const { AppError } = require('../utils/errors');

/**
 * Authenticate every request.
 * Attaches req.user (User row) and req.membership (for the chamaId in the route).
 */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return next(new AppError('No token provided', 401));
    }

    const token = header.slice(7);
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return next(new AppError('Invalid or expired token', 401));
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) return next(new AppError('User not found', 401));

    req.user = user;

    // If route has a :chamaId param, load this user's membership for that chama
    const chamaId = req.params.chamaId || req.params.cid;
    if (chamaId) {
      const membership = await prisma.membership.findUnique({
        where: { userId_chamaId: { userId: user.id, chamaId } },
      });
      if (!membership) return next(new AppError('You are not a member of this chama', 403));
      if (membership.status === 'suspended') return next(new AppError('Your membership is suspended', 403));
      if (membership.status === 'removed') return next(new AppError('Your membership has been removed', 403));
      req.membership = membership;
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Role-based access control.
 * Usage: requireRole('treasurer', 'admin')
 * Matches your frontend canManageRosca / canManageMembers / canVetoClaim flags.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.membership) return next(new AppError('Membership context required', 403));
    if (!roles.includes(req.membership.role)) {
      return next(new AppError(`Requires role: ${roles.join(' or ')}`, 403));
    }
    next();
  };
}

/**
 * Require active membership status for any write action.
 * BR-MEM-004: suspended members cannot contribute, vote, or receive payouts.
 */
function requireActive(req, res, next) {
  if (!req.membership) return next(new AppError('Membership context required', 403));
  if (req.membership.status !== 'active') {
    return next(new AppError('Only active members can perform this action', 403));
  }
  next();
}

module.exports = { authenticate, requireRole, requireActive };
