import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerPlaidRoutes } from "./plaid";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import {
  insertPlanSchema, insertAccountSchema, insertRealEstateSchema,
  insertDebtSchema, insertIncomeSchema, insertExpenseSchema,
  insertHealthcareSchema, insertScenarioSchema, insertWithdrawalStrategySchema,
  insertPositionSchema,
} from "@shared/schema";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

// Allowlist of permitted email addresses (comma-separated env var)
const ALLOWED_EMAILS: Set<string> = new Set(
  (process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
);

function getGoogleClient(redirectUri: string) {
  return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, redirectUri);
}

const JWT_SECRET = "mcplanny-jwt-secret-2026-v2";

function makeToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers["authorization"];
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { userId: number };
    (req as any).userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // ─── Config (public) ─────────────────────────────────────────────────────
  app.get("/api/config", (_req, res) => {
    res.json({ configured: !!GOOGLE_CLIENT_ID });
  });

  // ─── Auth: Start Google OAuth flow ───────────────────────────────────────
  app.get("/api/auth/google/start", (req, res) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.status(500).send("Google auth not configured");
    }
    const proto = req.get("x-forwarded-proto") || req.protocol;
    const redirectUri = `${proto}://${req.get("host")}/api/auth/google/callback`;
    const client = getGoogleClient(redirectUri);
    const url = client.generateAuthUrl({
      access_type: "offline",
      scope: ["openid", "email", "profile"],
      prompt: "select_account",
    });
    res.redirect(url);
  });

  // ─── Auth: Google OAuth callback ─────────────────────────────────────────
  app.get("/api/auth/google/callback", async (req, res) => {
    const { code, error } = req.query as { code?: string; error?: string };

    if (error || !code) {
      return res.redirect("/#/?auth_error=cancelled");
    }

    try {
      const proto = req.get("x-forwarded-proto") || req.protocol;
      const redirectUri = `${proto}://${req.get("host")}/api/auth/google/callback`;
      const client = getGoogleClient(redirectUri);
      const { tokens } = await client.getToken(code);
      const idToken = tokens.id_token;
      if (!idToken) return res.redirect("/#/?auth_error=no_token");

      const ticket = await client.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.sub) return res.redirect("/#/?auth_error=invalid_token");

      // Enforce email allowlist
      const email = (payload.email || "").toLowerCase();
      if (ALLOWED_EMAILS.size > 0 && !ALLOWED_EMAILS.has(email)) {
        return res.redirect("/#/?auth_error=not_allowed");
      }

      const user = await storage.upsertGoogleUser({
        googleId: payload.sub,
        email: payload.email,
        displayName: payload.name,
        avatarUrl: payload.picture,
      });

      const existingPlan = await storage.getPlanByUserId(user.id);
      if (!existingPlan) {
        await storage.createPlan({
          userId: user.id,
          firstName: payload.given_name || "",
          lastName: payload.family_name || "",
          updatedAt: new Date().toISOString(),
        });
      }

      const token = makeToken(user.id);
      res.redirect(`/#/?auth_token=${token}`);
    } catch (err: any) {
      console.error("Google OAuth callback error:", err);
      res.redirect("/#/?auth_error=failed");
    }
  });

  app.post("/api/auth/logout", (_req, res) => {
    res.json({ success: true });
  });


  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = await storage.getUser((req as any).userId);
    if (!user) return res.status(401).json({ error: "Not found" });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  // ─── Plan ────────────────────────────────────────────────────────────────
  app.get("/api/plan", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    let plan = await storage.getPlanByUserId(userId);
    if (!plan) {
      plan = await storage.createPlan({ userId, firstName: "", lastName: "", updatedAt: new Date().toISOString() });
    }
    res.json(plan);
  });

  app.patch("/api/plan", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    let plan = await storage.getPlanByUserId(userId);
    if (!plan) {
      plan = await storage.createPlan({ userId, ...req.body });
    } else {
      plan = await storage.updatePlan(plan.id, req.body);
    }
    res.json(plan);
  });

  // ─── Accounts ────────────────────────────────────────────────────────────
  app.get("/api/accounts", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const plan = await storage.getPlanByUserId(userId);
    if (!plan) return res.json([]);
    res.json(await storage.getAccountsByPlanId(plan.id));
  });

  app.post("/api/accounts", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    let plan = await storage.getPlanByUserId(userId);
    if (!plan) plan = await storage.createPlan({ userId, firstName: "", lastName: "", updatedAt: new Date().toISOString() });
    const parsed = insertAccountSchema.safeParse({ ...req.body, planId: plan.id });
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
    res.json(await storage.createAccount(parsed.data));
  });

  app.patch("/api/accounts/:id", requireAuth, async (req, res) => {
    const account = await storage.updateAccount(parseInt(req.params.id), req.body);
    res.json(account);
  });

  app.delete("/api/accounts/:id", requireAuth, async (req, res) => {
    await storage.deleteAccount(parseInt(req.params.id));
    res.json({ success: true });
  });

  // ─── Real Estate ─────────────────────────────────────────────────────────
  app.get("/api/real-estate", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const plan = await storage.getPlanByUserId(userId);
    if (!plan) return res.json([]);
    res.json(await storage.getRealEstateByPlanId(plan.id));
  });

  app.post("/api/real-estate", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    let plan = await storage.getPlanByUserId(userId);
    if (!plan) plan = await storage.createPlan({ userId, firstName: "", lastName: "", updatedAt: new Date().toISOString() });
    const parsed = insertRealEstateSchema.safeParse({ ...req.body, planId: plan.id });
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
    res.json(await storage.createRealEstate(parsed.data));
  });

  app.patch("/api/real-estate/:id", requireAuth, async (req, res) => {
    res.json(await storage.updateRealEstate(parseInt(req.params.id), req.body));
  });

  app.delete("/api/real-estate/:id", requireAuth, async (req, res) => {
    await storage.deleteRealEstate(parseInt(req.params.id));
    res.json({ success: true });
  });

  // ─── Debts ───────────────────────────────────────────────────────────────
  app.get("/api/debts", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const plan = await storage.getPlanByUserId(userId);
    if (!plan) return res.json([]);
    res.json(await storage.getDebtsByPlanId(plan.id));
  });

  app.post("/api/debts", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    let plan = await storage.getPlanByUserId(userId);
    if (!plan) plan = await storage.createPlan({ userId, firstName: "", lastName: "", updatedAt: new Date().toISOString() });
    const parsed = insertDebtSchema.safeParse({ ...req.body, planId: plan.id });
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
    res.json(await storage.createDebt(parsed.data));
  });

  app.patch("/api/debts/:id", requireAuth, async (req, res) => {
    res.json(await storage.updateDebt(parseInt(req.params.id), req.body));
  });

  app.delete("/api/debts/:id", requireAuth, async (req, res) => {
    await storage.deleteDebt(parseInt(req.params.id));
    res.json({ success: true });
  });

  // ─── Incomes ─────────────────────────────────────────────────────────────
  app.get("/api/incomes", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const plan = await storage.getPlanByUserId(userId);
    if (!plan) return res.json([]);
    res.json(await storage.getIncomesByPlanId(plan.id));
  });

  app.post("/api/incomes", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    let plan = await storage.getPlanByUserId(userId);
    if (!plan) plan = await storage.createPlan({ userId, firstName: "", lastName: "", updatedAt: new Date().toISOString() });
    const parsed = insertIncomeSchema.safeParse({ ...req.body, planId: plan.id });
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
    res.json(await storage.createIncome(parsed.data));
  });

  app.patch("/api/incomes/:id", requireAuth, async (req, res) => {
    res.json(await storage.updateIncome(parseInt(req.params.id), req.body));
  });

  app.delete("/api/incomes/:id", requireAuth, async (req, res) => {
    await storage.deleteIncome(parseInt(req.params.id));
    res.json({ success: true });
  });

  // ─── Expenses ────────────────────────────────────────────────────────────
  app.get("/api/expenses", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const plan = await storage.getPlanByUserId(userId);
    if (!plan) return res.json([]);
    res.json(await storage.getExpensesByPlanId(plan.id));
  });

  app.post("/api/expenses", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    let plan = await storage.getPlanByUserId(userId);
    if (!plan) plan = await storage.createPlan({ userId, firstName: "", lastName: "", updatedAt: new Date().toISOString() });
    const parsed = insertExpenseSchema.safeParse({ ...req.body, planId: plan.id });
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
    res.json(await storage.createExpense(parsed.data));
  });

  app.patch("/api/expenses/:id", requireAuth, async (req, res) => {
    res.json(await storage.updateExpense(parseInt(req.params.id), req.body));
  });

  app.delete("/api/expenses/:id", requireAuth, async (req, res) => {
    await storage.deleteExpense(parseInt(req.params.id));
    res.json({ success: true });
  });

  // ─── Healthcare ──────────────────────────────────────────────────────────
  app.get("/api/healthcare", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const plan = await storage.getPlanByUserId(userId);
    if (!plan) return res.json(null);
    const hc = await storage.getHealthcareByPlanId(plan.id);
    res.json(hc || null);
  });

  app.put("/api/healthcare", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    let plan = await storage.getPlanByUserId(userId);
    if (!plan) plan = await storage.createPlan({ userId, firstName: "", lastName: "", updatedAt: new Date().toISOString() });
    const parsed = insertHealthcareSchema.safeParse({ ...req.body, planId: plan.id });
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
    res.json(await storage.upsertHealthcare(parsed.data));
  });

  // ─── Scenarios ───────────────────────────────────────────────────────────
  app.get("/api/scenarios", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const plan = await storage.getPlanByUserId(userId);
    if (!plan) return res.json([]);
    res.json(await storage.getScenariosByPlanId(plan.id));
  });

  app.post("/api/scenarios", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    let plan = await storage.getPlanByUserId(userId);
    if (!plan) plan = await storage.createPlan({ userId, firstName: "", lastName: "", updatedAt: new Date().toISOString() });
    const parsed = insertScenarioSchema.safeParse({ ...req.body, planId: plan.id });
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
    res.json(await storage.createScenario(parsed.data));
  });

  app.patch("/api/scenarios/:id", requireAuth, async (req, res) => {
    res.json(await storage.updateScenario(parseInt(req.params.id), req.body));
  });

  app.delete("/api/scenarios/:id", requireAuth, async (req, res) => {
    await storage.deleteScenario(parseInt(req.params.id));
    res.json({ success: true });
  });

  // ─── Withdrawal Strategy ─────────────────────────────────────────────────
  app.get("/api/withdrawal-strategy", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const plan = await storage.getPlanByUserId(userId);
    if (!plan) return res.json(null);
    res.json(await storage.getWithdrawalStrategyByPlanId(plan.id));
  });

  app.put("/api/withdrawal-strategy", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    let plan = await storage.getPlanByUserId(userId);
    if (!plan) plan = await storage.createPlan({ userId, firstName: "", lastName: "", updatedAt: new Date().toISOString() });
    const parsed = insertWithdrawalStrategySchema.safeParse({ ...req.body, planId: plan.id });
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
    res.json(await storage.upsertWithdrawalStrategy(parsed.data));
  });

  // ─── Positions ───────────────────────────────────────────────────────────
  app.get("/api/positions", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const plan = await storage.getPlanByUserId(userId);
    if (!plan) return res.json([]);
    res.json(await storage.getPositionsByPlanId(plan.id));
  });

  app.post("/api/positions", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    let plan = await storage.getPlanByUserId(userId);
    if (!plan) plan = await storage.createPlan({ userId, firstName: "", lastName: "", updatedAt: new Date().toISOString() });
    const parsed = insertPositionSchema.safeParse({ ...req.body, planId: plan.id });
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
    res.json(await storage.createPosition(parsed.data));
  });

  app.patch("/api/positions/:id", requireAuth, async (req, res) => {
    res.json(await storage.updatePosition(parseInt(req.params.id), req.body));
  });

  app.delete("/api/positions/:id", requireAuth, async (req, res) => {
    await storage.deletePosition(parseInt(req.params.id));
    res.json({ success: true });
  });

  // Refresh current prices via Finnhub
  app.post("/api/positions/refresh-prices", requireAuth, async (req, res) => {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "FINNHUB_API_KEY not configured" });

    const userId = (req as any).userId;
    const plan = await storage.getPlanByUserId(userId);
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    const positions = await storage.getPositionsByPlanId(plan.id);
    if (positions.length === 0) return res.json({ updated: 0, results: [] });

    const tickers = [...new Set(positions.map(p => p.ticker.toUpperCase()))];

    const results: { ticker: string; price: number | null; error?: string }[] = [];
    for (const ticker of tickers) {
      try {
        const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`;
        const r = await fetch(url);
        const data = await r.json() as any;
        const price = data.c && data.c > 0 ? data.c : null;
        results.push({ ticker, price });
      } catch {
        results.push({ ticker, price: null, error: "fetch failed" });
      }
    }

    // Update each position that got a valid price
    let updated = 0;
    for (const pos of positions) {
      const result = results.find(r => r.ticker === pos.ticker.toUpperCase());
      if (result?.price && result.price > 0) {
        await storage.updatePosition(pos.id, { currentPrice: result.price });
        updated++;
      }
    }

    res.json({ updated, results });
  });

  // ─── Projections (computed, not stored) ──────────────────────────────────
  app.get("/api/projections", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const plan = await storage.getPlanByUserId(userId);
    if (!plan) return res.json({ years: [], monteCarlo: null });

    const [accts, re, dbts, incList, expList, hc, ws] = await Promise.all([
      storage.getAccountsByPlanId(plan.id),
      storage.getRealEstateByPlanId(plan.id),
      storage.getDebtsByPlanId(plan.id),
      storage.getIncomesByPlanId(plan.id),
      storage.getExpensesByPlanId(plan.id),
      storage.getHealthcareByPlanId(plan.id),
      storage.getWithdrawalStrategyByPlanId(plan.id),
    ]);

    const projections = computeProjections(plan, accts, re, dbts, incList, expList, hc, ws);
    res.json(projections);
  });

  // ─── Plaid Integration ────────────────────────────────────────────────────
  registerPlaidRoutes(app, requireAuth);

  return httpServer;
}

// ─── Projection Engine ────────────────────────────────────────────────────────
function computeProjections(plan: any, accounts: any[], realEstateList: any[], debts: any[], incomes: any[], expenses: any[], healthcare: any, ws: any) {
  const currentYear = new Date().getFullYear();
  const birthYear = plan.birthYear || (currentYear - 45);
  const currentAge = currentYear - birthYear;
  const retirementAge = plan.retirementAge || 65;
  const planToAge = plan.planToAge || 90;
  const inflation = (plan.inflationRate || 2.5) / 100;
  const medInflation = (plan.medicalInflationRate || 5.0) / 100;
  const hasSpouse = plan.hasSpouse;
  const spouseBirthYear = plan.spouseBirthYear || (currentYear - 43);
  const spouseRetirementAge = plan.spouseRetirementAge || 65;

  // Total starting balances by tax bucket
  let preTaxBal = accounts.filter(a => ["401k","403b","457b","traditional_ira"].includes(a.accountType)).reduce((s, a) => s + (a.balance || 0), 0);
  let rothBal = accounts.filter(a => ["roth_401k","roth_ira"].includes(a.accountType)).reduce((s, a) => s + (a.balance || 0), 0);
  let afterTaxBal = accounts.filter(a => ["brokerage","checking","savings","cd","money_market"].includes(a.accountType)).reduce((s, a) => s + (a.balance || 0), 0);
  let hsaBal = accounts.filter(a => a.accountType === "hsa").reduce((s, a) => s + (a.balance || 0), 0);

  // Weighted average return
  const avgReturn = accounts.length > 0
    ? accounts.reduce((s, a) => s + (a.rateOfReturn || 6) * (a.balance || 0), 0) / Math.max(1, accounts.reduce((s, a) => s + (a.balance || 0), 0))
    : 6.0;

  // Real estate equity
  const totalRealEstateEquity = realEstateList.reduce((s, r) => s + ((r.currentValue || 0) - (r.mortgageBalance || 0)), 0);

  // Total debt
  const totalDebt = debts.reduce((s, d) => s + (d.balance || 0), 0);

  const years: any[] = [];
  let running_preTax = preTaxBal;
  let running_roth = rothBal;
  let running_afterTax = afterTaxBal;
  let running_hsa = hsaBal;
  let running_reEquity = totalRealEstateEquity;

  for (let age = Math.max(currentAge, 18); age <= planToAge; age++) {
    const year = birthYear + age;
    const yearsFromNow = year - currentYear;
    const inflFactor = Math.pow(1 + inflation, yearsFromNow);
    const medInflFactor = Math.pow(1 + medInflation, yearsFromNow);
    const isRetired = age >= retirementAge;
    const spouseAge = hasSpouse ? age + (birthYear - spouseBirthYear) : null;
    const spouseRetired = hasSpouse && spouseAge !== null ? spouseAge >= spouseRetirementAge : false;

    // Compute income for this year
    let totalIncome = 0;
    for (const inc of incomes) {
      const startAge = inc.startAge || (inc.incomeType === "work" ? currentAge : retirementAge);
      const endAge = inc.endAge || (inc.incomeType === "work" ? retirementAge - 1 : planToAge);
      if (age >= startAge && age <= endAge) {
        const yearsActive = age - startAge;
        const cola = 1 + (inc.annualIncrease || 2.5) / 100;
        totalIncome += (inc.annualAmount || 0) * Math.pow(cola, yearsActive);
      }
    }

    // Work income contributions (pre-retirement)
    let annualContributions = 0;
    if (!isRetired) {
      for (const acc of accounts) {
        const contribEndAge = acc.contributionEndAge || retirementAge;
        if (age < contribEndAge) {
          annualContributions += acc.annualContribution || 0;
          // Employer match
          const employerContrib = (acc.employerMatch || 0) / 100 * (acc.annualContribution || 0);
          if (["401k","403b","457b","roth_401k"].includes(acc.accountType)) {
            if (acc.accountType === "roth_401k") running_roth += employerContrib;
            else running_preTax += employerContrib;
          }
        }
      }
    }

    // Compute expenses for this year
    let totalExpenses = 0;
    let healthcareCost = 0;
    for (const exp of expenses) {
      const startAge = exp.startAge || currentAge;
      const endAge = exp.endAge || planToAge;
      if (age >= startAge && age <= endAge) {
        const yearsActive = age - startAge;
        const cola = 1 + (exp.annualIncrease || 2.5) / 100;
        totalExpenses += (exp.annualAmount || 0) * Math.pow(cola, yearsActive);
      }
    }

    // Healthcare costs
    if (healthcare) {
      if (age < 65) {
        healthcareCost = (healthcare.preMedicareAnnualCost || 12000) * medInflFactor;
      } else {
        const baseB = (healthcare.medicarePartBMonthly || 174.70) * 12;
        const baseD = (healthcare.medicarePartDMonthly || 35) * 12;
        healthcareCost = (baseB + baseD) * medInflFactor;
      }
      // LTC
      if (healthcare.ltcStartAge && age >= healthcare.ltcStartAge && age < (healthcare.ltcStartAge + (healthcare.ltcDurationYears || 3))) {
        healthcareCost += (healthcare.ltcMonthlyCost || 4500) * 12 * medInflFactor;
      }
    }

    totalExpenses += healthcareCost;

    // Net cash flow
    const netCashFlow = totalIncome + annualContributions - totalExpenses;

    // Apply returns to balances
    const returnRate = (avgReturn / 100);
    running_preTax = running_preTax * (1 + returnRate);
    running_roth = running_roth * (1 + returnRate);
    running_afterTax = running_afterTax * (1 + returnRate);
    running_hsa = running_hsa * (1 + 0.05); // HSA grows at moderate rate

    // Add contributions
    if (!isRetired) {
      running_preTax += annualContributions * 0.7; // approx split
      running_roth += annualContributions * 0.3;
    }

    // Withdraw if spending exceeds income in retirement
    if (isRetired && totalExpenses > totalIncome) {
      let gap = totalExpenses - totalIncome;
      // Withdrawal order: after_tax first, then pre_tax, then roth, then hsa
      const withdraw = (bal: number, amt: number) => {
        const taken = Math.min(bal, amt);
        return { newBal: bal - taken, remaining: amt - taken };
      };
      let r;
      r = withdraw(running_afterTax, gap); running_afterTax = r.newBal; gap = r.remaining;
      r = withdraw(running_preTax, gap); running_preTax = r.newBal; gap = r.remaining;
      r = withdraw(running_roth, gap); running_roth = r.newBal; gap = r.remaining;
      r = withdraw(running_hsa, gap); running_hsa = r.newBal; gap = r.remaining;
    }

    // Real estate equity appreciation
    running_reEquity = running_reEquity * (1 + (plan.housingAppreciationRate || 3) / 100);

    const totalSavings = running_preTax + running_roth + running_afterTax + running_hsa;
    const netWorth = totalSavings + running_reEquity - (totalDebt * Math.pow(0.97, yearsFromNow)); // debt decays

    years.push({
      age,
      year,
      spouseAge,
      totalIncome: Math.round(totalIncome),
      totalExpenses: Math.round(totalExpenses),
      healthcareCost: Math.round(healthcareCost),
      netCashFlow: Math.round(netCashFlow),
      preTaxBalance: Math.round(running_preTax),
      rothBalance: Math.round(running_roth),
      afterTaxBalance: Math.round(running_afterTax),
      hsaBalance: Math.round(running_hsa),
      totalSavings: Math.round(totalSavings),
      realEstateEquity: Math.round(running_reEquity),
      netWorth: Math.round(netWorth),
      isRetired,
    });
  }

  // Monte Carlo simulation (1000 runs)
  const monteCarloResult = runMonteCarlo(years, retirementAge, planToAge, currentAge, avgReturn);

  return { years, monteCarlo: monteCarloResult };
}

function runMonteCarlo(baseYears: any[], retirementAge: number, planToAge: number, currentAge: number, avgReturn: number) {
  const ITERATIONS = 1000;
  const stdDev = 0.12;

  const retirementYears = baseYears.filter(y => y.isRetired);
  if (retirementYears.length === 0) return null;

  const startSavings = retirementYears[0]?.totalSavings || 0;
  // Track savings at each retirement year across all simulations
  const allSavings: number[][] = retirementYears.map(() => []);
  let successCount = 0;

  for (let i = 0; i < ITERATIONS; i++) {
    let savings = startSavings;
    let failed = false;

    for (let j = 0; j < retirementYears.length; j++) {
      const yr = retirementYears[j];
      const u1 = Math.random(), u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const randomReturn = (avgReturn / 100) + z * stdDev;
      savings = savings * (1 + randomReturn);
      const withdrawal = yr.totalExpenses - yr.totalIncome;
      if (withdrawal > 0) savings -= withdrawal;
      if (savings < 0) savings = 0;
      allSavings[j].push(savings);
      if (savings <= 0 && !failed) failed = true;
    }
    if (!failed) successCount++;
  }

  // Build percentile curves
  const percentileData = retirementYears.map((yr, j) => {
    const sims = [...allSavings[j]].sort((a, b) => a - b);
    const pct = (p: number) => sims[Math.min(Math.floor(p * ITERATIONS), ITERATIONS - 1)];
    const avg = Math.round(sims.reduce((s, v) => s + v, 0) / ITERATIONS);
    return {
      age: yr.age,
      p10: Math.round(pct(0.10)),
      p25: Math.round(pct(0.25)),
      p50: Math.round(pct(0.50)),
      p75: Math.round(pct(0.75)),
      p90: Math.round(pct(0.90)),
      average: avg,
      baseline: yr.totalSavings,
    };
  });

  const chanceOfSuccess = Math.round((successCount / ITERATIONS) * 100);
  return {
    chanceOfSuccess,
    iterations: ITERATIONS,
    label: chanceOfSuccess >= 80 ? "Strong" : chanceOfSuccess >= 60 ? "Moderate" : "At Risk",
    percentileData,
  };
}
