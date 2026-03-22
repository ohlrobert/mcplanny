import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/finance";
import { ArrowRightLeft, TrendingUp, DollarSign, Info } from "lucide-react";

// 2024 Federal income tax brackets
const FEDERAL_BRACKETS: Record<string, Array<[number, number, number]>> = {
  single: [
    [0, 11600, 0.10],
    [11600, 47150, 0.12],
    [47150, 100525, 0.22],
    [100525, 191950, 0.24],
    [191950, 243725, 0.32],
    [243725, 609350, 0.35],
    [609350, Infinity, 0.37],
  ],
  married: [
    [0, 23200, 0.10],
    [23200, 94300, 0.12],
    [94300, 201050, 0.22],
    [201050, 383900, 0.24],
    [383900, 487450, 0.32],
    [487450, 731200, 0.35],
    [731200, Infinity, 0.37],
  ],
  head_of_household: [
    [0, 16550, 0.10],
    [16550, 63100, 0.12],
    [63100, 100500, 0.22],
    [100500, 191950, 0.24],
    [191950, 243700, 0.32],
    [243700, 609350, 0.35],
    [609350, Infinity, 0.37],
  ],
};

// State income tax rates (flat or simplified top marginal for retirement income)
const STATE_TAX_RATES: Record<string, number> = {
  Alabama: 0.05, Alaska: 0, Arizona: 0.025, Arkansas: 0.044, California: 0.093,
  Colorado: 0.044, Connecticut: 0.065, Delaware: 0.066, Florida: 0, Georgia: 0.055,
  Hawaii: 0.11, Idaho: 0.058, Illinois: 0.0495, Indiana: 0.03, Iowa: 0.06,
  Kansas: 0.057, Kentucky: 0.045, Louisiana: 0.042, Maine: 0.0715, Maryland: 0.0575,
  Massachusetts: 0.05, Michigan: 0.0425, Minnesota: 0.0985, Mississippi: 0.05,
  Missouri: 0.048, Montana: 0.065, Nebraska: 0.0684, Nevada: 0, "New Hampshire": 0,
  "New Jersey": 0.0897, "New Mexico": 0.059, "New York": 0.0685, "North Carolina": 0.0499,
  "North Dakota": 0.029, Ohio: 0.0399, Oklahoma: 0.0475, Oregon: 0.099,
  Pennsylvania: 0.0307, "Rhode Island": 0.0599, "South Carolina": 0.064,
  "South Dakota": 0, Tennessee: 0, Texas: 0, Utah: 0.0465, Vermont: 0.0875,
  Virginia: 0.0575, Washington: 0, "West Virginia": 0.065, Wisconsin: 0.0765,
  Wyoming: 0, "District of Columbia": 0.0895,
};

function calcFederalTax(income: number, filingStatus: string): number {
  const key = filingStatus === "married" || filingStatus === "married_separately" ? "married"
    : filingStatus === "head_of_household" ? "head_of_household" : "single";
  const brackets = FEDERAL_BRACKETS[key] || FEDERAL_BRACKETS.single;
  let tax = 0;
  for (const [lo, hi, rate] of brackets) {
    if (income <= lo) break;
    tax += (Math.min(income, hi) - lo) * rate;
  }
  return tax;
}

function getMarginalRate(income: number, filingStatus: string): number {
  const key = filingStatus === "married" || filingStatus === "married_separately" ? "married"
    : filingStatus === "head_of_household" ? "head_of_household" : "single";
  const brackets = FEDERAL_BRACKETS[key] || FEDERAL_BRACKETS.single;
  for (const [lo, hi, rate] of brackets) {
    if (income >= lo && income < hi) return rate;
  }
  return 0.37;
}

function getBracketLabel(rate: number): string {
  const labels: Record<number, string> = {
    0.10: "10%", 0.12: "12%", 0.22: "22%", 0.24: "24%",
    0.32: "32%", 0.35: "35%", 0.37: "37%",
  };
  return labels[rate] || `${(rate * 100).toFixed(0)}%`;
}

export default function RothConversionPage() {
  const { data: plan } = useQuery<any>({ queryKey: ["/api/plan"] });
  const { data: accounts = [] } = useQuery<any[]>({ queryKey: ["/api/accounts"] });
  const { data: incomes = [] } = useQuery<any[]>({ queryKey: ["/api/incomes"] });

  const [filingStatus, setFilingStatus] = useState("single");
  const [state, setState] = useState("");
  const [currentIncome, setCurrentIncome] = useState("");
  const [conversionAmount, setConversionAmount] = useState("");
  const [yearsToGrow, setYearsToGrow] = useState("");
  const [growthRate, setGrowthRate] = useState("8");
  const [futureWithdrawalRate, setFutureWithdrawalRate] = useState("22");

  // Pre-populate from plan when loaded
  const initialized = useState(false);
  useMemo(() => {
    if (plan && !initialized[0]) {
      setFilingStatus(plan.filingStatus || "single");
      setState(plan.stateOfResidence || "");
      if (plan.birthYear && plan.retirementAge) {
        const currentAge = new Date().getFullYear() - plan.birthYear;
        setYearsToGrow(String(Math.max(0, plan.retirementAge - currentAge)));
      }
      initialized[0] = true;
    }
  }, [plan]);

  const income = parseFloat(currentIncome) || 0;
  const conversion = parseFloat(conversionAmount) || 0;
  const years = parseInt(yearsToGrow) || 0;
  const growth = parseFloat(growthRate) / 100 || 0.08;
  const futureRate = parseFloat(futureWithdrawalRate) / 100 || 0.22;

  // Traditional IRA / pre-tax accounts
  const preTaxAccounts = accounts.filter((a: any) =>
    ["traditional_ira", "401k", "403b", "457b"].includes(a.accountType)
  );
  const totalPreTax = preTaxAccounts.reduce((s: number, a: any) => s + (a.balance || 0), 0);

  const results = useMemo(() => {
    if (conversion <= 0) return null;

    // Tax with and without conversion
    const taxWithout = calcFederalTax(income, filingStatus);
    const taxWith = calcFederalTax(income + conversion, filingStatus);
    const federalTaxOnConversion = taxWith - taxWithout;

    const stateTaxRate = STATE_TAX_RATES[state] ?? 0;
    const stateTaxOnConversion = conversion * stateTaxRate;
    const totalTax = federalTaxOnConversion + stateTaxOnConversion;
    const effectiveTaxRate = conversion > 0 ? (totalTax / conversion) * 100 : 0;

    const marginalBefore = getMarginalRate(income, filingStatus);
    const marginalAfter = getMarginalRate(income + conversion, filingStatus);

    // Roth projection: amount converted grows tax-free
    const rothFutureValue = conversion * Math.pow(1 + growth, years);
    // Traditional projection: same amount, but taxed on withdrawal at futureRate
    const tradFutureValue = conversion * Math.pow(1 + growth, years) * (1 - futureRate);
    const advantage = rothFutureValue - tradFutureValue;

    // Break-even: how many years until Roth advantage covers the tax cost
    let breakEven = null;
    for (let y = 1; y <= 40; y++) {
      const rothVal = conversion * Math.pow(1 + growth, y);
      const tradVal = conversion * Math.pow(1 + growth, y) * (1 - futureRate);
      if (rothVal - tradVal >= totalTax) { breakEven = y; break; }
    }

    return {
      federalTaxOnConversion, stateTaxOnConversion, totalTax, effectiveTaxRate,
      marginalBefore, marginalAfter, rothFutureValue, tradFutureValue, advantage,
      breakEven, stateTaxRate,
    };
  }, [income, conversion, filingStatus, state, years, growth, futureRate]);

  const worthwhile = results && results.effectiveTaxRate < futureRate * 100;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ArrowRightLeft size={20} className="text-primary" /> Roth Conversion Planner
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Model the tax cost and long-term benefit of converting traditional IRA / 401(k) funds to Roth
        </p>
      </div>

      {totalPreTax > 0 && (
        <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2.5 border">
          <Info size={14} className="text-muted-foreground shrink-0" />
          <span>You have <strong>{formatCurrency(totalPreTax)}</strong> in pre-tax accounts eligible for conversion</span>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Conversion Inputs</CardTitle>
          <CardDescription>Adjust values to model different conversion scenarios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Filing Status</Label>
              <Select value={filingStatus} onValueChange={setFilingStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married Filing Jointly</SelectItem>
                  <SelectItem value="married_separately">Married Separately</SelectItem>
                  <SelectItem value="head_of_household">Head of Household</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>State of Residence</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {Object.keys(STATE_TAX_RATES).sort().map(s => (
                    <SelectItem key={s} value={s}>{s} ({(STATE_TAX_RATES[s] * 100).toFixed(2)}%)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Other Taxable Income This Year ($)</Label>
              <Input
                type="number" min={0} step={1000}
                value={currentIncome}
                onChange={e => setCurrentIncome(e.target.value)}
                placeholder="e.g. 80000"
              />
              <p className="text-xs text-muted-foreground">Wages, Social Security, etc. before the conversion</p>
            </div>
            <div className="space-y-1.5">
              <Label>Conversion Amount ($)</Label>
              <Input
                type="number" min={0} step={1000}
                value={conversionAmount}
                onChange={e => setConversionAmount(e.target.value)}
                placeholder="e.g. 50000"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Years Until Retirement</Label>
              <Input
                type="number" min={1} max={50}
                value={yearsToGrow}
                onChange={e => setYearsToGrow(e.target.value)}
                placeholder="15"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Expected Annual Growth (%)</Label>
              <Input
                type="number" min={0} max={30} step={0.5}
                value={growthRate}
                onChange={e => setGrowthRate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Estimated Future Tax Rate (%)</Label>
              <Input
                type="number" min={0} max={50} step={1}
                value={futureWithdrawalRate}
                onChange={e => setFutureWithdrawalRate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Rate you expect to pay on traditional withdrawals</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {results && conversion > 0 && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Tax Impact This Year</CardTitle>
                <Badge variant={worthwhile ? "default" : "secondary"}>
                  {worthwhile ? "Favorable" : "Evaluate Carefully"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Federal Tax on Conversion</div>
                  <div className="text-lg font-semibold">{formatCurrency(results.federalTaxOnConversion)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    State Tax on Conversion {state ? `(${(results.stateTaxRate * 100).toFixed(2)}%)` : ""}
                  </div>
                  <div className="text-lg font-semibold">
                    {state ? formatCurrency(results.stateTaxOnConversion) : <span className="text-muted-foreground text-sm">Select state</span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Total Tax Cost</div>
                  <div className="text-lg font-bold text-destructive">{formatCurrency(results.totalTax)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Effective Rate on Conversion</div>
                  <div className="text-lg font-bold">{results.effectiveTaxRate.toFixed(2)}%</div>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">Marginal Bracket Before</div>
                  <div className="font-medium">{getBracketLabel(results.marginalBefore)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">Marginal Bracket After Conversion</div>
                  <div className={`font-medium ${results.marginalAfter > results.marginalBefore ? "text-amber-600" : ""}`}>
                    {getBracketLabel(results.marginalAfter)}
                    {results.marginalAfter > results.marginalBefore && " ↑ bracket jump"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {years > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp size={16} className="text-primary" />
                  Long-Term Projection ({years} years at {growthRate}% growth)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 p-4">
                    <div className="text-xs font-medium text-violet-700 dark:text-violet-300 mb-1">Roth (Tax-Free Growth)</div>
                    <div className="text-xl font-bold text-violet-700 dark:text-violet-300">{formatCurrency(results.rothFutureValue)}</div>
                    <div className="text-xs text-violet-600/70 dark:text-violet-400/70 mt-1">Zero tax on withdrawal</div>
                  </div>
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4">
                    <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Traditional (After {futureWithdrawalRate}% Tax)</div>
                    <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(results.tradFutureValue)}</div>
                    <div className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">Net after withdrawal taxes</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
                  <DollarSign size={16} className={results.advantage >= 0 ? "text-green-600" : "text-red-600"} />
                  <div>
                    <span className="text-sm font-medium">
                      Roth advantage: {" "}
                      <span className={results.advantage >= 0 ? "text-green-600" : "text-red-600"}>
                        {results.advantage >= 0 ? "+" : ""}{formatCurrency(results.advantage)}
                      </span>
                    </span>
                    {results.breakEven !== null && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Break-even in approximately <strong>{results.breakEven} years</strong> — the Roth advantage covers the tax cost
                      </div>
                    )}
                    {results.breakEven === null && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Break-even not reached within 40 years at this growth rate and tax assumption
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Considerations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Converting makes the most sense when your current tax rate is <strong>lower</strong> than your expected future rate</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Pay the conversion tax with after-tax funds (not from the converted amount) to maximize Roth growth</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Roth accounts have no Required Minimum Distributions (RMDs) starting at age 73, providing estate planning flexibility</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Consider converting up to the top of your current tax bracket each year rather than all at once</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Low-income years (early retirement, sabbatical, business loss) are ideal conversion windows</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      {(!results || conversion <= 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <ArrowRightLeft className="mx-auto mb-3 text-muted-foreground" size={32} />
            <div className="font-medium mb-1">Enter a conversion amount to see results</div>
            <p className="text-sm text-muted-foreground">Fill in your taxable income and conversion amount above</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
