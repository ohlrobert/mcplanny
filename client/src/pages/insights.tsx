import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/finance";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";

export default function InsightsPage() {
  const { data: projections, isLoading } = useQuery({ queryKey: ["/api/projections"] });
  const { data: plan } = useQuery({ queryKey: ["/api/plan"] });
  const years = (projections as any)?.years || [];
  const monteCarlo = (projections as any)?.monteCarlo;
  const p = plan as any;
  const retirementAge = p?.retirementAge || 65;

  // Downsample for readability
  const chartYears = years.filter((_: any, i: number) => i % 2 === 0 || i === 0);

  const netWorthData = chartYears.map((y: any) => ({
    age: y.age,
    "Pre-Tax": y.preTaxBalance,
    "Roth": y.rothBalance,
    "After-Tax": y.afterTaxBalance,
    "HSA": y.hsaBalance,
    "Real Estate": y.realEstateEquity,
    "Net Worth": y.netWorth,
  }));

  const cashFlowData = chartYears.map((y: any) => ({
    age: y.age,
    "Income": y.totalIncome,
    "Expenses": y.totalExpenses,
    "Healthcare": y.healthcareCost,
    "Net Flow": y.netCashFlow,
  }));

  const savingsData = chartYears.map((y: any) => ({
    age: y.age,
    "Total Savings": y.totalSavings,
  }));

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (years.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold mb-4">Insights</h1>
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <div className="text-muted-foreground mb-2">No data yet</div>
          <p className="text-sm text-muted-foreground">Complete your profile and add accounts, income, and expenses to see insights</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Insights</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Lifetime financial projections and analysis</p>
      </div>

      <Tabs defaultValue="networth">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="networth">Net Worth</TabsTrigger>
          <TabsTrigger value="savings">Savings Buckets</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="healthcare">Healthcare</TabsTrigger>
          <TabsTrigger value="montecarlo">Monte Carlo</TabsTrigger>
        </TabsList>

        {/* Net Worth */}
        <TabsContent value="networth" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Lifetime Net Worth Projection</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={netWorthData}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(152,58%,28%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(152,58%,28%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 88%)" />
                  <XAxis dataKey="age" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} width={60} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} labelFormatter={l => `Age ${l}`} />
                  <ReferenceLine x={retirementAge} stroke="hsl(37 88% 50%)" strokeDasharray="5 3" label={{ value: "Retire", position: "top", fontSize: 11, fill: "hsl(37 88% 50%)" }} />
                  <Area type="monotone" dataKey="Net Worth" stroke="hsl(152,58%,28%)" fill="url(#g1)" strokeWidth={2.5} />
                  <Line type="monotone" dataKey="Pre-Tax" stroke="hsl(217,71%,48%)" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="Roth" stroke="hsl(262,60%,50%)" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="Real Estate" stroke="hsl(37,88%,50%)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Net worth table at key ages */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Net Worth at Key Ages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-xs">
                      <th className="text-left py-2 font-medium">Age</th>
                      <th className="text-right py-2 font-medium">Net Worth</th>
                      <th className="text-right py-2 font-medium">Total Savings</th>
                      <th className="text-right py-2 font-medium">Annual Income</th>
                      <th className="text-right py-2 font-medium">Annual Expenses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[55, 60, 65, 70, 75, 80, 85, 90].map(age => {
                      const yr = years.find((y: any) => y.age === age);
                      if (!yr) return null;
                      return (
                        <tr key={age} className={`border-b border-border/50 ${yr.isRetired ? "bg-primary/5" : ""}`}>
                          <td className="py-2 font-medium">{age}{yr.isRetired ? " 🏖️" : ""}</td>
                          <td className="py-2 text-right">{formatCurrency(yr.netWorth)}</td>
                          <td className="py-2 text-right">{formatCurrency(yr.totalSavings)}</td>
                          <td className="py-2 text-right">{formatCurrency(yr.totalIncome)}</td>
                          <td className="py-2 text-right">{formatCurrency(yr.totalExpenses)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Savings Buckets */}
        <TabsContent value="savings" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Savings by Tax Bucket</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={netWorthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 88%)" />
                  <XAxis dataKey="age" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} width={60} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} labelFormatter={l => `Age ${l}`} />
                  <ReferenceLine x={retirementAge} stroke="hsl(37 88% 50%)" strokeDasharray="5 3" />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Area type="monotone" dataKey="Pre-Tax" stackId="1" stroke="hsl(217,71%,48%)" fill="hsl(217,71%,48%)" fillOpacity={0.7} />
                  <Area type="monotone" dataKey="Roth" stackId="1" stroke="hsl(262,60%,50%)" fill="hsl(262,60%,50%)" fillOpacity={0.7} />
                  <Area type="monotone" dataKey="After-Tax" stackId="1" stroke="hsl(37,88%,50%)" fill="hsl(37,88%,50%)" fillOpacity={0.7} />
                  <Area type="monotone" dataKey="HSA" stackId="1" stroke="hsl(152,58%,28%)" fill="hsl(152,58%,28%)" fillOpacity={0.7} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Flow */}
        <TabsContent value="cashflow" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Income vs. Expenses (Lifetime)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 88%)" />
                  <XAxis dataKey="age" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} width={60} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} labelFormatter={l => `Age ${l}`} />
                  <ReferenceLine x={retirementAge} stroke="hsl(37 88% 50%)" strokeDasharray="5 3" />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="Income" fill="hsl(152,58%,28%)" radius={[3,3,0,0]} />
                  <Bar dataKey="Expenses" fill="hsl(37,88%,50%)" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Annual Net Cash Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 88%)" />
                  <XAxis dataKey="age" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} width={60} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} labelFormatter={l => `Age ${l}`} />
                  <ReferenceLine y={0} stroke="hsl(215 25% 12%)" />
                  <Bar dataKey="Net Flow" fill="hsl(152,58%,28%)"
                    radius={[3,3,0,0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Healthcare */}
        <TabsContent value="healthcare" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Projected Healthcare Costs</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={cashFlowData}>
                  <defs>
                    <linearGradient id="hcGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0,65%,48%)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(0,65%,48%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 88%)" />
                  <XAxis dataKey="age" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} width={60} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} labelFormatter={l => `Age ${l}`} />
                  <ReferenceLine x={65} stroke="hsl(217,71%,48%)" strokeDasharray="5 3" label={{ value: "Medicare", position: "top", fontSize: 11 }} />
                  <Area type="monotone" dataKey="Healthcare" stroke="hsl(0,65%,48%)" fill="url(#hcGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
                Total projected lifetime healthcare: <strong>{formatCurrency(cashFlowData.reduce((s: number, y: any) => s + (y.Healthcare || 0), 0))}</strong>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monte Carlo */}
        <TabsContent value="montecarlo" className="mt-4">
          {monteCarlo ? (
            <div className="space-y-4">
              <Card className={`border-2 ${monteCarlo.chanceOfSuccess >= 80 ? "border-green-400 dark:border-green-600" : monteCarlo.chanceOfSuccess >= 60 ? "border-amber-400 dark:border-amber-600" : "border-red-400 dark:border-red-600"}`}>
                <CardContent className="pt-6 pb-6 text-center">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Monte Carlo — {monteCarlo.iterations.toLocaleString()} Simulations
                  </div>
                  <div className={`text-6xl font-bold mb-2 ${monteCarlo.chanceOfSuccess >= 80 ? "text-green-600 dark:text-green-400" : monteCarlo.chanceOfSuccess >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                    {monteCarlo.chanceOfSuccess}%
                  </div>
                  <div className="text-base font-medium">Chance of Retirement Success</div>
                  <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                    Probability your savings outlast your retirement based on randomized market return scenarios
                  </p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <CardContent className="pt-4 pb-4">
                    <div className="text-xs text-muted-foreground font-medium mb-1">Strong (&gt;80%)</div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">On Track</div>
                    <p className="text-xs text-muted-foreground mt-1">Good margin of safety against market volatility</p>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                  <CardContent className="pt-4 pb-4">
                    <div className="text-xs text-muted-foreground font-medium mb-1">Moderate (60-80%)</div>
                    <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">Acceptable</div>
                    <p className="text-xs text-muted-foreground mt-1">Consider increasing savings or reducing expenses</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                  <CardContent className="pt-4 pb-4">
                    <div className="text-xs text-muted-foreground font-medium mb-1">At Risk (&lt;60%)</div>
                    <div className="text-2xl font-bold text-red-700 dark:text-red-300">Adjust Plan</div>
                    <p className="text-xs text-muted-foreground mt-1">Significant risk of running out of money</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">Add accounts and income to run Monte Carlo simulations</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
