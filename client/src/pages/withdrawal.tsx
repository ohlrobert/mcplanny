import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, ArrowDown, CheckCircle2 } from "lucide-react";

const STRATEGY_INFO = {
  spending_needs: {
    label: "Based on Spending Needs",
    description: "Withdraw just enough to cover the gap between your income and expenses. Preserves wealth when income exceeds expenses.",
    icon: "🎯",
  },
  max_spending: {
    label: "Maximize Spending",
    description: "Determine the maximum sustainable spending rate given your assets. Useful for finding your spending ceiling.",
    icon: "📈",
  },
  fixed_percentage: {
    label: "Fixed Percentage",
    description: "Withdraw a fixed % of your portfolio each year (e.g. 4% rule). Simple and predictable.",
    icon: "📊",
  },
};

const WITHDRAWAL_ORDER_OPTIONS = [
  { key: "after_tax", label: "After-Tax (Brokerage, Checking)", color: "bg-orange-100 dark:bg-orange-900" },
  { key: "pre_tax", label: "Pre-Tax (401k, Traditional IRA)", color: "bg-blue-100 dark:bg-blue-900" },
  { key: "roth", label: "Roth (Roth IRA, Roth 401k)", color: "bg-purple-100 dark:bg-purple-900" },
  { key: "hsa", label: "HSA (Health Savings Account)", color: "bg-green-100 dark:bg-green-900" },
];

export default function WithdrawalPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: ws } = useQuery({ queryKey: ["/api/withdrawal-strategy"] });
  const w = ws as any;

  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      strategy: "spending_needs",
      fixedPercentage: 4.0,
      withdrawalOrder: '["after_tax","pre_tax","roth","hsa"]',
    },
  });

  useEffect(() => {
    if (w) {
      reset({
        strategy: w.strategy || "spending_needs",
        fixedPercentage: w.fixedPercentage ?? 4.0,
        withdrawalOrder: w.withdrawalOrder || '["after_tax","pre_tax","roth","hsa"]',
      });
    }
  }, [w]);

  const mutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("/api/withdrawal-strategy", {
        method: "PUT",
        body: JSON.stringify({
          ...data,
          fixedPercentage: parseFloat(data.fixedPercentage) || 4.0,
        }),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/withdrawal-strategy"] });
      qc.invalidateQueries({ queryKey: ["/api/projections"] });
      toast({ title: "Withdrawal strategy saved" });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const currentStrategy = watch("strategy");

  const currentOrder: string[] = (() => {
    try { return JSON.parse(watch("withdrawalOrder")); } catch { return ["after_tax","pre_tax","roth","hsa"]; }
  })();

  const moveItem = (idx: number, dir: -1 | 1) => {
    const newOrder = [...currentOrder];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= newOrder.length) return;
    [newOrder[idx], newOrder[newIdx]] = [newOrder[newIdx], newOrder[idx]];
    setValue("withdrawalOrder", JSON.stringify(newOrder));
  };

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Withdrawal Strategy</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Define how your retirement savings will be drawn down</p>
      </div>

      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-6">
        {/* Strategy selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              Withdrawal Strategy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(STRATEGY_INFO).map(([key, info]) => (
              <button
                key={key}
                type="button"
                onClick={() => setValue("strategy", key)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  currentStrategy === key
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{info.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{info.label}</span>
                      {currentStrategy === key && <CheckCircle2 size={14} className="text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{info.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Fixed percentage input */}
        {currentStrategy === "fixed_percentage" && (
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-1.5">
                <Label>Annual Withdrawal Rate (%)</Label>
                <Input {...register("fixedPercentage")} type="number" step={0.1} min={0.5} max={20} className="max-w-xs" />
                <p className="text-xs text-muted-foreground">
                  The "4% rule" is a common starting point — it suggests withdrawing 4% of your portfolio in year 1,
                  then adjusting for inflation each year. Lower percentages provide more safety.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Withdrawal order */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDown size={16} className="text-primary" />
              Withdrawal Order
            </CardTitle>
            <CardDescription>
              The order in which accounts are drawn down in retirement.
              Reorder by clicking the arrows to optimize tax efficiency.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {currentOrder.map((key, idx) => {
                const item = WITHDRAWAL_ORDER_OPTIONS.find(o => o.key === key);
                if (!item) return null;
                return (
                  <div key={key} className={`flex items-center gap-3 p-3 rounded-lg ${item.color}`}>
                    <div className="text-xs font-bold text-muted-foreground w-5 text-center">{idx + 1}</div>
                    <div className="flex-1 text-sm font-medium">{item.label}</div>
                    <div className="flex flex-col gap-0.5">
                      <button type="button" onClick={() => moveItem(idx, -1)} disabled={idx === 0}
                        className="p-0.5 hover:bg-black/10 rounded disabled:opacity-30">
                        <svg viewBox="0 0 8 8" className="w-3 h-3"><path d="M4 1L1 6h6L4 1z" fill="currentColor" /></svg>
                      </button>
                      <button type="button" onClick={() => moveItem(idx, 1)} disabled={idx === currentOrder.length - 1}
                        className="p-0.5 hover:bg-black/10 rounded disabled:opacity-30">
                        <svg viewBox="0 0 8 8" className="w-3 h-3"><path d="M4 7L1 2h6L4 7z" fill="currentColor" /></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 p-3 bg-muted rounded-lg text-xs text-muted-foreground">
              <strong>Tax tip:</strong> Conventional wisdom is after-tax → pre-tax → Roth. This preserves tax-free Roth growth as long as possible. 
              However, Roth conversions before RMDs (age 73) may warrant drawing pre-tax first.
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save Strategy"}
          </Button>
        </div>
      </form>
    </div>
  );
}
