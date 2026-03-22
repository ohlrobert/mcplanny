import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, INCOME_TYPE_LABELS } from "@/lib/finance";
import { Plus, Pencil, Trash2, DollarSign } from "lucide-react";
import type { Income } from "@shared/schema";

const INCOME_TYPE_ICONS: Record<string, string> = {
  work: "💼", social_security: "🏛️", pension: "📋", annuity: "📄",
  rental: "🏠", dividends: "📈", interest: "💰", windfall: "🎁", other: "💲",
};

function IncomeDialog({ open, onClose, income }: { open: boolean; onClose: () => void; income?: Income | null }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: plan } = useQuery({ queryKey: ["/api/plan"] });
  const p = plan as any;
  const isEdit = !!income;

  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      incomeType: income?.incomeType || "work",
      name: income?.name || "",
      owner: income?.owner || "primary",
      annualAmount: income?.annualAmount || 0,
      startAge: income?.startAge || "",
      endAge: income?.endAge || "",
      annualIncrease: income?.annualIncrease ?? 2.5,
      isOneTime: income?.isOneTime || false,
      ssBenefitAge: income?.ssBenefitAge || 67,
      ssBaseMonthlyBenefit: (income as any)?.ssBaseMonthlyBenefit || "",
      pensionType: income?.pensionType || "monthly",
      pensionCola: income?.pensionCola || 0,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        incomeType: income?.incomeType || "work",
        name: income?.name || "",
        owner: income?.owner || "primary",
        annualAmount: income?.annualAmount || 0,
        startAge: income?.startAge || "",
        endAge: income?.endAge || "",
        annualIncrease: income?.annualIncrease ?? 2.5,
        isOneTime: income?.isOneTime || false,
        ssBenefitAge: income?.ssBenefitAge || 67,
        ssBaseMonthlyBenefit: (income as any)?.ssBaseMonthlyBenefit || "",
        pensionType: income?.pensionType || "monthly",
        pensionCola: income?.pensionCola || 0,
      });
    }
  }, [open, income]);

  const incomeType = watch("incomeType");
  const isOneTime = watch("isOneTime");

  const mutation = useMutation({
    mutationFn: (data: any) =>
      isEdit
        ? apiRequest(`/api/incomes/${income!.id}`, { method: "PATCH", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } })
        : apiRequest("/api/incomes", { method: "POST", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/incomes"] });
      qc.invalidateQueries({ queryKey: ["/api/projections"] });
      toast({ title: isEdit ? "Income updated" : "Income added" });
      onClose();
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const coerce = (v: any) => v === "" ? null : parseFloat(String(v)) || null;
  const coerceInt = (v: any) => v === "" ? null : parseInt(String(v)) || null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Income" : "Add Income Source"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate({
          ...d,
          annualAmount: coerce(d.annualAmount) || 0,
          startAge: coerceInt(d.startAge),
          endAge: coerceInt(d.endAge),
          annualIncrease: coerce(d.annualIncrease) ?? 2.5,
          ssBenefitAge: coerceInt(d.ssBenefitAge),
          ssBaseMonthlyBenefit: coerce((d as any).ssBaseMonthlyBenefit),
          pensionCola: coerce(d.pensionCola) || 0,
        }))} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Income Type</Label>
              <Select value={watch("incomeType")} onValueChange={v => setValue("incomeType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(INCOME_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{INCOME_TYPE_ICONS[k]} {v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Select value={watch("owner")} onValueChange={v => setValue("owner", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  {p?.hasSpouse && <SelectItem value="spouse">Spouse</SelectItem>}
                  {p?.hasPartner && <SelectItem value="partner">Financial Partner</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Name / Description</Label>
            <Input {...register("name")} required placeholder={incomeType === "work" ? "e.g. Salary at DKS" : "Describe this income"} />
          </div>
          <div className="space-y-1.5">
            <Label>Annual Amount ($)</Label>
            <Input {...register("annualAmount")} type="number" min={0} step={100} required />
          </div>

          {incomeType === "social_security" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>SS Estimated Base Monthly Benefit ($)</Label>
                <Input {...register("ssBaseMonthlyBenefit")} type="number" min={0} step={1} placeholder="e.g. 2400 (from your SSA statement)" />
                <p className="text-xs text-muted-foreground">Your estimated benefit at full retirement age from ssa.gov</p>
              </div>
              <div className="space-y-1.5">
                <Label>SS Claiming Age</Label>
                <Select value={String(watch("ssBenefitAge"))} onValueChange={v => setValue("ssBenefitAge", parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[62,63,64,65,66,67,68,69,70].map(age => (
                      <SelectItem key={age} value={String(age)}>Age {age}{age === 62 ? " (Early — reduced)" : age === 67 ? " (Full)" : age === 70 ? " (Maximum)" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {incomeType === "pension" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Pension Type</Label>
                <Select value={watch("pensionType") || "monthly"} onValueChange={v => setValue("pensionType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly benefit</SelectItem>
                    <SelectItem value="lump_sum">Lump sum</SelectItem>
                    <SelectItem value="cash_balance">Cash balance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>COLA (%)</Label>
                <Input {...register("pensionCola")} type="number" step={0.1} min={0} max={10} />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch checked={watch("isOneTime")} onCheckedChange={v => setValue("isOneTime", v)} />
            <Label className="font-normal">One-time event (windfall, inheritance)</Label>
          </div>

          {!isOneTime && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Start Age</Label>
                <Input {...register("startAge")} type="number" min={18} max={90} placeholder="Optional" />
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
              {mutation.isPending ? "Saving..." : isEdit ? "Update" : "Add Income"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function IncomePage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editIncome, setEditIncome] = useState<Income | null>(null);

  const { data: incomes = [] } = useQuery<Income[]>({ queryKey: ["/api/incomes"] });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/incomes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/incomes"] });
      qc.invalidateQueries({ queryKey: ["/api/projections"] });
      toast({ title: "Income removed" });
    },
  });

  const totalAnnual = incomes.reduce((s, i) => s + (i.annualAmount || 0), 0);

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Income Sources</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Total annual income: <span className="font-semibold text-foreground">{formatCurrency(totalAnnual)}</span>
          </p>
        </div>
        <Button data-testid="button-add-income" onClick={() => { setEditIncome(null); setDialogOpen(true); }} className="gap-2">
          <Plus size={16} /> Add Income
        </Button>
      </div>

      {incomes.length === 0 ? (
        <EmptyState onAdd={() => setDialogOpen(true)} />
      ) : (
        <div className="space-y-2">
          {incomes.map(income => (
            <Card key={income.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{INCOME_TYPE_ICONS[income.incomeType] || "💲"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{income.name}</span>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {INCOME_TYPE_LABELS[income.incomeType] || income.incomeType}
                      </Badge>
                      {income.owner !== "primary" && <Badge variant="outline" className="text-xs capitalize">{income.owner}</Badge>}
                      {income.isOneTime && <Badge variant="outline" className="text-xs">One-time</Badge>}
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {income.startAge && <span>Start: {income.startAge}</span>}
                      {income.endAge && <span>End: {income.endAge}</span>}
                      {!income.isOneTime && <span>+{income.annualIncrease}%/yr</span>}
                      {income.incomeType === "social_security" && income.ssBenefitAge && <span>Claiming at {income.ssBenefitAge}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-sm">{formatCurrency(income.annualAmount)}/yr</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => { setEditIncome(income); setDialogOpen(true); }}>
                      <Pencil size={13} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(income.id)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <IncomeDialog open={dialogOpen} onClose={() => setDialogOpen(false)} income={editIncome} />
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
      <DollarSign className="mx-auto mb-3 text-muted-foreground" size={32} />
      <div className="font-medium mb-1">No income sources yet</div>
      <p className="text-sm text-muted-foreground mb-4">Add work income, Social Security, pensions, and more</p>
      <Button onClick={onAdd} variant="outline" className="gap-2"><Plus size={16} /> Add income source</Button>
    </div>
  );
}
