# FundLoop — Chama Management Frontend

A React frontend for managing chamas (ROSCA, welfare, loans, governance) for Kenyan investment groups. Talks to your backend via a REST API — no mock data, no hardcoded numbers.

## Setup

```bash
npm install
cp .env.example .env   # then set VITE_API_BASE_URL to your backend
npm run dev
```

## Backend contract

The frontend expects your API to expose the following routes under `VITE_API_BASE_URL` (default `http://localhost:3000/api`). All authenticated routes expect `Authorization: Bearer <token>`.

### Auth
- `POST /auth/login` — `{ identifier, password }` → `{ token, user, chama? }`
- `POST /auth/register` — `{ name, email, phone, password }` → `{ token, user }`
- `GET  /auth/me` → `{ user }`
- `POST /auth/logout`
- `POST /auth/forgot-password` — `{ email }`
- `PUT  /auth/password` — change password
- `PUT  /auth/profile` — update profile

### Chamas
- `GET    /chamas` → `{ chamas: [...] }`
- `POST   /chamas` — create
- `GET    /chamas/:id`
- `PUT    /chamas/:id`
- `DELETE /chamas/:id`

### Dashboard
- `GET /chamas/:id/dashboard` — admin overview: `{ stats, actionItems, recentActivity }`
- `GET /chamas/:id/member-dashboard` — member overview: `{ wallet, rosca, activeLoan, nextPayout, transactions, totalTransactions }`

### Members
- `GET    /chamas/:id/members`
- `POST   /chamas/:id/members/invite`
- `PATCH  /chamas/:id/members/:memberId/approve`
- `PATCH  /chamas/:id/members/:memberId/suspend`
- `DELETE /chamas/:id/members/:memberId`

### ROSCA
- `GET  /chamas/:id/rosca` → `{ cycles: [...], stats }`
- `POST /chamas/:id/rosca` — create cycle
- `POST /chamas/:id/rosca/:cycleId/contribute`
- `POST /chamas/:id/rosca/:cycleId/payout`

### Loans
- `GET   /chamas/:id/loans` → `{ loans: [...], stats }`
- `POST  /chamas/:id/loans` — apply
- `PATCH /chamas/:id/loans/:loanId/approve`
- `PATCH /chamas/:id/loans/:loanId/reject`
- `PATCH /chamas/:id/loans/:loanId/disburse`
- `POST  /chamas/:id/loans/:loanId/repay`

### Welfare
- `GET   /chamas/:id/welfare/claims`
- `GET   /chamas/:id/welfare/balance`
- `POST  /chamas/:id/welfare/claims` — submit claim
- `PATCH /chamas/:id/welfare/claims/:claimId/approve`
- `PATCH /chamas/:id/welfare/claims/:claimId/reject`

### Governance
- `GET   /chamas/:id/governance/proposals` → `{ stats, active: [...], history: [...] }`
- `POST  /chamas/:id/governance/proposals` — propose motion
- `POST  /chamas/:id/governance/proposals/:id/vote` — `{ choice: 'yes'|'no'|'abstain' }`

### Transactions
- `GET  /chamas/:id/transactions?page=&limit=&category=&status=&from=&to=`
- `POST /chamas/:id/transactions/topup` — M-PESA STK push
- `POST /chamas/:id/transactions/withdraw`
- `POST /chamas/:id/transactions/transfer`
- `GET  /chamas/:id/transactions/export?format=csv|pdf`

### Settings
- `GET /chamas/:id/settings`
- `PUT /chamas/:id/settings`

See `src/api/client.js` for the exact function signatures used throughout the app — every page calls through this single file, so adjusting paths there is the only change needed to match a different backend shape.

## Architecture

- `src/api/client.js` — single fetch wrapper + all endpoint functions. Reads the JWT from `localStorage` and attaches it automatically; a 401 response clears the session and redirects to `/login`.
- `src/context/AuthContext.jsx` — auth state, login/logout, active chama selection.
- `src/hooks/useApi.js` — `useApi` (GET with loading/error/refetch) and `useMutation` (POST/PATCH/DELETE with loading/error).
- `src/components/UI.jsx` — shared primitives: `Modal`, `toast()`, `StatusBadge`, `EmptyState`, `PageLoader`, `ErrorBanner`.
- `src/components/ProtectedRoute.jsx` — route guard; `adminOnly` prop restricts to admin/treasurer/chairman roles.

## Routes

| Path | Access | Page |
|---|---|---|
| `/` | public | Landing page |
| `/login` | public | Sign in |
| `/forgot-password` | public | Password reset request |
| `/setup` | public | Multi-step Chama + account creation |
| `/portal` | auth | Multi-chama switcher |
| `/dashboard/admin` | admin | Admin overview |
| `/dashboard/member` | auth | Member overview |
| `/rosca` | auth | ROSCA cycles |
| `/welfare` | auth | Welfare claims |
| `/loans` | auth | Loan portfolio |
| `/transactions` | auth | Full transaction ledger |
| `/members` | admin | Member roster |
| `/governance` | auth | Proposals & voting |
| `/settings` | auth | Chama settings |

All `auth`/`admin` routes redirect unauthenticated users to `/login` (preserving the original destination), and redirect non-admins away from admin-only pages.
