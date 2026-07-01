require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const rateLimit = require('express-rate-limit');

const errorHandler = require('./middleware/errorHandler');
const { startJobs } = require('./jobs/scheduler');

// ─── Routes ───────────────────────────────────────────────────────────────────
const authRoutes         = require('./routes/auth');
const chamaRoutes        = require('./routes/chamas');
const membersRoutes      = require('./routes/members');
const transactionsRoutes = require('./routes/transactions');
const roscaRoutes        = require('./routes/rosca');
const welfareRoutes      = require('./routes/welfare');
const governanceRoutes   = require('./routes/governance');
const dashboardRoutes    = require('./routes/dashboard');
const settingsRoutes     = require('./routes/settingsReports');

const app = express();

// ─── Security / Logging ───────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','Idempotency-Key'],
  credentials: true,
}));

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));

// ─── Rate limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api', limiter);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));

// ─── API Routes ───────────────────────────────────────────────────────────────
// Auth (no chama context)
app.use('/api/auth', authRoutes);

// Chama root-level CRUD
app.use('/api/chamas', chamaRoutes);

// All chama-scoped routes — note: :chamaId param is used by the authenticate
// middleware to load the user's membership/role for that chama
app.use('/api/chamas/:chamaId/dashboard',    dashboardRoutes);
app.use('/api/chamas/:chamaId/member-dashboard', (req, res, next) => {
  // Frontend calls /member-dashboard as a separate path; re-route to dashboard
  req.url = '/member';
  dashboardRoutes(req, res, next);
});
app.use('/api/chamas/:chamaId/members',      membersRoutes);
app.use('/api/chamas/:chamaId/transactions', transactionsRoutes);
app.use('/api/chamas/:chamaId/rosca',        roscaRoutes);
app.use('/api/chamas/:chamaId/welfare',      welfareRoutes);
app.use('/api/chamas/:chamaId/governance',   governanceRoutes);
app.use('/api/chamas/:chamaId',              settingsRoutes);  // settings + reports

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` }));

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 FundLoop API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`   DB:           ${process.env.DATABASE_URL ? '✓ connected' : '✗ DATABASE_URL not set'}\n`);

  if (process.env.NODE_ENV !== 'test') {
    startJobs();
  }
});

module.exports = app;
