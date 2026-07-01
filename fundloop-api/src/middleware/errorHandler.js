const { AppError } = require('../utils/errors');

function errorHandler(err, req, res, next) {
  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    return res.status(409).json({ error: `Duplicate value for ${field}` });
  }
  // Prisma not found
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }
  // Zod validation
  if (err.name === 'ZodError') {
    return res.status(422).json({ error: 'Validation failed', details: err.errors });
  }
  // Our own AppError
  if (err.isOperational) {
    return res.status(err.statusCode || 400).json({ error: err.message });
  }

  // Unexpected errors — don't leak internals in production
  console.error('[UNHANDLED ERROR]', err);
  const msg = process.env.NODE_ENV === 'development' ? err.message : 'Internal server error';
  res.status(500).json({ error: msg });
}

module.exports = errorHandler;
