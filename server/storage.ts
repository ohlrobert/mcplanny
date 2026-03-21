import {
  type User, type InsertUser, type InsertGoogleUser, users,
  type Plan, type InsertPlan, plans,
  type Account, type InsertAccount, accounts,
  type RealEstate, type InsertRealEstate, realEstate,
  type Debt, type InsertDebt, debts,
  type Income, type InsertIncome, incomes,
  type Expense, type InsertExpense, expenses,
  type Healthcare, type InsertHealthcare, healthcare,
  type Scenario, type InsertScenario, scenarios,
  type WithdrawalStrategy, type InsertWithdrawalStrategy, withdrawalStrategy,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");
export const db = drizzle(sqlite);

// Create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    email TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Add new columns if they don't exist (safe migrations)
const existingUserCols = sqlite.prepare("PRAGMA table_info(users)").all() as { name: string }[];
const userColNames = existingUserCols.map(c => c.name);
if (!userColNames.includes("google_id")) sqlite.exec("ALTER TABLE users ADD COLUMN google_id TEXT;");
if (!userColNames.includes("display_name")) sqlite.exec("ALTER TABLE users ADD COLUMN display_name TEXT;");
if (!userColNames.includes("avatar_url")) sqlite.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT;");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    birth_year INTEGER,
    gender TEXT,
    retirement_age INTEGER DEFAULT 65,
    plan_to_age INTEGER DEFAULT 90,
    state_of_residence TEXT,
    filing_status TEXT DEFAULT 'single',
    has_spouse INTEGER DEFAULT 0,
    spouse_first_name TEXT,
    spouse_last_name TEXT,
    spouse_birth_year INTEGER,
    spouse_gender TEXT,
    spouse_retirement_age INTEGER DEFAULT 65,
    spouse_plan_to_age INTEGER DEFAULT 90,
    inflation_rate REAL DEFAULT 2.5,
    medical_inflation_rate REAL DEFAULT 5.0,
    housing_appreciation_rate REAL DEFAULT 3.0,
    ss_cola REAL DEFAULT 2.5,
    legacy_goal REAL DEFAULT 0,
    dollar_display TEXT DEFAULT 'today',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    owner TEXT NOT NULL DEFAULT 'primary',
    account_type TEXT NOT NULL,
    name TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 0,
    rate_of_return REAL DEFAULT 6.0,
    asset_allocation REAL DEFAULT 60,
    annual_contribution REAL DEFAULT 0,
    employer_match REAL DEFAULT 0,
    employer_match_limit REAL DEFAULT 0,
    contribution_end_age INTEGER,
    notes TEXT
  );
  CREATE TABLE IF NOT EXISTS real_estate (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    property_type TEXT NOT NULL DEFAULT 'primary',
    name TEXT NOT NULL,
    current_value REAL NOT NULL DEFAULT 0,
    mortgage_balance REAL DEFAULT 0,
    mortgage_rate REAL DEFAULT 0,
    monthly_payment REAL DEFAULT 0,
    appreciation_rate REAL DEFAULT 3.0,
    monthly_rental_income REAL DEFAULT 0,
    ownership_type TEXT DEFAULT 'own',
    planned_sale_age INTEGER,
    planned_purchase_age INTEGER,
    notes TEXT
  );
  CREATE TABLE IF NOT EXISTS debts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    debt_type TEXT NOT NULL DEFAULT 'other',
    name TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 0,
    interest_rate REAL DEFAULT 0,
    monthly_payment REAL DEFAULT 0,
    notes TEXT
  );
  CREATE TABLE IF NOT EXISTS incomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    owner TEXT NOT NULL DEFAULT 'primary',
    income_type TEXT NOT NULL,
    name TEXT NOT NULL,
    annual_amount REAL NOT NULL DEFAULT 0,
    start_age INTEGER,
    end_age INTEGER,
    annual_increase REAL DEFAULT 2.5,
    is_one_time INTEGER DEFAULT 0,
    ss_benefit_age INTEGER,
    ss_survivor_benefit REAL,
    pension_type TEXT,
    pension_cola REAL DEFAULT 0,
    notes TEXT
  );
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    expense_type TEXT NOT NULL DEFAULT 'other',
    category TEXT NOT NULL DEFAULT 'must_spend',
    name TEXT NOT NULL,
    annual_amount REAL NOT NULL DEFAULT 0,
    start_age INTEGER,
    end_age INTEGER,
    annual_increase REAL DEFAULT 2.5,
    is_one_time INTEGER DEFAULT 0,
    notes TEXT
  );
  CREATE TABLE IF NOT EXISTS healthcare (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL UNIQUE,
    pre_medicare_annual_cost REAL DEFAULT 12000,
    medicare_part_b_monthly REAL DEFAULT 174.70,
    medicare_part_d_monthly REAL DEFAULT 35,
    ltc_monthly_cost REAL DEFAULT 4500,
    ltc_start_age INTEGER DEFAULT 80,
    ltc_duration_years INTEGER DEFAULT 3,
    spouse_ltc_monthly_cost REAL DEFAULT 4500,
    spouse_ltc_start_age INTEGER DEFAULT 80,
    spouse_ltc_duration_years INTEGER DEFAULT 3,
    irmaa_surcharge_enabled INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_base INTEGER DEFAULT 0,
    overrides TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS withdrawal_strategy (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL UNIQUE,
    strategy TEXT NOT NULL DEFAULT 'spending_needs',
    fixed_percentage REAL DEFAULT 4.0,
    withdrawal_order TEXT DEFAULT '["after_tax","pre_tax","roth","hsa"]'
  );
`);

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertGoogleUser(data: InsertGoogleUser): Promise<User>;
  // Plans
  getPlanByUserId(userId: number): Promise<Plan | undefined>;
  createPlan(plan: InsertPlan): Promise<Plan>;
  updatePlan(id: number, plan: Partial<InsertPlan>): Promise<Plan | undefined>;
  // Accounts
  getAccountsByPlanId(planId: number): Promise<Account[]>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: number, account: Partial<InsertAccount>): Promise<Account | undefined>;
  deleteAccount(id: number): Promise<void>;
  // Real Estate
  getRealEstateByPlanId(planId: number): Promise<RealEstate[]>;
  createRealEstate(property: InsertRealEstate): Promise<RealEstate>;
  updateRealEstate(id: number, property: Partial<InsertRealEstate>): Promise<RealEstate | undefined>;
  deleteRealEstate(id: number): Promise<void>;
  // Debts
  getDebtsByPlanId(planId: number): Promise<Debt[]>;
  createDebt(debt: InsertDebt): Promise<Debt>;
  updateDebt(id: number, debt: Partial<InsertDebt>): Promise<Debt | undefined>;
  deleteDebt(id: number): Promise<void>;
  // Incomes
  getIncomesByPlanId(planId: number): Promise<Income[]>;
  createIncome(income: InsertIncome): Promise<Income>;
  updateIncome(id: number, income: Partial<InsertIncome>): Promise<Income | undefined>;
  deleteIncome(id: number): Promise<void>;
  // Expenses
  getExpensesByPlanId(planId: number): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<void>;
  // Healthcare
  getHealthcareByPlanId(planId: number): Promise<Healthcare | undefined>;
  upsertHealthcare(h: InsertHealthcare): Promise<Healthcare>;
  // Scenarios
  getScenariosByPlanId(planId: number): Promise<Scenario[]>;
  createScenario(scenario: InsertScenario): Promise<Scenario>;
  updateScenario(id: number, scenario: Partial<InsertScenario>): Promise<Scenario | undefined>;
  deleteScenario(id: number): Promise<void>;
  // Withdrawal Strategy
  getWithdrawalStrategyByPlanId(planId: number): Promise<WithdrawalStrategy | undefined>;
  upsertWithdrawalStrategy(ws: InsertWithdrawalStrategy): Promise<WithdrawalStrategy>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number) { return db.select().from(users).where(eq(users.id, id)).get(); }
  async getUserByUsername(username: string) { return db.select().from(users).where(eq(users.username, username)).get(); }
  async getUserByGoogleId(googleId: string) { return db.select().from(users).where(eq(users.googleId, googleId)).get(); }
  async createUser(user: InsertUser) { return db.insert(users).values(user).returning().get(); }
  async upsertGoogleUser(data: InsertGoogleUser): Promise<User> {
    const existing = await this.getUserByGoogleId(data.googleId);
    if (existing) {
      const updated = await db.update(users)
        .set({ displayName: data.displayName, avatarUrl: data.avatarUrl, email: data.email })
        .where(eq(users.googleId, data.googleId))
        .returning().get();
      return updated!;
    }
    const username = `google_${data.googleId}`;
    return db.insert(users).values({
      username,
      password: "",
      email: data.email,
      googleId: data.googleId,
      displayName: data.displayName,
      avatarUrl: data.avatarUrl,
    }).returning().get();
  }

  // Plans
  async getPlanByUserId(userId: number) { return db.select().from(plans).where(eq(plans.userId, userId)).get(); }
  async createPlan(plan: InsertPlan) { return db.insert(plans).values({ ...plan, updatedAt: new Date().toISOString() }).returning().get(); }
  async updatePlan(id: number, plan: Partial<InsertPlan>) {
    return db.update(plans).set({ ...plan, updatedAt: new Date().toISOString() }).where(eq(plans.id, id)).returning().get();
  }

  // Accounts
  async getAccountsByPlanId(planId: number) { return db.select().from(accounts).where(eq(accounts.planId, planId)).all(); }
  async createAccount(account: InsertAccount) { return db.insert(accounts).values(account).returning().get(); }
  async updateAccount(id: number, account: Partial<InsertAccount>) { return db.update(accounts).set(account).where(eq(accounts.id, id)).returning().get(); }
  async deleteAccount(id: number) { db.delete(accounts).where(eq(accounts.id, id)).run(); }

  // Real Estate
  async getRealEstateByPlanId(planId: number) { return db.select().from(realEstate).where(eq(realEstate.planId, planId)).all(); }
  async createRealEstate(property: InsertRealEstate) { return db.insert(realEstate).values(property).returning().get(); }
  async updateRealEstate(id: number, property: Partial<InsertRealEstate>) { return db.update(realEstate).set(property).where(eq(realEstate.id, id)).returning().get(); }
  async deleteRealEstate(id: number) { db.delete(realEstate).where(eq(realEstate.id, id)).run(); }

  // Debts
  async getDebtsByPlanId(planId: number) { return db.select().from(debts).where(eq(debts.planId, planId)).all(); }
  async createDebt(debt: InsertDebt) { return db.insert(debts).values(debt).returning().get(); }
  async updateDebt(id: number, debt: Partial<InsertDebt>) { return db.update(debts).set(debt).where(eq(debts.id, id)).returning().get(); }
  async deleteDebt(id: number) { db.delete(debts).where(eq(debts.id, id)).run(); }

  // Incomes
  async getIncomesByPlanId(planId: number) { return db.select().from(incomes).where(eq(incomes.planId, planId)).all(); }
  async createIncome(income: InsertIncome) { return db.insert(incomes).values(income).returning().get(); }
  async updateIncome(id: number, income: Partial<InsertIncome>) { return db.update(incomes).set(income).where(eq(incomes.id, id)).returning().get(); }
  async deleteIncome(id: number) { db.delete(incomes).where(eq(incomes.id, id)).run(); }

  // Expenses
  async getExpensesByPlanId(planId: number) { return db.select().from(expenses).where(eq(expenses.planId, planId)).all(); }
  async createExpense(expense: InsertExpense) { return db.insert(expenses).values(expense).returning().get(); }
  async updateExpense(id: number, expense: Partial<InsertExpense>) { return db.update(expenses).set(expense).where(eq(expenses.id, id)).returning().get(); }
  async deleteExpense(id: number) { db.delete(expenses).where(eq(expenses.id, id)).run(); }

  // Healthcare
  async getHealthcareByPlanId(planId: number) { return db.select().from(healthcare).where(eq(healthcare.planId, planId)).get(); }
  async upsertHealthcare(h: InsertHealthcare) {
    const existing = await this.getHealthcareByPlanId(h.planId);
    if (existing) {
      return db.update(healthcare).set(h).where(eq(healthcare.planId, h.planId)).returning().get()!;
    }
    return db.insert(healthcare).values(h).returning().get();
  }

  // Scenarios
  async getScenariosByPlanId(planId: number) { return db.select().from(scenarios).where(eq(scenarios.planId, planId)).all(); }
  async createScenario(scenario: InsertScenario) { return db.insert(scenarios).values({ ...scenario, createdAt: new Date().toISOString() }).returning().get(); }
  async updateScenario(id: number, scenario: Partial<InsertScenario>) { return db.update(scenarios).set(scenario).where(eq(scenarios.id, id)).returning().get(); }
  async deleteScenario(id: number) { db.delete(scenarios).where(eq(scenarios.id, id)).run(); }

  // Withdrawal Strategy
  async getWithdrawalStrategyByPlanId(planId: number) { return db.select().from(withdrawalStrategy).where(eq(withdrawalStrategy.planId, planId)).get(); }
  async upsertWithdrawalStrategy(ws: InsertWithdrawalStrategy) {
    const existing = await this.getWithdrawalStrategyByPlanId(ws.planId);
    if (existing) {
      return db.update(withdrawalStrategy).set(ws).where(eq(withdrawalStrategy.planId, ws.planId)).returning().get()!;
    }
    return db.insert(withdrawalStrategy).values(ws).returning().get();
  }
}

export const storage = new DatabaseStorage();
