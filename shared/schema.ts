import { pgTable, text, integer, real, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  googleId: text("google_id").unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

export const insertGoogleUserSchema = z.object({
  googleId: z.string(),
  email: z.string().email().optional(),
  displayName: z.string().optional(),
  avatarUrl: z.string().optional(),
});
export type InsertGoogleUser = z.infer<typeof insertGoogleUserSchema>;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── Plan (one per user, contains profile/goals) ─────────────────────────────
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  birthYear: integer("birth_year"),
  gender: text("gender"),
  retirementAge: integer("retirement_age").default(65),
  planToAge: integer("plan_to_age").default(90),
  stateOfResidence: text("state_of_residence"),
  filingStatus: text("filing_status").default("single"),
  hasSpouse: boolean("has_spouse").default(false),
  spouseFirstName: text("spouse_first_name"),
  spouseLastName: text("spouse_last_name"),
  spouseBirthYear: integer("spouse_birth_year"),
  spouseGender: text("spouse_gender"),
  spouseRetirementAge: integer("spouse_retirement_age").default(65),
  spousePlanToAge: integer("spouse_plan_to_age").default(90),
  inflationRate: real("inflation_rate").default(2.5),
  medicalInflationRate: real("medical_inflation_rate").default(5.0),
  housingAppreciationRate: real("housing_appreciation_rate").default(3.0),
  ssCola: real("ss_cola").default(2.5),
  legacyGoal: real("legacy_goal").default(0),
  dollarDisplay: text("dollar_display").default("today"),
  hasPartner: boolean("has_partner").default(false),
  partnerFirstName: text("partner_first_name"),
  partnerLastName: text("partner_last_name"),
  partnerBirthYear: integer("partner_birth_year"),
  partnerRetirementAge: integer("partner_retirement_age").default(65),
  partnerPlanToAge: integer("partner_plan_to_age").default(90),
  updatedAt: text("updated_at").notNull().default(new Date().toISOString()),
});

export const insertPlanSchema = createInsertSchema(plans).omit({ id: true, updatedAt: true });
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Plan = typeof plans.$inferSelect;

// ─── Accounts & Assets ───────────────────────────────────────────────────────
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(),
  owner: text("owner").notNull().default("primary"),
  accountType: text("account_type").notNull(),
  name: text("name").notNull(),
  balance: real("balance").notNull().default(0),
  rateOfReturn: real("rate_of_return").default(6.0),
  assetAllocation: real("asset_allocation").default(60),
  annualContribution: real("annual_contribution").default(0),
  employerMatch: real("employer_match").default(0),
  employerMatchLimit: real("employer_match_limit").default(0),
  contributionEndAge: integer("contribution_end_age"),
  plaidAccountId: text("plaid_account_id"),
  plaidItemId: text("plaid_item_id"),
  notes: text("notes"),
});

export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true });
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

// ─── Real Estate ─────────────────────────────────────────────────────────────
export const realEstate = pgTable("real_estate", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(),
  propertyType: text("property_type").notNull().default("primary"),
  name: text("name").notNull(),
  currentValue: real("current_value").notNull().default(0),
  mortgageBalance: real("mortgage_balance").default(0),
  mortgageRate: real("mortgage_rate").default(0),
  monthlyPayment: real("monthly_payment").default(0),
  appreciationRate: real("appreciation_rate").default(3.0),
  monthlyRentalIncome: real("monthly_rental_income").default(0),
  ownershipType: text("ownership_type").default("own"),
  plannedSaleAge: integer("planned_sale_age"),
  plannedPurchaseAge: integer("planned_purchase_age"),
  notes: text("notes"),
});

export const insertRealEstateSchema = createInsertSchema(realEstate).omit({ id: true });
export type InsertRealEstate = z.infer<typeof insertRealEstateSchema>;
export type RealEstate = typeof realEstate.$inferSelect;

// ─── Debts ───────────────────────────────────────────────────────────────────
export const debts = pgTable("debts", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(),
  debtType: text("debt_type").notNull().default("other"),
  name: text("name").notNull(),
  balance: real("balance").notNull().default(0),
  interestRate: real("interest_rate").default(0),
  monthlyPayment: real("monthly_payment").default(0),
  notes: text("notes"),
});

export const insertDebtSchema = createInsertSchema(debts).omit({ id: true });
export type InsertDebt = z.infer<typeof insertDebtSchema>;
export type Debt = typeof debts.$inferSelect;

// ─── Income Sources ───────────────────────────────────────────────────────────
export const incomes = pgTable("incomes", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(),
  owner: text("owner").notNull().default("primary"),
  incomeType: text("income_type").notNull(),
  name: text("name").notNull(),
  annualAmount: real("annual_amount").notNull().default(0),
  startAge: integer("start_age"),
  endAge: integer("end_age"),
  annualIncrease: real("annual_increase").default(2.5),
  isOneTime: boolean("is_one_time").default(false),
  ssBenefitAge: integer("ss_benefit_age"),
  ssBaseMonthlyBenefit: real("ss_base_monthly_benefit"),
  ssSurvivorBenefit: real("ss_survivor_benefit"),
  pensionType: text("pension_type"),
  pensionCola: real("pension_cola").default(0),
  notes: text("notes"),
});

export const insertIncomeSchema = createInsertSchema(incomes).omit({ id: true });
export type InsertIncome = z.infer<typeof insertIncomeSchema>;
export type Income = typeof incomes.$inferSelect;

// ─── Expenses ─────────────────────────────────────────────────────────────────
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(),
  owner: text("owner").notNull().default("primary"),
  expenseType: text("expense_type").notNull().default("other"),
  category: text("category").notNull().default("must_spend"),
  name: text("name").notNull(),
  annualAmount: real("annual_amount").notNull().default(0),
  startAge: integer("start_age"),
  endAge: integer("end_age"),
  annualIncrease: real("annual_increase").default(2.5),
  isOneTime: boolean("is_one_time").default(false),
  notes: text("notes"),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

// ─── Healthcare ───────────────────────────────────────────────────────────────
export const healthcare = pgTable("healthcare", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull().unique(),
  preMedicareAnnualCost: real("pre_medicare_annual_cost").default(12000),
  medicarePartBMonthly: real("medicare_part_b_monthly").default(174.70),
  medicarePartDMonthly: real("medicare_part_d_monthly").default(35),
  ltcMonthlyCost: real("ltc_monthly_cost").default(4500),
  ltcStartAge: integer("ltc_start_age").default(80),
  ltcDurationYears: integer("ltc_duration_years").default(3),
  spouseLtcMonthlyCost: real("spouse_ltc_monthly_cost").default(4500),
  spouseLtcStartAge: integer("spouse_ltc_start_age").default(80),
  spouseLtcDurationYears: integer("spouse_ltc_duration_years").default(3),
  irmaaSurchargeEnabled: boolean("irmaa_surcharge_enabled").default(true),
});

export const insertHealthcareSchema = createInsertSchema(healthcare).omit({ id: true });
export type InsertHealthcare = z.infer<typeof insertHealthcareSchema>;
export type Healthcare = typeof healthcare.$inferSelect;

// ─── Scenarios ────────────────────────────────────────────────────────────────
export const scenarios = pgTable("scenarios", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isBase: boolean("is_base").default(false),
  overrides: text("overrides").default("{}"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertScenarioSchema = createInsertSchema(scenarios).omit({ id: true, createdAt: true });
export type InsertScenario = z.infer<typeof insertScenarioSchema>;
export type Scenario = typeof scenarios.$inferSelect;

// ─── Investment Positions ─────────────────────────────────────────────────────
export const positions = pgTable("positions", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(),
  accountId: integer("account_id").notNull(),
  ticker: text("ticker").notNull(),
  companyName: text("company_name"),
  shares: real("shares").notNull().default(0),
  costBasisPerShare: real("cost_basis_per_share").notNull().default(0),
  currentPrice: real("current_price").notNull().default(0),
  notes: text("notes"),
});

export const insertPositionSchema = createInsertSchema(positions).omit({ id: true });
export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type Position = typeof positions.$inferSelect;

// ─── Withdrawal Strategy ──────────────────────────────────────────────────────
export const withdrawalStrategy = pgTable("withdrawal_strategy", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull().unique(),
  strategy: text("strategy").notNull().default("spending_needs"),
  fixedPercentage: real("fixed_percentage").default(4.0),
  withdrawalOrder: text("withdrawal_order").default('["after_tax","pre_tax","roth","hsa"]'),
});

export const insertWithdrawalStrategySchema = createInsertSchema(withdrawalStrategy).omit({ id: true });
export type InsertWithdrawalStrategy = z.infer<typeof insertWithdrawalStrategySchema>;
export type WithdrawalStrategy = typeof withdrawalStrategy.$inferSelect;

// ─── Plaid Connections ────────────────────────────────────────────────────────
export const plaidConnections = pgTable("plaid_connections", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(),
  accessToken: text("access_token").notNull(),
  itemId: text("item_id").notNull(),
  institutionId: text("institution_id"),
  institutionName: text("institution_name"),
  lastSynced: text("last_synced"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertPlaidConnectionSchema = createInsertSchema(plaidConnections).omit({ id: true, createdAt: true });
export type InsertPlaidConnection = z.infer<typeof insertPlaidConnectionSchema>;
export type PlaidConnection = typeof plaidConnections.$inferSelect;
