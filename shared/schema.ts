import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── Plan (one per user, contains profile/goals) ─────────────────────────────
export const plans = sqliteTable("plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  // Primary person
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  birthYear: integer("birth_year"),
  gender: text("gender"), // male | female | other
  retirementAge: integer("retirement_age").default(65),
  planToAge: integer("plan_to_age").default(90),
  stateOfResidence: text("state_of_residence"),
  filingStatus: text("filing_status").default("single"), // single | married | married_separately | head_of_household
  // Spouse
  hasSpouse: integer("has_spouse", { mode: "boolean" }).default(false),
  spouseFirstName: text("spouse_first_name"),
  spouseLastName: text("spouse_last_name"),
  spouseBirthYear: integer("spouse_birth_year"),
  spouseGender: text("spouse_gender"),
  spouseRetirementAge: integer("spouse_retirement_age").default(65),
  spousePlanToAge: integer("spouse_plan_to_age").default(90),
  // Assumptions
  inflationRate: real("inflation_rate").default(2.5),
  medicalInflationRate: real("medical_inflation_rate").default(5.0),
  housingAppreciationRate: real("housing_appreciation_rate").default(3.0),
  ssCola: real("ss_cola").default(2.5),
  // Goals
  legacyGoal: real("legacy_goal").default(0),
  // Display
  dollarDisplay: text("dollar_display").default("today"), // today | future
  updatedAt: text("updated_at").notNull().default(new Date().toISOString()),
});

export const insertPlanSchema = createInsertSchema(plans).omit({ id: true, updatedAt: true });
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Plan = typeof plans.$inferSelect;

// ─── Accounts & Assets ───────────────────────────────────────────────────────
export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  planId: integer("plan_id").notNull(),
  owner: text("owner").notNull().default("primary"), // primary | spouse | joint
  accountType: text("account_type").notNull(), // 401k | 403b | 457b | roth_401k | roth_ira | traditional_ira | hsa | 529 | brokerage | checking | savings | cd | money_market
  name: text("name").notNull(),
  balance: real("balance").notNull().default(0),
  rateOfReturn: real("rate_of_return").default(6.0),
  assetAllocation: real("asset_allocation").default(60), // % stocks
  annualContribution: real("annual_contribution").default(0),
  employerMatch: real("employer_match").default(0),
  employerMatchLimit: real("employer_match_limit").default(0), // % of salary
  contributionEndAge: integer("contribution_end_age"),
  notes: text("notes"),
});

export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true });
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

// ─── Real Estate ─────────────────────────────────────────────────────────────
export const realEstate = sqliteTable("real_estate", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  planId: integer("plan_id").notNull(),
  propertyType: text("property_type").notNull().default("primary"), // primary | vacation | rental | future_purchase
  name: text("name").notNull(),
  currentValue: real("current_value").notNull().default(0),
  mortgageBalance: real("mortgage_balance").default(0),
  mortgageRate: real("mortgage_rate").default(0),
  monthlyPayment: real("monthly_payment").default(0),
  appreciationRate: real("appreciation_rate").default(3.0),
  monthlyRentalIncome: real("monthly_rental_income").default(0),
  ownershipType: text("ownership_type").default("own"), // own | rent | reverse_mortgage
  plannedSaleAge: integer("planned_sale_age"),
  plannedPurchaseAge: integer("planned_purchase_age"),
  notes: text("notes"),
});

export const insertRealEstateSchema = createInsertSchema(realEstate).omit({ id: true });
export type InsertRealEstate = z.infer<typeof insertRealEstateSchema>;
export type RealEstate = typeof realEstate.$inferSelect;

// ─── Debts ───────────────────────────────────────────────────────────────────
export const debts = sqliteTable("debts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  planId: integer("plan_id").notNull(),
  debtType: text("debt_type").notNull().default("other"), // auto | medical | student | credit_card | personal | other
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
export const incomes = sqliteTable("incomes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  planId: integer("plan_id").notNull(),
  owner: text("owner").notNull().default("primary"),
  incomeType: text("income_type").notNull(), // work | social_security | pension | annuity | rental | dividends | interest | windfall | other
  name: text("name").notNull(),
  annualAmount: real("annual_amount").notNull().default(0),
  startAge: integer("start_age"),
  endAge: integer("end_age"),
  annualIncrease: real("annual_increase").default(2.5), // % per year COLA
  isOneTime: integer("is_one_time", { mode: "boolean" }).default(false),
  // Social Security specific
  ssBenefitAge: integer("ss_benefit_age"), // claiming age 62-70
  ssSurvivorBenefit: real("ss_survivor_benefit"),
  // Pension specific
  pensionType: text("pension_type"), // monthly | lump_sum | cash_balance
  pensionCola: real("pension_cola").default(0),
  notes: text("notes"),
});

export const insertIncomeSchema = createInsertSchema(incomes).omit({ id: true });
export type InsertIncome = z.infer<typeof insertIncomeSchema>;
export type Income = typeof incomes.$inferSelect;

// ─── Expenses ─────────────────────────────────────────────────────────────────
export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  planId: integer("plan_id").notNull(),
  expenseType: text("expense_type").notNull().default("other"), // housing | food | transport | healthcare | insurance | entertainment | travel | clothing | personal | education | other
  category: text("category").notNull().default("must_spend"), // must_spend | like_to_spend
  name: text("name").notNull(),
  annualAmount: real("annual_amount").notNull().default(0),
  startAge: integer("start_age"),
  endAge: integer("end_age"),
  annualIncrease: real("annual_increase").default(2.5),
  isOneTime: integer("is_one_time", { mode: "boolean" }).default(false),
  notes: text("notes"),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

// ─── Healthcare ───────────────────────────────────────────────────────────────
export const healthcare = sqliteTable("healthcare", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  irmaaSurchargeEnabled: integer("irmaa_surcharge_enabled", { mode: "boolean" }).default(true),
});

export const insertHealthcareSchema = createInsertSchema(healthcare).omit({ id: true });
export type InsertHealthcare = z.infer<typeof insertHealthcareSchema>;
export type Healthcare = typeof healthcare.$inferSelect;

// ─── Scenarios ────────────────────────────────────────────────────────────────
export const scenarios = sqliteTable("scenarios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  planId: integer("plan_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isBase: integer("is_base", { mode: "boolean" }).default(false),
  // Override fields (JSON stored overrides for any plan field)
  overrides: text("overrides").default("{}"), // JSON string of overrides
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertScenarioSchema = createInsertSchema(scenarios).omit({ id: true, createdAt: true });
export type InsertScenario = z.infer<typeof insertScenarioSchema>;
export type Scenario = typeof scenarios.$inferSelect;

// ─── Withdrawal Strategy ──────────────────────────────────────────────────────
export const withdrawalStrategy = sqliteTable("withdrawal_strategy", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  planId: integer("plan_id").notNull().unique(),
  strategy: text("strategy").notNull().default("spending_needs"), // spending_needs | max_spending | fixed_percentage
  fixedPercentage: real("fixed_percentage").default(4.0),
  withdrawalOrder: text("withdrawal_order").default('["after_tax","pre_tax","roth","hsa"]'), // JSON array
});

export const insertWithdrawalStrategySchema = createInsertSchema(withdrawalStrategy).omit({ id: true });
export type InsertWithdrawalStrategy = z.infer<typeof insertWithdrawalStrategySchema>;
export type WithdrawalStrategy = typeof withdrawalStrategy.$inferSelect;
