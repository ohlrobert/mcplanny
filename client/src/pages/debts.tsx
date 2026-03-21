import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, DEBT_TYPE_LABELS } from "@/lib/finance";
import { Plus, Pencil, Trash2, CreditCard } from "lucide-react";
import type { Debt } from "@shared/schema";

const DEBT_ICONS: Record<string, string> = {
  auto: "🚗", medical: "🏥", student: "🎓", credit_card: "💳", personal: "💰", other: "📄",
};

function DebtDialog({ open, onClose, debt }: { open: boolean; onClose: () => void; debt?: Debt | null }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!debt;

  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      debtType: debt?.debtType || "credit_card",
      name: debt?.name || "",
      balance: debt?.balance || 0,
      interestRate: debt?.interestRate || 0,
      monthlyPayment: debt?.monthlyPayment || 0,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: any) =>
      isEdit
        ? apiRequest(`/api/debts/${debt!.id}`, { method: "PATCH", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } })
        : apiRequest("/api/debts", { method: "POST", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/debts"] });
      qc.invalidateQueries({ queryKey: ["/api/projections"] });
      toast({ title: isEdit ? "Debt updated" : "Debt added" });
      onClose();
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Debt" : "Add Debt"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate({
          ...d,
          balance: parseFloat(String(d.balance)) || 0,
          interestRate: parseFloat(String(d.interestRate)) || 0,
          monthlyPayment: parseFloat(String(d.monthlyPayment)) || 0,
        }))} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Debt Type</Label>
            <Select value={watch("debtType")} onValueChange={v => setValue("debtType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(DEBT_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{DEBT_ICONS[k]} {v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input {...register("name")} required placeholder="e.g. Chase credit card" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Balance ($)</Label>
              <Input {...register("balance")} type="number" min={0} step={100} />
            </div>
            <div className="space-y-1.5">
              <Label>Interest Rate (%)</Label>
              <Input {...register("interestRate")} type="number" step={0.1} min={0} max={50} />
            </div>
            <div className="space-y-1.5">
              <Label>Monthly Payment ($)</Label>
              <Input {...register("monthlyPayment")} type="number" min={0} step={10} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : isEdit ? "Update" : "Add Debt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function DebtsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);

  const { data: debts = [] } = useQuery<Debt[]>({ queryKey: ["/api/debts"] });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/debts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/debts"] });
      qc.invalidateQueries({ queryKey: ["/api/projections"] });
      toast({ title: "Debt removed" });
    },
  });

  const totalDebt = debts.reduce((s, d) => s + (d.balance || 0), 0);
  const totalMonthly = debts.reduce((s, d) => s + (d.monthlyPayment || 0), 0);

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Debts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Total: <span className="font-semibold text-foreground">{formatCurrency(totalDebt)}</span>
            {" · "}Monthly payments: <span className="font-semibold text-foreground">{formatCurrency(totalMonthly)}/mo</span>
          </p>
        </div>
        <Button data-testid="button-add-debt" onClick={() => { setEditDebt(null); setDialogOpen(true); }} className="gap-2">
          <Plus size={16} /> Add Debt
        </Button>
      </div>

      {debts.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <CreditCard className="mx-auto mb-3 text-muted-foreground" size={32} />
          <div className="font-medium mb-1">No debts recorded</div>
          <p className="text-sm text-muted-foreground mb-4">Track loans, credit cards, and other obligations</p>
          <Button onClick={() => setDialogOpen(true)} variant="outline" className="gap-2"><Plus size={16} /> Add debt</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {debts.map(debt => (
            <Card key={debt.id} className="border-l-4 border-l-red-400">
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{DEBT_ICONS[debt.debtType] || "📄"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{debt.name}</span>
                      <Badge variant="secondary" className="text-xs">{DEBT_TYPE_LABELS[debt.debtType] || debt.debtType}</Badge>
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{debt.interestRate}% interest</span>
                      {debt.monthlyPayment ? <span>{formatCurrency(debt.monthlyPayment, true)}/mo payment</span> : null}
                    </div>
                  </div>
                  <div className="font-semibold text-sm text-red-600 dark:text-red-400 shrink-0">{formatCurrency(debt.balance)}</div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => { setEditDebt(debt); setDialogOpen(true); }}>
                      <Pencil size={13} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(debt.id)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DebtDialog open={dialogOpen} onClose={() => setDialogOpen(false)} debt={editDebt} />
    </div>
  );
}
