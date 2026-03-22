import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/finance";
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, PieChart } from "lucide-react";
import type { Account } from "@shared/schema";

type Position = {
  id: number;
  planId: number;
  accountId: number;
  ticker: string;
  companyName: string | null;
  shares: number;
  costBasisPerShare: number;
  currentPrice: number;
  notes: string | null;
};

const INVESTMENT_ACCOUNT_TYPES = ["roth_ira", "roth_401k", "traditional_ira", "401k", "403b", "457b", "hsa"];

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  roth_ira: "Roth IRA", roth_401k: "Roth 401(k)", traditional_ira: "Traditional IRA",
  "401k": "401(k)", "403b": "403(b)", "457b": "457(b)", hsa: "HSA",
};

function calcDerived(p: Position) {
  const totalCostBasis = p.shares * p.costBasisPerShare;
  const currentValue = p.shares * p.currentPrice;
  const gainLoss = currentValue - totalCostBasis;
  const gainLossPct = totalCostBasis > 0 ? (gainLoss / totalCostBasis) * 100 : 0;
  return { totalCostBasis, currentValue, gainLoss, gainLossPct };
}

function PositionDialog({
  open, onClose, position, accounts,
}: { open: boolean; onClose: () => void; position?: Position | null; accounts: Account[] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!position;

  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      accountId: position?.accountId || (accounts[0]?.id ?? ""),
      ticker: position?.ticker || "",
      companyName: position?.companyName || "",
      shares: position?.shares || "",
      costBasisPerShare: position?.costBasisPerShare || "",
      currentPrice: position?.currentPrice || "",
      notes: position?.notes || "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        accountId: position?.accountId || (accounts[0]?.id ?? ""),
        ticker: position?.ticker || "",
        companyName: position?.companyName || "",
        shares: position?.shares || "",
        costBasisPerShare: position?.costBasisPerShare || "",
        currentPrice: position?.currentPrice || "",
        notes: position?.notes || "",
      });
    }
  }, [open, position]);

  const mutation = useMutation({
    mutationFn: (data: any) =>
      isEdit
        ? apiRequest(`/api/positions/${position!.id}`, { method: "PATCH", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } })
        : apiRequest("/api/positions", { method: "POST", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/positions"] });
      toast({ title: isEdit ? "Position updated" : "Position added" });
      onClose();
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Position" : "Add Position"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate({
          ...d,
          accountId: parseInt(String(d.accountId)),
          shares: parseFloat(String(d.shares)) || 0,
          costBasisPerShare: parseFloat(String(d.costBasisPerShare)) || 0,
          currentPrice: parseFloat(String(d.currentPrice)) || 0,
        }))} className="space-y-4 mt-1">
          <div className="space-y-1.5">
            <Label>Account</Label>
            <Select value={String(watch("accountId"))} onValueChange={v => setValue("accountId", parseInt(v), { shouldDirty: true })}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {accounts.map(a => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name} ({ACCOUNT_TYPE_LABELS[a.accountType] || a.accountType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ticker Symbol</Label>
              <Input {...register("ticker")} required placeholder="e.g. AAPL" className="uppercase" />
            </div>
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <Input {...register("companyName")} placeholder="Apple Inc." />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Shares</Label>
              <Input {...register("shares")} type="number" step="0.0001" min={0} required placeholder="10.5" />
            </div>
            <div className="space-y-1.5">
              <Label>Cost Basis / Share ($)</Label>
              <Input {...register("costBasisPerShare")} type="number" step="0.01" min={0} required placeholder="150.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Current Price ($)</Label>
              <Input {...register("currentPrice")} type="number" step="0.01" min={0} required placeholder="185.00" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input {...register("notes")} placeholder="Optional notes" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : isEdit ? "Update" : "Add Position"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PositionsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPosition, setEditPosition] = useState<Position | null>(null);

  const { data: allAccounts = [] } = useQuery<Account[]>({ queryKey: ["/api/accounts"] });
  const { data: positions = [] } = useQuery<Position[]>({ queryKey: ["/api/positions"] });

  const investmentAccounts = allAccounts.filter(a => INVESTMENT_ACCOUNT_TYPES.includes(a.accountType));

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/positions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/positions"] });
      toast({ title: "Position removed" });
    },
  });

  const totalValue = positions.reduce((s, p) => s + p.shares * p.currentPrice, 0);
  const totalCost = positions.reduce((s, p) => s + p.shares * p.costBasisPerShare, 0);
  const totalGain = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  const byAccount = investmentAccounts.map(acct => ({
    account: acct,
    positions: positions.filter(p => p.accountId === acct.id),
  })).filter(g => g.positions.length > 0);

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Investment Positions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track holdings in your tax-advantaged accounts</p>
        </div>
        <Button onClick={() => { setEditPosition(null); setDialogOpen(true); }} className="gap-2" disabled={investmentAccounts.length === 0}>
          <Plus size={16} /> Add Position
        </Button>
      </div>

      {investmentAccounts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <PieChart className="mx-auto mb-3 text-muted-foreground" size={32} />
            <div className="font-medium mb-1">No investment accounts yet</div>
            <p className="text-sm text-muted-foreground">Add a Roth IRA, Traditional IRA, 401(k), or HSA account first</p>
          </CardContent>
        </Card>
      )}

      {investmentAccounts.length > 0 && positions.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5">
              <div className="text-xs text-muted-foreground mb-1">Total Market Value</div>
              <div className="text-xl font-bold">{formatCurrency(totalValue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="text-xs text-muted-foreground mb-1">Total Cost Basis</div>
              <div className="text-xl font-bold">{formatCurrency(totalCost)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="text-xs text-muted-foreground mb-1">Total Gain / Loss</div>
              <div className={`text-xl font-bold flex items-center gap-1 ${totalGain >= 0 ? "text-green-600" : "text-red-600"}`}>
                {totalGain >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                {formatCurrency(totalGain)}
                <span className="text-sm font-normal">({totalGainPct >= 0 ? "+" : ""}{totalGainPct.toFixed(2)}%)</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {byAccount.map(({ account, positions: acctPositions }) => {
        const acctValue = acctPositions.reduce((s, p) => s + p.shares * p.currentPrice, 0);
        return (
          <Card key={account.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{account.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{ACCOUNT_TYPE_LABELS[account.accountType] || account.accountType}</Badge>
                  <span className="text-sm font-semibold">{formatCurrency(acctValue)}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left py-2 pr-3 font-medium">Ticker</th>
                      <th className="text-left py-2 pr-3 font-medium">Company</th>
                      <th className="text-right py-2 pr-3 font-medium">Shares</th>
                      <th className="text-right py-2 pr-3 font-medium">Cost / Share</th>
                      <th className="text-right py-2 pr-3 font-medium">Price</th>
                      <th className="text-right py-2 pr-3 font-medium">Cost Basis</th>
                      <th className="text-right py-2 pr-3 font-medium">Market Value</th>
                      <th className="text-right py-2 pr-3 font-medium">Gain / Loss</th>
                      <th className="text-right py-2 font-medium">%</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {acctPositions.map(pos => {
                      const { totalCostBasis, currentValue, gainLoss, gainLossPct } = calcDerived(pos);
                      const isUp = gainLoss >= 0;
                      return (
                        <tr key={pos.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 pr-3 font-semibold font-mono">{pos.ticker}</td>
                          <td className="py-2.5 pr-3 text-muted-foreground max-w-[120px] truncate">{pos.companyName || "—"}</td>
                          <td className="py-2.5 pr-3 text-right">{pos.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                          <td className="py-2.5 pr-3 text-right">{formatCurrency(pos.costBasisPerShare)}</td>
                          <td className="py-2.5 pr-3 text-right font-medium">{formatCurrency(pos.currentPrice)}</td>
                          <td className="py-2.5 pr-3 text-right">{formatCurrency(totalCostBasis)}</td>
                          <td className="py-2.5 pr-3 text-right font-medium">{formatCurrency(currentValue)}</td>
                          <td className={`py-2.5 pr-3 text-right font-medium ${isUp ? "text-green-600" : "text-red-600"}`}>
                            {isUp ? "+" : ""}{formatCurrency(gainLoss)}
                          </td>
                          <td className={`py-2.5 text-right text-xs font-semibold ${isUp ? "text-green-600" : "text-red-600"}`}>
                            {isUp ? "+" : ""}{gainLossPct.toFixed(2)}%
                          </td>
                          <td className="py-2.5 pl-2">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-6 w-6"
                                onClick={() => { setEditPosition(pos); setDialogOpen(true); }}>
                                <Pencil size={12} />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => deleteMutation.mutate(pos.id)}>
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {investmentAccounts.length > 0 && positions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <PieChart className="mx-auto mb-3 text-muted-foreground" size={32} />
            <div className="font-medium mb-1">No positions yet</div>
            <p className="text-sm text-muted-foreground mb-4">Add your stock, ETF, and fund holdings to track performance</p>
            <Button onClick={() => setDialogOpen(true)} variant="outline" className="gap-2">
              <Plus size={16} /> Add first position
            </Button>
          </CardContent>
        </Card>
      )}

      <PositionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        position={editPosition}
        accounts={investmentAccounts}
      />
    </div>
  );
}
