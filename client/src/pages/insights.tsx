import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/finance";
import { RefreshCw } from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";

export default function InsightsPage() {
  const qc = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data: projections, isLoading } = useQuery({ queryKey: ["/api/projections"] });
  const { data: plan } = useQuery({ queryKey: ["/api/plan"] });
  const years = (projections as any)?.years || [];
  const monteCarlo = (projections as any)?.monteCarlo;
  const p = plan as any;
  const retirementAge = p?.retirementAge || 65;

  const handleRunAnalysis = async () => {
    setIsRefreshing(true);
    await qc.invalidateQueries({ queryKey: ["/api/projections"] });
    await qc.refetchQueries({ queryKey: ["/api/projections"] });
    setIsRefreshing(false);
  };

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

  const percentileData = (monteCarlo?.percentileData || []).filter((_: any, i: number) => i % 2 === 0 || i === 0);

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

  const successColor = monteCarlo?.chanceOfSuccess >= 80
    ? { border: "border-green-400 dark:border-green-600", text: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950" }
    : monteCarlo?.chanceOfSuccess >= 60
    ? { border: "border-amber-400 dark:border-amber-600", text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950" }
    : { border: "border-red-400 dark:border-red-600", text: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950" };

  return (
    <div className="p-6 max-w-7xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Insights</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Lifetime financial projections and analysis</p>
        </div>
        <Button variant="outline" onClick={handleRunAnalysis} disabled={isRefreshing} className="gap-2">
          <RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""} />
          {isRefreshing ? "Running..." : "Run Analysis"}
        </Button>
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
                  <Bar dataKey="Net Flow" fill="hsl(152,58%,28%)" radius={[3,3,0,0]} />
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
              {/* Header success card */}
              <Card className={`border-2 ${successColor.border}`}>
                <CardContent className="pt-5 pb-5">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="text-center sm:text-left flex-1">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Monte Carlo — {monteCarlo.iterations.toLocaleString()} Simulations · 12% Annual Volatility
                      </div>
                      <div className="flex items-baseline gap-2 justify-center sm:justify-start">
                        <span className={`text-5xl font-bold ${successColor.text}`}>{monteCarlo.chanceOfSuccess}%</span>
                        <Badge variant="outline" className={`${successColor.text} border-current font-semibold`}>{monteCarlo.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Probability your savings outlast retirement across randomized market scenarios
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 sm:w-auto w-full">
                      {[
                        { label: "Strong", range: ">80%", color: "text-green-700 dark:text-green-300", bgColor: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" },
                        { label: "Moderate", range: "60–80%", color: "text-amber-700 dark:text-amber-300", bgColor: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800" },
                        { label: "At Risk", range: "<60%", color: "text-red-700 dark:text-red-300", bgColor: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800" },
                      ].map(t => (
                        <div key={t.label} className={`border rounded-lg p-2 text-center ${t.bgColor}`}>
                          <div className={`font-bold text-sm ${t.color}`}>{t.label}</div>
                          <div className="text-xs text-muted-foreground">{t.range}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Percentile chart */}
              {percentileData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Retirement Savings by Scenario</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Bands show the range of outcomes across {monteCarlo.iterations.toLocaleString()} simulations. The 90th percentile is the best case, 10th percentile the worst.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={380}>
                      <LineChart data={percentileData}>
                        <defs>
                          <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(217,71%,48%)" stopOpacity={0.08} />
                            <stop offset="100%" stopColor="hsl(217,71%,48%)" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 88%)" />
                        <XAxis dataKey="age" tick={{ fontSize: 11 }} label={{ value: "Age", position: "insideBottom", offset: -2, fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} width={65} />
                        <Tooltip
                          formatter={(v: any, name: string) => [formatCurrency(v), name]}
                          labelFormatter={l => `Age ${l}`}
                        />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                        <Line type="monotone" dataKey="p90" name="90th Pct (Best)" stroke="hsl(152,58%,28%)" strokeWidth={1.5} dot={false} strokeDasharray="6 3" />
                        <Line type="monotone" dataKey="p75" name="75th Pct" stroke="hsl(152,58%,40%)" strokeWidth={1.5} dot={false} />
                        <Line type="monotone" dataKey="average" name="Mean" stroke="hsl(217,71%,48%)" strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="p50" name="Median (50th)" stroke="hsl(262,60%,50%)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                        <Line type="monotone" dataKey="p25" name="25th Pct" stroke="hsl(37,88%,50%)" strokeWidth={1.5} dot={false} />
                        <Line type="monotone" dataKey="p10" name="10th Pct (Worst)" stroke="hsl(0,65%,48%)" strokeWidth={1.5} dot={false} strokeDasharray="6 3" />
                        <Line type="monotone" dataKey="baseline" name="Avg. Assumptions" stroke="hsl(215,25%,40%)" strokeWidth={2} dot={false} strokeDasharray="3 3" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Percentile table at key ages */}
              {percentileData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Savings at Key Ages — Scenario Range</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-muted-foreground text-xs">
                            <th className="text-left py-2 font-medium">Age</th>
                            <th className="text-right py-2 font-medium text-green-700 dark:text-green-400">90th Pct</th>
                            <th className="text-right py-2 font-medium text-green-600 dark:text-green-500">75th Pct</th>
                            <th className="text-right py-2 font-medium text-blue-600 dark:text-blue-400">Mean</th>
                            <th className="text-right py-2 font-medium text-purple-600 dark:text-purple-400">Median</th>
                            <th className="text-right py-2 font-medium text-amber-600 dark:text-amber-400">25th Pct</th>
                            <th className="text-right py-2 font-medium text-red-600 dark:text-red-400">10th Pct</th>
                            <th className="text-right py-2 font-medium text-muted-foreground">Avg. Assumptions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(monteCarlo.percentileData || [])
                            .filter((d: any) => [65, 70, 75, 80, 85, 90, 95].includes(d.age))
                            .map((d: any) => (
                              <tr key={d.age} className="border-b border-border/50">
                                <td className="py-2 font-medium">{d.age}</td>
                                <td className="py-2 text-right text-green-700 dark:text-green-400">{formatCurrency(d.p90)}</td>
                                <td className="py-2 text-right text-green-600 dark:text-green-500">{formatCurrency(d.p75)}</td>
                                <td className="py-2 text-right text-blue-600 dark:text-blue-400">{formatCurrency(d.average)}</td>
                                <td className="py-2 text-right text-purple-600 dark:text-purple-400">{formatCurrency(d.p50)}</td>
                                <td className="py-2 text-right text-amber-600 dark:text-amber-400">{formatCurrency(d.p25)}</td>
                                <td className="py-2 text-right text-red-600 dark:text-red-400">{formatCurrency(d.p10)}</td>
                                <td className="py-2 text-right text-muted-foreground">{formatCurrency(d.baseline)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Simulations use your plan's average return with ±12% annual standard deviation. Run Analysis to refresh after changing your plan.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">Add accounts and income to run Monte Carlo simulations</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
