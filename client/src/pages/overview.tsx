import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, getSuccessColor, getSuccessBg } from "@/lib/finance";
import { TrendingUp, DollarSign, PiggyBank, Target, Calendar, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { cn } from "@/lib/utils";

export default function Overview() {
  const { data: plan } = useQuery({ queryKey: ["/api/plan"] });
  const { data: projections, isLoading } = useQuery({ queryKey: ["/api/projections"] });

  const years = (projections as any)?.years || [];
  const monteCarlo = (projections as any)?.monteCarlo;
  const p = plan as any;

  // Summary stats
  const currentYear = new Date().getFullYear();
  const currentAge = p?.birthYear ? currentYear - p.birthYear : null;
  const currentData = years.find((y: any) => y.age === currentAge) || years[0];
  const retirementData = years.find((y: any) => y.isRetired) || null;
  const finalData = years[years.length - 1];

  // Net worth chart data — every 5 years
  const chartData = years.filter((_: any, i: number) => i % 5 === 0 || i === 0).map((y: any) => ({
    age: y.age,
    "Net Worth": Math.max(0, y.netWorth),
    "Savings": Math.max(0, y.totalSavings),
    "Real Estate": Math.max(0, y.realEstateEquity),
  }));

  // Income vs expenses chart
  const incExpData = years.filter((_: any, i: number) => i % 3 === 0).map((y: any) => ({
    age: y.age,
    "Income": y.totalIncome,
    "Expenses": y.totalExpenses,
  }));

  if (!p?.firstName) {
    return (
      <div className="p-8 max-w-2xl">
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 flex gap-4">
          <Info className="text-primary shrink-0 mt-0.5" size={20} />
          <div>
            <div className="font-semibold mb-1">Welcome to McPlanny!</div>
            <p className="text-sm text-muted-foreground mb-3">
              To see your financial projections, start by entering your profile details —
              your birth year, retirement age, and income/expense information.
            </p>
            <a href="#/profile" className="text-sm text-primary font-medium hover:underline">
              Set up your profile →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {p.firstName ? `${p.firstName}'s` : "Your"} financial plan at a glance
        </p>
      </div>

      {/* Monte Carlo Hero */}
      {monteCarlo && (
        <div className={cn("rounded-xl border p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4", getSuccessBg(monteCarlo.chanceOfSuccess))}>
          <div className="flex-1">
            <div className="text-sm font-medium text-muted-foreground mb-1">Retirement Chance of Success</div>
            <div className={cn("text-5xl font-bold", getSuccessColor(monteCarlo.chanceOfSuccess))}>
              {monteCarlo.chanceOfSuccess}%
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Based on {monteCarlo.iterations.toLocaleString()} Monte Carlo simulations
            </div>
          </div>
          <div className="flex flex-col gap-2 min-w-fit">
            <Badge variant={monteCarlo.chanceOfSuccess >= 80 ? "default" : monteCarlo.chanceOfSuccess >= 60 ? "secondary" : "destructive"}
              className="text-sm px-3 py-1">
              {monteCarlo.label}
            </Badge>
            {monteCarlo.chanceOfSuccess < 80 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <AlertCircle size={12} />
                Consider adjusting your plan
              </div>
            )}
            {monteCarlo.chanceOfSuccess >= 80 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 size={12} />
                On track for retirement
              </div>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Current Net Worth"
          value={currentData ? formatCurrency(currentData.netWorth, true) : "—"}
          icon={<TrendingUp size={18} />}
          subtitle="Including all assets & debts"
          loading={isLoading}
        />
        <KPICard
          title="Retirement Savings"
          value={currentData ? formatCurrency(currentData.totalSavings, true) : "—"}
          icon={<PiggyBank size={18} />}
          subtitle="Across all accounts"
          loading={isLoading}
        />
        <KPICard
          title="At Retirement"
          value={retirementData ? formatCurrency(retirementData.totalSavings, true) : "—"}
          icon={<Target size={18} />}
          subtitle={retirementData ? `Age ${retirementData.age}` : "Set retirement age"}
          loading={isLoading}
        />
        <KPICard
          title="Projected at Age"
          value={finalData ? formatCurrency(finalData.netWorth, true) : "—"}
          icon={<Calendar size={18} />}
          subtitle={finalData ? `Age ${finalData.age}` : ""}
          loading={isLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Net Worth Over Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Net Worth Projection</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(152, 58%, 28%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(152, 58%, 28%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217, 71%, 48%)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(217, 71%, 48%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 88%)" />
                  <XAxis dataKey="age" tick={{ fontSize: 11 }} tickFormatter={v => `${v}`} label={{ value: "Age", position: "insideBottom", offset: -2, fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} width={55} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} labelFormatter={l => `Age ${l}`} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Area type="monotone" dataKey="Net Worth" stroke="hsl(152, 58%, 28%)" fill="url(#netWorthGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Savings" stroke="hsl(217, 71%, 48%)" fill="url(#savingsGrad)" strokeWidth={1.5} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>

        {/* Income vs Expenses */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Income vs. Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : incExpData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={incExpData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 88%)" />
                  <XAxis dataKey="age" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} width={55} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} labelFormatter={l => `Age ${l}`} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="Income" fill="hsl(152, 58%, 28%)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Expenses" fill="hsl(37, 88%, 50%)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Savings Breakdown */}
      {currentData && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Current Savings Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SavingsBucket label="Pre-Tax (401k, IRA)" value={currentData.preTaxBalance} color="bg-primary" />
              <SavingsBucket label="Roth Accounts" value={currentData.rothBalance} color="bg-blue-500" />
              <SavingsBucket label="After-Tax / Brokerage" value={currentData.afterTaxBalance} color="bg-amber-500" />
              <SavingsBucket label="HSA" value={currentData.hsaBalance} color="bg-purple-500" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Retirement Year Breakdown */}
      {retirementData && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Retirement Year Snapshot (Age {retirementData.age})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <Stat label="Total Savings" value={formatCurrency(retirementData.totalSavings)} />
              <Stat label="Annual Income" value={formatCurrency(retirementData.totalIncome)} />
              <Stat label="Annual Expenses" value={formatCurrency(retirementData.totalExpenses)} />
              <Stat label="Net Cash Flow" value={formatCurrency(retirementData.netCashFlow)} positive={retirementData.netCashFlow >= 0} />
              <Stat label="Real Estate Equity" value={formatCurrency(retirementData.realEstateEquity)} />
              <Stat label="Net Worth" value={formatCurrency(retirementData.netWorth)} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPICard({ title, value, icon, subtitle, loading }: any) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between mb-2">
          <div className="text-xs text-muted-foreground font-medium leading-snug">{title}</div>
          <div className="text-primary opacity-60">{icon}</div>
        </div>
        {loading ? (
          <Skeleton className="h-7 w-24 mb-1" />
        ) : (
          <div className="text-xl font-bold text-foreground">{value}</div>
        )}
        <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
      </CardContent>
    </Card>
  );
}

function SavingsBucket({ label, value, color }: any) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className={cn("w-2.5 h-2.5 rounded-sm", color)} />
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
      <div className="text-base font-semibold">{formatCurrency(value || 0, true)}</div>
    </div>
  );
}

function Stat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("font-semibold mt-0.5", positive === false ? "text-red-600 dark:text-red-400" : positive === true ? "text-green-600 dark:text-green-400" : "")}>
        {value}
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
      Add income and accounts to see projections
    </div>
  );
}
