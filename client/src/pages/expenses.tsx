import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, EXPENSE_TYPE_LABELS } from "@/lib/finance";
import { Plus, Pencil, Trash2, ShoppingCart, ChevronDown, ChevronUp, Calculator } from "lucide-react";
import type { Expense } from "@shared/schema";

const EXPENSE_ICONS: Record<string, string> = {
  housing: "🏠", food: "🍽️", transport: "🚗", healthcare: "🏥",
  insurance: "🛡️", entertainment: "🎭", travel: "✈️", clothing: "👕",
  personal: "💆", education: "📚", other: "📦",
};

function ExpenseDialog({
  open, onClose, expense, hasPartner,
}: {
  open: boolean;
  onClose: () => void;
  expense?: Expense | null;
  hasPartner?: boolean;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!expense;
  const [entryMode, setEntryMode] = useState<"monthly" | "annual">("annual");

  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      expenseType: expense?.expenseType || "housing",
      category: expense?.category || "must_spend",
      owner: (expense as any)?.owner || "primary",
      name: expense?.name || "",
      annualAmount: expense?.annualAmount || 0,
      monthlyAmount: expense ? Math.round((expense.annualAmount || 0) / 12) : 0,
      startAge: expense?.startAge || "",
      endAge: expense?.endAge || "",
      annualIncrease: expense?.annualIncrease ?? 2.5,
      isOneTime: expense?.isOneTime || false,
    },
  });

  useEffect(() => {
    if (open) {
      setEntryMode("annual");
      reset({
        expenseType: expense?.expenseType || "housing",
        category: expense?.category || "must_spend",
        owner: (expense as any)?.owner || "primary",
        name: expense?.name || "",
        annualAmount: expense?.annualAmount || 0,
        monthlyAmount: expense ? Math.round((expense.annualAmount || 0) / 12) : 0,
        startAge: expense?.startAge || "",
        endAge: expense?.endAge || "",
        annualIncrease: expense?.annualIncrease ?? 2.5,
        isOneTime: expense?.isOneTime || false,
      });
    }
  }, [open, expense]);

  const monthlyVal = watch("monthlyAmount");
  const annualVal = watch("annualAmount");

  const handleMonthlyChange = (v: string) => {
    const m = parseFloat(v) || 0;
    setValue("monthlyAmount", m);
    setValue("annualAmount", Math.round(m * 12));
  };

  const handleAnnualChange = (v: string) => {
    const a = parseFloat(v) || 0;
    setValue("annualAmount", a);
    setValue("monthlyAmount", Math.round(a / 12));
  };

  const mutation = useMutation({
    mutationFn: (data: any) =>
      isEdit
        ? apiRequest(`/api/expenses/${expense!.id}`, { method: "PATCH", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } })
        : apiRequest("/api/expenses", { method: "POST", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/expenses"] });
      qc.invalidateQueries({ queryKey: ["/api/projections"] });
      toast({ title: isEdit ? "Expense updated" : "Expense added" });
      onClose();
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const coerceInt = (v: any) => v === "" ? null : parseInt(String(v)) || null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Expense" : "Add Expense"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate({
          expenseType: d.expenseType,
          category: d.category,
          owner: d.owner,
          name: d.name,
          annualAmount: parseFloat(String(d.annualAmount)) || 0,
          startAge: coerceInt(d.startAge),
          endAge: coerceInt(d.endAge),
          annualIncrease: parseFloat(String(d.annualIncrease)) ?? 2.5,
          isOneTime: d.isOneTime,
        }))} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Expense Type</Label>
              <Select value={watch("expenseType")} onValueChange={v => setValue("expenseType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(EXPENSE_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{EXPENSE_ICONS[k]} {v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={watch("category")} onValueChange={v => setValue("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="must_spend">Must Spend (essential)</SelectItem>
                  <SelectItem value="like_to_spend">Like to Spend (discretionary)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {hasPartner && (
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Select value={watch("owner")} onValueChange={v => setValue("owner", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary (me)</SelectItem>
                  <SelectItem value="partner">Financial Partner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input {...register("name")} required placeholder="e.g. Monthly mortgage, Netflix subscription" />
          </div>

          {/* Monthly / Annual toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Amount</Label>
              <div className="flex bg-muted rounded-md p-0.5 text-xs">
                <button type="button"
                  onClick={() => setEntryMode("monthly")}
                  className={`px-2.5 py-1 rounded transition-colors ${entryMode === "monthly" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>
                  Monthly
                </button>
                <button type="button"
                  onClick={() => setEntryMode("annual")}
                  className={`px-2.5 py-1 rounded transition-colors ${entryMode === "annual" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>
                  Annual
                </button>
              </div>
            </div>
            {entryMode === "monthly" ? (
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <Input
                    value={monthlyVal || ""}
                    onChange={e => handleMonthlyChange(e.target.value)}
                    type="number" min={0} step={10}
                    placeholder="Monthly amount"
                  />
                </div>
                <span className="text-muted-foreground text-sm shrink-0">×12 =</span>
                <div className="font-semibold text-sm shrink-0 text-right min-w-[90px]">
                  {formatCurrency(annualVal)}/yr
                </div>
              </div>
            ) : (
              <Input
                value={annualVal || ""}
                onChange={e => handleAnnualChange(e.target.value)}
                type="number" min={0} step={100}
                placeholder="Annual amount"
              />
            )}
            <p className="text-xs text-muted-foreground">
              {entryMode === "monthly"
                ? `Annual total: ${formatCurrency(annualVal)} (${formatCurrency(Math.round((annualVal as number) / 12))}/mo)`
                : `Monthly equivalent: ${formatCurrency(Math.round((annualVal as number) / 12))}/mo`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={watch("isOneTime")} onCheckedChange={v => setValue("isOneTime", v)} />
            <Label className="font-normal">One-time expense</Label>
          </div>
          {!watch("isOneTime") && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Start Age</Label>
                <Input {...register("startAge")} type="number" min={18} max={110} placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <Label>End Age</Label>
                <Input {...register("endAge")} type="number" min={18} max={110} placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <Label>Annual Increase (%)</Label>
                <Input {...register("annualIncrease")} type="number" step={0.1} min={0} max={20} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : isEdit ? "Update" : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WhatIfPanel({ expenses }: { expenses: Expense[] }) {
  const [open, setOpen] = useState(false);
  const [adjustments, setAdjustments] = useState<Record<number, number>>({});

  const recurringExpenses = expenses.filter(e => !e.isOneTime);
  const baseTotal = recurringExpenses.reduce((s, e) => s + (e.annualAmount || 0), 0);

  const adjustedTotal = recurringExpenses.reduce((s, e) => {
    const adj = adjustments[e.id] ?? 0;
    const newMonthly = Math.round((e.annualAmount || 0) / 12) + adj;
    return s + Math.max(0, newMonthly * 12);
  }, 0);

  const delta = adjustedTotal - baseTotal;

  const setAdj = (id: number, val: number) => {
    setAdjustments(prev => ({ ...prev, [id]: val }));
  };

  const reset = () => setAdjustments({});

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors text-sm font-medium"
      >
        <div className="flex items-center gap-2">
          <Calculator size={15} />
          What-If Expense Scenarios
        </div>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {open && (
        <div className="p-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Adjust monthly amounts below to explore different spending scenarios. Changes are not saved — this is a planning tool.
          </p>

          <div className="space-y-2">
            {recurringExpenses.map(e => {
              const baseMo = Math.round((e.annualAmount || 0) / 12);
              const adj = adjustments[e.id] ?? 0;
              const newMo = Math.max(0, baseMo + adj);
              return (
                <div key={e.id} className="flex items-center gap-3">
                  <span className="w-5 text-center">{EXPENSE_ICONS[e.expenseType] || "📦"}</span>
                  <span className="flex-1 text-sm truncate">{e.name}</span>
                  <span className="text-xs text-muted-foreground w-16 text-right">${baseMo}/mo</span>
                  <Input
                    type="number"
                    className="w-24 h-7 text-xs"
                    placeholder="±$/mo"
                    value={adj === 0 ? "" : adj}
                    onChange={ev => setAdj(e.id, parseInt(ev.target.value) || 0)}
                  />
                  <span className={`text-xs w-16 text-right font-medium ${newMo !== baseMo ? (newMo < baseMo ? "text-green-600" : "text-red-500") : "text-muted-foreground"}`}>
                    ${newMo}/mo
                  </span>
                </div>
              );
            })}
          </div>

          {Object.keys(adjustments).length > 0 && (
            <div className="pt-3 border-t space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base annual spending</span>
                <span>{formatCurrency(baseTotal)}/yr</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">What-if annual spending</span>
                <span className="font-semibold">{formatCurrency(adjustedTotal)}/yr</span>
              </div>
              <div className={`flex justify-between text-sm font-semibold ${delta > 0 ? "text-red-600" : "text-green-600"}`}>
                <span>Annual difference</span>
                <span>{delta > 0 ? "+" : ""}{formatCurrency(delta)}/yr ({delta > 0 ? "+" : ""}{formatCurrency(Math.round(delta / 12))}/mo)</span>
              </div>
              <div className={`flex justify-between text-xs ${delta > 0 ? "text-red-500" : "text-green-500"}`}>
                <span>Est. 20-year impact at 6% growth</span>
                <span>{delta > 0 ? "-" : "+"}{formatCurrency(Math.abs(Math.round(delta * 36.78)))}</span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={reset} disabled={Object.keys(adjustments).length === 0}>
              Reset
            </Button>
            <p className="text-xs text-muted-foreground self-center">
              To apply changes, edit each expense individually.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExpensesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const { data: expenses = [] } = useQuery<Expense[]>({ queryKey: ["/api/expenses"] });
  const { data: plan } = useQuery({ queryKey: ["/api/plan"] });
  const hasPartner = (plan as any)?.hasPartner;

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/expenses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/expenses"] });
      qc.invalidateQueries({ queryKey: ["/api/projections"] });
      toast({ title: "Expense removed" });
    },
  });

  const mustSpend = expenses.filter(e => e.category === "must_spend");
  const likeToSpend = expenses.filter(e => e.category === "like_to_spend");
  const partnerExpenses = expenses.filter(e => (e as any).owner === "partner");
  const displayed = activeTab === "must_spend" ? mustSpend
    : activeTab === "like_to_spend" ? likeToSpend
    : activeTab === "partner" ? partnerExpenses
    : expenses;

  const totalAnnual = expenses.reduce((s, e) => s + (e.annualAmount || 0), 0);
  const mustTotal = mustSpend.reduce((s, e) => s + (e.annualAmount || 0), 0);
  const likeTotal = likeToSpend.reduce((s, e) => s + (e.annualAmount || 0), 0);

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Expenses</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Total: <span className="font-semibold text-foreground">{formatCurrency(totalAnnual)}/yr</span>
            <span className="ml-2 text-muted-foreground">({formatCurrency(Math.round(totalAnnual / 12))}/mo)</span>
          </p>
        </div>
        <Button data-testid="button-add-expense" onClick={() => { setEditExpense(null); setDialogOpen(true); }} className="gap-2">
          <Plus size={16} /> Add Expense
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-card-border rounded-lg p-4">
          <div className="text-xs text-muted-foreground">Total Annual</div>
          <div className="text-lg font-bold mt-0.5">{formatCurrency(totalAnnual, true)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{formatCurrency(Math.round(totalAnnual / 12))}/mo</div>
        </div>
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="text-xs text-muted-foreground">Must Spend</div>
          <div className="text-lg font-bold mt-0.5 text-red-700 dark:text-red-300">{formatCurrency(mustTotal, true)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{formatCurrency(Math.round(mustTotal / 12))}/mo</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="text-xs text-muted-foreground">Like to Spend</div>
          <div className="text-lg font-bold mt-0.5 text-blue-700 dark:text-blue-300">{formatCurrency(likeTotal, true)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{formatCurrency(Math.round(likeTotal / 12))}/mo</div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({expenses.length})</TabsTrigger>
          <TabsTrigger value="must_spend">Must Spend ({mustSpend.length})</TabsTrigger>
          <TabsTrigger value="like_to_spend">Like to Spend ({likeToSpend.length})</TabsTrigger>
          {hasPartner && <TabsTrigger value="partner">Partner ({partnerExpenses.length})</TabsTrigger>}
        </TabsList>
      </Tabs>

      {displayed.length === 0 ? (
        <EmptyState onAdd={() => setDialogOpen(true)} />
      ) : (
        <div className="space-y-2">
          {displayed.map(expense => (
            <Card key={expense.id} className={`border-l-4 ${expense.category === "must_spend" ? "border-l-red-400" : "border-l-blue-400"}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{EXPENSE_ICONS[expense.expenseType] || "📦"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{expense.name}</span>
                      <Badge variant="secondary" className={`text-xs ${expense.category === "must_spend" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"}`}>
                        {expense.category === "must_spend" ? "Must Spend" : "Like to Spend"}
                      </Badge>
                      {expense.isOneTime && <Badge variant="outline" className="text-xs">One-time</Badge>}
                      {(expense as any).owner === "partner" && <Badge variant="outline" className="text-xs border-purple-400 text-purple-700 dark:text-purple-300">Partner</Badge>}
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span>{EXPENSE_TYPE_LABELS[expense.expenseType] || expense.expenseType}</span>
                      {expense.startAge && <span>From age {expense.startAge}</span>}
                      {expense.endAge && <span>Until age {expense.endAge}</span>}
                      {!expense.isOneTime && <span>+{expense.annualIncrease}%/yr</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-sm">{formatCurrency(expense.annualAmount)}/yr</div>
                    <div className="text-xs text-muted-foreground">{formatCurrency(Math.round((expense.annualAmount || 0) / 12))}/mo</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => { setEditExpense(expense); setDialogOpen(true); }}>
                      <Pencil size={13} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(expense.id)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* What-If Panel */}
      {expenses.length > 0 && <WhatIfPanel expenses={expenses} />}

      <ExpenseDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        expense={editExpense}
        hasPartner={hasPartner}
      />
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
      <ShoppingCart className="mx-auto mb-3 text-muted-foreground" size={32} />
      <div className="font-medium mb-1">No expenses added yet</div>
      <p className="text-sm text-muted-foreground mb-4">Track your essential and discretionary spending</p>
      <Button onClick={onAdd} variant="outline" className="gap-2"><Plus size={16} /> Add expense</Button>
    </div>
  );
}
