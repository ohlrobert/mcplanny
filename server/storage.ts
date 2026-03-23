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
  type Position, type InsertPosition, positions,
  type WithdrawalStrategy, type InsertWithdrawalStrategy, withdrawalStrategy,
  type AccountRateSchedule, type InsertAccountRateSchedule, accountRateSchedules,
  type PlaidConnection, type InsertPlaidConnection, plaidConnections,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and } from "drizzle-orm";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);

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
  // Account Rate Schedules
  getRateSchedulesByPlanId(planId: number): Promise<AccountRateSchedule[]>;
  getRateSchedulesByAccountId(accountId: number): Promise<AccountRateSchedule[]>;
  getRateScheduleById(id: number): Promise<AccountRateSchedule | null>;
  createRateSchedule(data: InsertAccountRateSchedule): Promise<AccountRateSchedule>;
  updateRateSchedule(id: number, data: Partial<InsertAccountRateSchedule>): Promise<AccountRateSchedule | undefined>;
  deleteRateSchedule(id: number): Promise<void>;
  // Plaid Connections
  getPlaidConnectionsByPlanId(planId: number): Promise<PlaidConnection[]>;
  getPlaidConnectionById(id: number): Promise<PlaidConnection | undefined>;
  createPlaidConnection(conn: InsertPlaidConnection): Promise<PlaidConnection>;
  updatePlaidConnection(id: number, data: Partial<PlaidConnection>): Promise<PlaidConnection | undefined>;
  deletePlaidConnection(id: number): Promise<void>;
  getAccountByPlaidAccountId(planId: number, plaidAccountId: string): Promise<Account | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number) {
    const rows = await db.select().from(users).where(eq(users.id, id));
    return rows[0];
  }
  async getUserByUsername(username: string) {
    const rows = await db.select().from(users).where(eq(users.username, username));
    return rows[0];
  }
  async getUserByGoogleId(googleId: string) {
    const rows = await db.select().from(users).where(eq(users.googleId, googleId));
    return rows[0];
  }
  async createUser(user: InsertUser) {
    const rows = await db.insert(users).values(user).returning();
    return rows[0];
  }
  async upsertGoogleUser(data: InsertGoogleUser): Promise<User> {
    const existing = await this.getUserByGoogleId(data.googleId);
    if (existing) {
      const rows = await db.update(users)
        .set({ displayName: data.displayName, avatarUrl: data.avatarUrl, email: data.email })
        .where(eq(users.googleId, data.googleId))
        .returning();
      return rows[0]!;
    }
    const rows = await db.insert(users).values({
      username: `google_${data.googleId}`,
      password: "",
      email: data.email,
      googleId: data.googleId,
      displayName: data.displayName,
      avatarUrl: data.avatarUrl,
    }).returning();
    return rows[0];
  }

  // Plans
  async getPlanByUserId(userId: number) {
    const rows = await db.select().from(plans).where(eq(plans.userId, userId));
    return rows[0];
  }
  async createPlan(plan: InsertPlan) {
    const rows = await db.insert(plans).values({ ...plan, updatedAt: new Date().toISOString() }).returning();
    return rows[0];
  }
  async updatePlan(id: number, plan: Partial<InsertPlan>) {
    const rows = await db.update(plans).set({ ...plan, updatedAt: new Date().toISOString() }).where(eq(plans.id, id)).returning();
    return rows[0];
  }

  // Accounts
  async getAccountsByPlanId(planId: number) {
    return db.select().from(accounts).where(eq(accounts.planId, planId));
  }
  async createAccount(account: InsertAccount) {
    const rows = await db.insert(accounts).values(account).returning();
    return rows[0];
  }
  async updateAccount(id: number, account: Partial<InsertAccount>) {
    const rows = await db.update(accounts).set(account).where(eq(accounts.id, id)).returning();
    return rows[0];
  }
  async deleteAccount(id: number) {
    await db.delete(accounts).where(eq(accounts.id, id));
  }

  // Real Estate
  async getRealEstateByPlanId(planId: number) {
    return db.select().from(realEstate).where(eq(realEstate.planId, planId));
  }
  async createRealEstate(property: InsertRealEstate) {
    const rows = await db.insert(realEstate).values(property).returning();
    return rows[0];
  }
  async updateRealEstate(id: number, property: Partial<InsertRealEstate>) {
    const rows = await db.update(realEstate).set(property).where(eq(realEstate.id, id)).returning();
    return rows[0];
  }
  async deleteRealEstate(id: number) {
    await db.delete(realEstate).where(eq(realEstate.id, id));
  }

  // Debts
  async getDebtsByPlanId(planId: number) {
    return db.select().from(debts).where(eq(debts.planId, planId));
  }
  async createDebt(debt: InsertDebt) {
    const rows = await db.insert(debts).values(debt).returning();
    return rows[0];
  }
  async updateDebt(id: number, debt: Partial<InsertDebt>) {
    const rows = await db.update(debts).set(debt).where(eq(debts.id, id)).returning();
    return rows[0];
  }
  async deleteDebt(id: number) {
    await db.delete(debts).where(eq(debts.id, id));
  }

  // Incomes
  async getIncomesByPlanId(planId: number) {
    return db.select().from(incomes).where(eq(incomes.planId, planId));
  }
  async createIncome(income: InsertIncome) {
    const rows = await db.insert(incomes).values(income).returning();
    return rows[0];
  }
  async updateIncome(id: number, income: Partial<InsertIncome>) {
    const rows = await db.update(incomes).set(income).where(eq(incomes.id, id)).returning();
    return rows[0];
  }
  async deleteIncome(id: number) {
    await db.delete(incomes).where(eq(incomes.id, id));
  }

  // Expenses
  async getExpensesByPlanId(planId: number) {
    return db.select().from(expenses).where(eq(expenses.planId, planId));
  }
  async createExpense(expense: InsertExpense) {
    const rows = await db.insert(expenses).values(expense).returning();
    return rows[0];
  }
  async updateExpense(id: number, expense: Partial<InsertExpense>) {
    const rows = await db.update(expenses).set(expense).where(eq(expenses.id, id)).returning();
    return rows[0];
  }
  async deleteExpense(id: number) {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  // Healthcare
  async getHealthcareByPlanId(planId: number) {
    const rows = await db.select().from(healthcare).where(eq(healthcare.planId, planId));
    return rows[0];
  }
  async upsertHealthcare(h: InsertHealthcare) {
    const existing = await this.getHealthcareByPlanId(h.planId);
    if (existing) {
      const rows = await db.update(healthcare).set(h).where(eq(healthcare.planId, h.planId)).returning();
      return rows[0]!;
    }
    const rows = await db.insert(healthcare).values(h).returning();
    return rows[0];
  }

  // Scenarios
  async getScenariosByPlanId(planId: number) {
    return db.select().from(scenarios).where(eq(scenarios.planId, planId));
  }
  async createScenario(scenario: InsertScenario) {
    const rows = await db.insert(scenarios).values({ ...scenario, createdAt: new Date().toISOString() }).returning();
    return rows[0];
  }
  async updateScenario(id: number, scenario: Partial<InsertScenario>) {
    const rows = await db.update(scenarios).set(scenario).where(eq(scenarios.id, id)).returning();
    return rows[0];
  }
  async deleteScenario(id: number) {
    await db.delete(scenarios).where(eq(scenarios.id, id));
  }

  // Positions
  async getPositionsByPlanId(planId: number) {
    return db.select().from(positions).where(eq(positions.planId, planId));
  }
  async getPositionsByAccountId(accountId: number) {
    return db.select().from(positions).where(eq(positions.accountId, accountId));
  }
  async createPosition(position: InsertPosition) {
    const rows = await db.insert(positions).values(position).returning();
    return rows[0];
  }
  async updatePosition(id: number, position: Partial<InsertPosition>) {
    const rows = await db.update(positions).set(position).where(eq(positions.id, id)).returning();
    return rows[0];
  }
  async deletePosition(id: number) {
    await db.delete(positions).where(eq(positions.id, id));
  }

  // Withdrawal Strategy
  async getWithdrawalStrategyByPlanId(planId: number) {
    const rows = await db.select().from(withdrawalStrategy).where(eq(withdrawalStrategy.planId, planId));
    return rows[0];
  }
  async upsertWithdrawalStrategy(ws: InsertWithdrawalStrategy) {
    const existing = await this.getWithdrawalStrategyByPlanId(ws.planId);
    if (existing) {
      const rows = await db.update(withdrawalStrategy).set(ws).where(eq(withdrawalStrategy.planId, ws.planId)).returning();
      return rows[0]!;
    }
    const rows = await db.insert(withdrawalStrategy).values(ws).returning();
    return rows[0];
  }

  // Account Rate Schedules
  async getRateSchedulesByPlanId(planId: number) {
    return db.select().from(accountRateSchedules).where(eq(accountRateSchedules.planId, planId));
  }
  async getRateSchedulesByAccountId(accountId: number) {
    return db.select().from(accountRateSchedules).where(eq(accountRateSchedules.accountId, accountId));
  }
  async getRateScheduleById(id: number) {
    const rows = await db.select().from(accountRateSchedules).where(eq(accountRateSchedules.id, id));
    return rows[0] ?? null;
  }
  async createRateSchedule(data: InsertAccountRateSchedule) {
    const rows = await db.insert(accountRateSchedules).values(data).returning();
    return rows[0];
  }
  async updateRateSchedule(id: number, data: Partial<InsertAccountRateSchedule>) {
    const rows = await db.update(accountRateSchedules).set(data).where(eq(accountRateSchedules.id, id)).returning();
    return rows[0];
  }
  async deleteRateSchedule(id: number) {
    await db.delete(accountRateSchedules).where(eq(accountRateSchedules.id, id));
  }

  // Plaid Connections
  async getPlaidConnectionsByPlanId(planId: number) {
    return db.select().from(plaidConnections).where(eq(plaidConnections.planId, planId));
  }
  async getPlaidConnectionById(id: number) {
    const rows = await db.select().from(plaidConnections).where(eq(plaidConnections.id, id));
    return rows[0];
  }
  async createPlaidConnection(conn: InsertPlaidConnection) {
    const rows = await db.insert(plaidConnections).values({ ...conn, createdAt: new Date().toISOString() }).returning();
    return rows[0];
  }
  async updatePlaidConnection(id: number, data: Partial<PlaidConnection>) {
    const rows = await db.update(plaidConnections).set(data).where(eq(plaidConnections.id, id)).returning();
    return rows[0];
  }
  async deletePlaidConnection(id: number) {
    await db.delete(plaidConnections).where(eq(plaidConnections.id, id));
  }
  async getAccountByPlaidAccountId(planId: number, plaidAccountId: string) {
    const rows = await db.select().from(accounts)
      .where(and(eq(accounts.planId, planId), eq(accounts.plaidAccountId, plaidAccountId)));
    return rows[0];
  }
}

export const storage = new DatabaseStorage();
