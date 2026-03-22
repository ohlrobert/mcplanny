# MCPlanny - Retirement Planning App

## Project Overview
A full-stack retirement financial planning application that helps users model retirement income, expenses, assets, and Monte Carlo simulations for retirement success probability.

## Architecture

### Tech Stack
- **Frontend**: React 18 + Vite + TypeScript + TailwindCSS + Radix UI
- **Backend**: Express 5 + TypeScript (tsx for dev)
- **Database**: PostgreSQL via Drizzle ORM (Replit built-in, `DATABASE_URL` env var)
- **Auth**: Google OAuth 2.0 (server-side flow) + JWT; token persisted in localStorage
- **State**: TanStack Query for server state

### Project Structure
```
/
├── client/           # React frontend (Vite root)
│   ├── index.html
│   └── src/          # React components, pages, hooks
├── server/           # Express backend
│   ├── index.ts      # Entry point - serves on port 5000
│   ├── routes.ts     # All API routes + projection engine
│   ├── storage.ts    # Database access layer (Drizzle/PostgreSQL)
│   ├── vite.ts       # Vite dev middleware integration
│   └── static.ts     # Static file serving (production)
├── shared/
│   └── schema.ts     # Drizzle schema + Zod validation schemas
├── script/
│   └── build.ts      # Production build script
├── drizzle.config.ts # Drizzle config (PostgreSQL, dialect)
├── vite.config.ts    # Vite config (client root, aliases)
└── package.json
```

## Running the App
- **Dev**: `npm run dev` (runs on port 5000, serves both API and Vite frontend)
- **Build**: `npm run build`
- **Production**: `npm start`
- **DB schema push**: `npm run db:push`

## Key Features
- Google OAuth 2.0 authentication with email allowlist (`ALLOWED_EMAILS` env var)
- Retirement plan management (personal info, retirement age, inflation)
- Financial accounts tracking (401k, IRA, Roth, brokerage, etc.) with owner (primary/spouse/partner/joint)
- Real estate equity tracking
- Debt tracking
- Income sources (work, Social Security with ss_base_monthly_benefit, pension, rental) with owner tagging
- Expense tracking with monthly/annual input toggle, What-If scenario panel, owner tagging
- Healthcare cost modeling (pre/post Medicare, LTC)
- Retirement projections (year-by-year)
- Monte Carlo simulation: 1000 iterations with full percentile curves (P10/P25/P50/P75/P90 + mean + baseline) returned per retirement year
- Insights page: Monte Carlo percentile chart, percentile table at key ages, Run Analysis button
- Investment Positions tracker (ROTH/IRA/401k/HSA account types) with gain/loss calculations
- Roth IRA Conversion Planner (federal + state tax, break-even, future value projection)
- Financial Partner support: non-married partner with own accounts/income/expenses flowing into projections
- Spouse support
- Scenarios for what-if analysis
- Withdrawal strategy planning

## API
All routes under `/api/`. Protected routes require `Authorization: Bearer <token>` header.

## Deployment
- Target: autoscale
- Build: `npm run build`
- Run: `node dist/index.cjs`
