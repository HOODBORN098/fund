# FundLoop API — Setup Guide

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ running locally
- npm

---

## 1. Create the database

Open psql as the postgres user and create the database:

```bash
psql -U postgres -c "CREATE DATABASE fundloop;"
```

If you get an access error:

```bash
sudo -u postgres psql -c "CREATE DATABASE fundloop;"
```

---

## 2. Configure environment

Copy the env file:

```bash
cp .env.example .env
```

The `.env` already ships with the right values for local development:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fundloop?schema=public"
PORT=3000
FRONTEND_URL=http://localhost:5173
```

Change `JWT_SECRET` to something long and random before deploying to production.

---

## 3. Install dependencies

```bash
npm install
```

---

## 4. Run database migrations

This creates all tables (users, wallets, transactions, rosca_cycles, welfare_claims, votes, etc.):

```bash
npx prisma migrate dev --name init
```

If it asks for a migration name just type `init`.

---

## 5. Seed the database

Creates a test chama with 5 members and pre-funded wallets:

```bash
npm run db:seed
```

You'll see these login credentials printed out:

| Email | Role | Password |
|---|---|---|
| chairman@fundloop.dev | chairman | password123 |
| treasurer@fundloop.dev | treasurer | password123 |
| member1@fundloop.dev | member | password123 |
| member2@fundloop.dev | member | password123 |
| member3@fundloop.dev | member | password123 |

Each member wallet starts at KES 10,000. The welfare pool starts at KES 50,000.

---

## 6. Start the server

Development (auto-restarts on file changes):

```bash
npm run dev
```

Production:

```bash
npm start
```

Server runs on `http://localhost:3000`.

Health check: `GET http://localhost:3000/health` → `{ "status": "ok" }`

---

## 7. Connect the frontend

In your `fundloop-react` project, the `.env` already points here:

```
VITE_API_BASE_URL=http://localhost:5173/api
```

Change it to:

```
VITE_API_BASE_URL=http://localhost:3000/api
```

Then start the frontend normally:

```bash
npm run dev
```

---

## Full startup sequence (both running together)

Terminal 1 — backend:
```bash
cd fundloop-api
npm run dev
```

Terminal 2 — frontend:
```bash
cd fundloop-react/fundloop
npm run dev
```

Open `http://localhost:5173`, log in as `treasurer@fundloop.dev` / `password123`.

---

## Prisma commands reference

| Command | What it does |
|---|---|
| `npx prisma migrate dev` | Apply schema changes, create new migration |
| `npx prisma migrate reset` | Drop all tables and re-run all migrations (dev only) |
| `npm run db:seed` | Seed test data |
| `npx prisma studio` | Open browser GUI to browse the database |
| `npx prisma generate` | Regenerate the Prisma client after schema changes |

---

## SMS in development

No Africa's Talking key is needed in dev. All SMS messages log to the terminal instead:

```
[SMS STUB] → +254700000001: ✓ KES 1,000 contribution received for Cycle #1.
```

To enable real SMS, add your Africa's Talking credentials to `.env`:

```
AT_API_KEY=your_key_here
AT_USERNAME=your_username
AT_SENDER_ID=FundLoop
```

---

## M-Pesa in development

The top-up endpoint simulates an instant successful payment in development — no Daraja keys needed. The wallet balance updates immediately.

For production, fill in the M-Pesa Daraja credentials in `.env` and implement the STK push callback at `POST /mpesa/callback` (the route is prepared, the Daraja integration is stubbed).

---

## Common issues

**`ECONNREFUSED` connecting to postgres**
PostgreSQL isn't running. Start it:
```bash
# Ubuntu/Debian
sudo service postgresql start

# macOS (Homebrew)
brew services start postgresql
```

**`P1001: Can't reach database server`**
Check that the `DATABASE_URL` in `.env` matches your postgres host/port/password.

**`P2002: Unique constraint failed` on seed**
The seed uses `upsert` so it's safe to run multiple times. If you hit this, run:
```bash
npx prisma migrate reset
npm run db:seed
```

**Port 3000 already in use**
Change `PORT=3001` in `.env` and update `VITE_API_BASE_URL` in the frontend `.env` to match.
