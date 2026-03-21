// Formatting utilities for financial data

export function formatCurrency(amount: number, compact = false): string {
  if (compact) {
    if (Math.abs(amount) >= 1_000_000) {
      return `$${(amount / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(amount) >= 1_000) {
      return `$${(amount / 1_000).toFixed(0)}K`;
    }
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  "401k": "401(k)",
  "403b": "403(b)",
  "457b": "457(b)",
  "roth_401k": "Roth 401(k)",
  "roth_ira": "Roth IRA",
  "traditional_ira": "Traditional IRA",
  "hsa": "HSA",
  "529": "529 Plan",
  "brokerage": "Brokerage",
  "checking": "Checking",
  "savings": "Savings",
  "cd": "CD / Money Market",
  "money_market": "Money Market",
};

export const INCOME_TYPE_LABELS: Record<string, string> = {
  "work": "Employment / Work",
  "social_security": "Social Security",
  "pension": "Pension",
  "annuity": "Annuity",
  "rental": "Rental Income",
  "dividends": "Dividends",
  "interest": "Interest",
  "windfall": "Windfall / Inheritance",
  "other": "Other Income",
};

export const EXPENSE_TYPE_LABELS: Record<string, string> = {
  "housing": "Housing",
  "food": "Food & Dining",
  "transport": "Transportation",
  "healthcare": "Healthcare",
  "insurance": "Insurance",
  "entertainment": "Entertainment",
  "travel": "Travel",
  "clothing": "Clothing",
  "personal": "Personal Care",
  "education": "Education",
  "other": "Other",
};

export const DEBT_TYPE_LABELS: Record<string, string> = {
  "auto": "Auto Loan",
  "medical": "Medical Debt",
  "student": "Student Loan",
  "credit_card": "Credit Card",
  "personal": "Personal Loan",
  "other": "Other Debt",
};

export const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming","District of Columbia",
];

export function getSuccessColor(chance: number): string {
  if (chance >= 80) return "text-green-600 dark:text-green-400";
  if (chance >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function getSuccessBg(chance: number): string {
  if (chance >= 80) return "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800";
  if (chance >= 60) return "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800";
  return "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800";
}
