import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/finance";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";

// Social Security Explorer
function SocialSecurityExplorer() {
  const { data: plan } = useQuery({ queryKey: ["/api/plan"] });
  const p = plan as any;
  const currentYear = new Date().getFullYear();
  const birthYear = p?.birthYear || (currentYear - 62);
  const currentAge = currentYear - birthYear;
  const [baseMonthly, setBaseMonthly] = useState(2000);

  // SS benefit adjustments by claiming age
  const SS_ADJUSTMENTS: Record<number, number> = {
    62: 0.70, 63: 0.75, 64: 0.80, 65: 0.867, 66: 0.933, 67: 1.0,
    68: 1.08, 69: 1.16, 70: 1.24,
  };

  const ssData = Object.entries(SS_ADJUSTMENTS).map(([age, factor]) => {
    const monthlyBenefit = baseMonthly * factor;
    const yearsCollecting = Math.max(0, (p?.planToAge || 90) - parseInt(age));
    const lifetime = monthlyBenefit * 12 * yearsCollecting;
    return {
      age: `Age ${age}`,
      "Monthly Benefit": Math.round(monthlyBenefit),
      "Lifetime Total": Math.round(lifetime / 1000) * 1000,
      isFull: parseInt(age) === 67,
    };
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <Label>Estimated Base Monthly Benefit (at Full Retirement Age 67)</Label>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            value={baseMonthly}
            onChange={e => setBaseMonthly(parseInt(e.target.value) || 0)}
            className="max-w-xs"
            min={0}
            step={100}
          />
          <span className="text-sm text-muted-foreground">(Check your SSA.gov statement)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Monthly Benefit by Claiming Age</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ssData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 88%)" />
                <XAxis dataKey="age" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} width={55} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Bar dataKey="Monthly Benefit" fill="hsl(152,58%,28%)" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Lifetime SS Total by Claiming Age</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ssData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 88%)" />
                <XAxis dataKey="age" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} width={55} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Bar dataKey="Lifetime Total" fill="hsl(217,71%,48%)" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground text-xs">
              <th className="text-left py-2 font-medium">Claiming Age</th>
              <th className="text-right py-2 font-medium">Monthly Benefit</th>
              <th className="text-right py-2 font-medium">Annual Benefit</th>
              <th className="text-right py-2 font-medium">Reduction/Increase</th>
              <th className="text-right py-2 font-medium">Lifetime Total</th>
            </tr>
          </thead>
          <tbody>
            {ssData.map(row => (
              <tr key={row.age} className={`border-b border-border/50 ${row.isFull ? "bg-primary/5 font-medium" : ""}`}>
                <td className="py-2">{row.age}{row.isFull ? " ⭐ FRA" : ""}</td>
                <td className="py-2 text-right">{formatCurrency(row["Monthly Benefit"])}</td>
                <td className="py-2 text-right">{formatCurrency(row["Monthly Benefit"] * 12)}</td>
                <td className={`py-2 text-right ${row["Monthly Benefit"] > baseMonthly * 1.0 ? "text-green-600" : row["Monthly Benefit"] < baseMonthly ? "text-red-600" : ""}`}>
                  {((row["Monthly Benefit"] / baseMonthly - 1) * 100).toFixed(0)}%
                </td>
                <td className="py-2 text-right">{formatCurrency(row["Lifetime Total"], true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Roth Conversion Explorer
function RothConversionExplorer() {
  const { data: projections } = useQuery({ queryKey: ["/api/projections"] });
  const { data: plan } = useQuery({ queryKey: ["/api/plan"] });
  const { data: accounts = [] } = useQuery<any[]>({ queryKey: ["/api/accounts"] });
  const years = (projections as any)?.years || [];
  const p = plan as any;
  const retirementAge = p?.retirementAge || 65;
  const [annualConversion, setAnnualConversion] = useState(20000);
  const [conversionEndAge, setConversionEndAge] = useState(retirementAge);

  const preTaxBalance = accounts.filter((a: any) => ["401k","403b","457b","traditional_ira"].includes(a.accountType))
    .reduce((s: number, a: any) => s + (a.balance || 0), 0);

  const rothBalance = accounts.filter((a: any) => ["roth_401k","roth_ira"].includes(a.accountType))
    .reduce((s: number, a: any) => s + (a.balance || 0), 0);

  // Simple projection: compare no-conversion vs conversion strategy
  const currentYear = new Date().getFullYear();
  const birthYear = p?.birthYear || (currentYear - 55);
  const currentAge = currentYear - birthYear;

  const comparisonData = years.filter((_: any, i: number) => i % 3 === 0).map((yr: any) => {
    const yearsFromNow = yr.age - currentAge;
    const convertYears = Math.max(0, Math.min(yearsFromNow, conversionEndAge - currentAge));
    const conversionReturn = Math.pow(1.06, yearsFromNow);
    const conversionBenefit = annualConversion * convertYears * conversionReturn * 0.3; // simplified tax advantage
    return {
      age: yr.age,
      "No Conversion": Math.round(yr.totalSavings),
      "With Roth Conversion": Math.round(yr.totalSavings + conversionBenefit),
    };
  });

  // Tax brackets 2025
  const TAX_BRACKETS = [
    { limit: 11600, rate: 10, label: "10% bracket" },
    { limit: 47150, rate: 12, label: "12% bracket" },
    { limit: 100525, rate: 22, label: "22% bracket" },
    { limit: 191950, rate: 24, label: "24% bracket" },
    { limit: 243725, rate: 32, label: "32% bracket" },
    { limit: 609350, rate: 35, label: "35% bracket" },
    { limit: Infinity, rate: 37, label: "37% bracket" },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm">
        <strong>Why convert?</strong> Converting pre-tax funds to Roth now at a lower rate means tax-free growth and withdrawals later — especially valuable before RMDs begin at 73.
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
        <div className="bg-card border border-card-border rounded-lg p-3">
          <div className="text-xs text-muted-foreground">Pre-Tax Balance</div>
          <div className="font-bold text-lg">{formatCurrency(preTaxBalance, true)}</div>
        </div>
        <div className="bg-card border border-card-border rounded-lg p-3">
          <div className="text-xs text-muted-foreground">Roth Balance</div>
          <div className="font-bold text-lg">{formatCurrency(rothBalance, true)}</div>
        </div>
        <div className="bg-card border border-card-border rounded-lg p-3">
          <div className="text-xs text-muted-foreground">Pre-Tax %</div>
          <div className="font-bold text-lg">{preTaxBalance + rothBalance > 0 ? Math.round(preTaxBalance / (preTaxBalance + rothBalance) * 100) : 0}%</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Annual Conversion Amount ($)</Label>
          <Input type="number" value={annualConversion} onChange={e => setAnnualConversion(parseInt(e.target.value) || 0)} min={0} step={1000} />
        </div>
        <div className="space-y-1.5">
          <Label>Convert Until Age</Label>
          <Input type="number" value={conversionEndAge} onChange={e => setConversionEndAge(parseInt(e.target.value) || 65)} min={currentAge} max={90} />
        </div>
      </div>

      {comparisonData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Projected Impact of Roth Conversion</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 88%)" />
                <XAxis dataKey="age" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} width={60} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} labelFormatter={l => `Age ${l}`} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line type="monotone" dataKey="No Conversion" stroke="hsl(215 12% 56%)" strokeWidth={2} dot={false} strokeDasharray="5 3" />
                <Line type="monotone" dataKey="With Roth Conversion" stroke="hsl(152,58%,28%)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">2025 Federal Tax Brackets (Single)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {TAX_BRACKETS.filter(b => b.limit < 250000 || b.limit === Infinity).map(bracket => (
              <div key={bracket.rate} className="flex items-center gap-3 text-sm">
                <div className="w-16 font-medium text-right">{bracket.rate}%</div>
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-full" style={{ width: `${Math.min(100, bracket.rate * 2.5)}%` }} />
                </div>
                <div className="text-xs text-muted-foreground w-36">{bracket.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Market Risk Explorer
function MarketRiskExplorer() {
  const { data: projections } = useQuery({ queryKey: ["/api/projections"] });
  const years = (projections as any)?.years || [];
  const monteCarlo = (projections as any)?.monteCarlo;
  const [scenario, setScenario] = useState("2008");
  const [customDrop, setCustomDrop] = useState(30);
  const [startAge, setStartAge] = useState(65);
  const [durationYears, setDurationYears] = useState(2);

  const SCENARIOS = {
    "2000": { name: "2000-2002 Dot-com Crash", drop: 49, duration: 2 },
    "2008": { name: "2008-2009 Financial Crisis", drop: 57, duration: 1.5 },
    "1970s": { name: "1970s Stagflation", drop: 48, duration: 3 },
    "custom": { name: "Custom Scenario", drop: customDrop, duration: durationYears },
  };

  const activeScenario = SCENARIOS[scenario as keyof typeof SCENARIOS];

  // Stress-test the portfolio
  const stressedData = years.filter((_: any, i: number) => i % 2 === 0).map((yr: any) => {
    let stressedSavings = yr.totalSavings;
    if (yr.age >= startAge && yr.age < startAge + activeScenario.duration) {
      stressedSavings = yr.totalSavings * (1 - activeScenario.drop / 100);
    }
    return {
      age: yr.age,
      "Normal": yr.totalSavings,
      "Under Stress": Math.max(0, stressedSavings),
    };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(SCENARIOS).filter(([k]) => k !== "custom").map(([key, sc]) => (
          <button key={key}
            onClick={() => setScenario(key)}
            className={`p-3 rounded-lg border text-left text-sm transition-colors ${scenario === key ? "border-primary bg-primary/10" : "border-border hover:bg-accent"}`}
          >
            <div className="font-medium text-xs mb-1">{sc.name}</div>
            <div className="text-red-600 dark:text-red-400 font-bold">{sc.drop}% drop</div>
          </button>
        ))}
        <button
          onClick={() => setScenario("custom")}
          className={`p-3 rounded-lg border text-left text-sm transition-colors ${scenario === "custom" ? "border-primary bg-primary/10" : "border-border hover:bg-accent"}`}
        >
          <div className="font-medium text-xs mb-1">Custom</div>
          <div className="text-muted-foreground">Configure below</div>
        </button>
      </div>

      {scenario === "custom" && (
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Drop Severity (%)</Label>
            <Input type="number" value={customDrop} onChange={e => setCustomDrop(parseInt(e.target.value) || 0)} min={1} max={90} />
          </div>
          <div className="space-y-1.5">
            <Label>Start Age</Label>
            <Input type="number" value={startAge} onChange={e => setStartAge(parseInt(e.target.value) || 65)} />
          </div>
          <div className="space-y-1.5">
            <Label>Duration (years)</Label>
            <Input type="number" value={durationYears} onChange={e => setDurationYears(parseInt(e.target.value) || 1)} min={1} max={10} />
          </div>
        </div>
      )}

      {stressedData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Portfolio Under {activeScenario.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={stressedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 88%)" />
                <XAxis dataKey="age" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} width={60} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} labelFormatter={l => `Age ${l}`} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line type="monotone" dataKey="Normal" stroke="hsl(152,58%,28%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Under Stress" stroke="hsl(0,65%,48%)" strokeWidth={2} dot={false} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {monteCarlo && (
        <div className="p-4 bg-card border border-card-border rounded-lg">
          <div className="text-sm font-medium mb-1">Baseline Monte Carlo: {monteCarlo.chanceOfSuccess}% success</div>
          <div className="text-xs text-muted-foreground">
            In a {activeScenario.drop}% market crash scenario early in retirement, your success rate could drop significantly.
            This highlights the importance of maintaining a cash buffer or bond allocation for the first 5 years of retirement.
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExplorersPage() {
  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Explorers</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Optimization and what-if analysis tools</p>
      </div>

      <Tabs defaultValue="ss">
        <TabsList>
          <TabsTrigger value="ss">Social Security</TabsTrigger>
          <TabsTrigger value="roth">Roth Conversion</TabsTrigger>
          <TabsTrigger value="market">Market Risk</TabsTrigger>
        </TabsList>

        <TabsContent value="ss" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Social Security Claiming Strategy</CardTitle>
              <CardDescription>Compare lifetime Social Security payouts at different claiming ages</CardDescription>
            </CardHeader>
            <CardContent>
              <SocialSecurityExplorer />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roth" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Roth Conversion Explorer</CardTitle>
              <CardDescription>Model the tax and wealth impact of converting pre-tax funds to Roth</CardDescription>
            </CardHeader>
            <CardContent>
              <RothConversionExplorer />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="market" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Market Risk Explorer</CardTitle>
              <CardDescription>Stress-test your retirement plan against historical and custom market downturns</CardDescription>
            </CardHeader>
            <CardContent>
              <MarketRiskExplorer />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
