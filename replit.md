# MCPlanny - Retirement Planning App

## Project Overview
A full-stack retirement financial planning application that helps users model retirement income, expenses, assets, and Monte Carlo simulations for retirement success probability.

## Architecture

### Tech Stack
- **Frontend**: React 18 + Vite + TypeScript + TailwindCSS + Radix UI
- **Backend**: Express 5 + TypeScript (tsx for dev)
- **Database**: SQLite via Drizzle ORM (file: `data.db`)
- **Auth**: JWT-based authentication with bcrypt-style password hashing
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
│   ├── storage.ts    # Database access layer (Drizzle/SQLite)
│   ├── vite.ts       # Vite dev middleware integration
│   └── static.ts     # Static file serving (production)
├── shared/
│   └── schema.ts     # Drizzle schema + Zod validation schemas
├── script/
│   └── build.ts      # Production build script
├── data.db           # SQLite database (auto-created)
├── drizzle.config.ts # Drizzle config (SQLite, dialect)
├── vite.config.ts    # Vite config (client root, aliases)
└── package.json
```

## Running the App
- **Dev**: `npm run dev` (runs on port 5000, serves both API and Vite frontend)
- **Build**: `npm run build`
- **Production**: `npm start`
- **DB schema push**: `npm run db:push`

## Key Features
- User authentication (register/login with JWT)
- Retirement plan management (personal info, retirement age, inflation)
- Financial accounts tracking (401k, IRA, Roth, brokerage, etc.)
- Real estate equity tracking
- Debt tracking
- Income sources (work, Social Security, pension, rental)
- Expense tracking
- Healthcare cost modeling (pre/post Medicare)
- Retirement projections (year-by-year)
- Monte Carlo simulation (1000 iterations, success probability)
- Scenarios for what-if analysis
- Withdrawal strategy planning

## API
All routes under `/api/`. Protected routes require `Authorization: Bearer <token>` header.

## Deployment
- Target: autoscale
- Build: `npm run build`
- Run: `node dist/index.cjs`
