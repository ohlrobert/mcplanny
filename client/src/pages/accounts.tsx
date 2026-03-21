import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import { formatCurrency, ACCOUNT_TYPE_LABELS } from "@/lib/finance";
import { Plus, Pencil, Trash2, Landmark } from "lucide-react";
import type { Account } from "@shared/schema";

const ACCOUNT_TYPES = Object.entries(ACCOUNT_TYPE_LABELS);

const BUCKET_COLORS: Record<string, string> = {
  "401k": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "403b": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "457b": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "traditional_ira": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "roth_401k": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "roth_ira": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "hsa": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "529": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  "brokerage": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "checking": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  "savings": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  "cd": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  "money_market": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

function AccountDialog({ open, onClose, account }: { open: boolean; onClose: () => void; account?: Account | null }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: plan } = useQuery({ queryKey: ["/api/plan"] });
  const isEdit = !!account;

  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      accountType: account?.accountType || "401k",
      name: account?.name || "",
      owner: account?.owner || "primary",
      balance: account?.balance || 0,
      rateOfReturn: account?.rateOfReturn || 6.0,
      assetAllocation: account?.assetAllocation || 60,
      annualContribution: account?.annualContribution || 0,
      employerMatch: account?.employerMatch || 0,
      employerMatchLimit: account?.employerMatchLimit || 0,
      contributionEndAge: account?.contributionEndAge || "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: any) =>
      isEdit
        ? apiRequest(`/api/accounts/${account!.id}`, { method: "PATCH", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } })
        : apiRequest("/api/accounts", { method: "POST", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/accounts"] });
      qc.invalidateQueries({ queryKey: ["/api/projections"] });
      toast({ title: isEdit ? "Account updated" : "Account added" });
      onClose();
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const p = plan as any;
  const hasSpouse = p?.hasSpouse;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Account" : "Add Account"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate({
          ...d,
          balance: parseFloat(String(d.balance)),
          rateOfReturn: parseFloat(String(d.rateOfReturn)),
          assetAllocation: parseFloat(String(d.assetAllocation)),
          annualContribution: parseFloat(String(d.annualContribution)),
          employerMatch: parseFloat(String(d.employerMatch)),
          employerMatchLimit: parseFloat(String(d.employerMatchLimit)),
          contributionEndAge: d.contributionEndAge ? parseInt(String(d.contributionEndAge)) : null,
        }))} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Account Type</Label>
              <Select value={watch("accountType")} onValueChange={v => setValue("accountType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Select value={watch("owner")} onValueChange={v => setValue("owner", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  {hasSpouse && <SelectItem value="spouse">Spouse</SelectItem>}
                  <SelectItem value="joint">Joint</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Account Name / Nickname</Label>
            <Input {...register("name")} required placeholder="e.g. Fidelity 401(k)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Current Balance ($)</Label>
              <Input {...register("balance")} type="number" min={0} step={100} />
            </div>
            <div className="space-y-1.5">
              <Label>Rate of Return (%)</Label>
              <Input {...register("rateOfReturn")} type="number" step={0.1} min={0} max={25} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Stock Allocation (%)</Label>
              <Input {...register("assetAllocation")} type="number" min={0} max={100} step={5} />
            </div>
            <div className="space-y-1.5">
              <Label>Annual Contribution ($)</Label>
              <Input {...register("annualContribution")} type="number" min={0} step={100} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Employer Match (%)</Label>
              <Input {...register("employerMatch")} type="number" min={0} max={100} step={0.5} />
            </div>
            <div className="space-y-1.5">
              <Label>Match Limit (% of salary)</Label>
              <Input {...register("employerMatchLimit")} type="number" min={0} max={100} step={0.5} />
            </div>
            <div className="space-y-1.5">
              <Label>Contribution End Age</Label>
              <Input {...register("contributionEndAge")} type="number" min={18} max={90} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : isEdit ? "Update" : "Add Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AccountsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);

  const { data: accounts = [], isLoading } = useQuery<Account[]>({ queryKey: ["/api/accounts"] });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/accounts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/accounts"] });
      qc.invalidateQueries({ queryKey: ["/api/projections"] });
      toast({ title: "Account deleted" });
    },
  });

  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);

  // Group by bucket
  const preTax = accounts.filter(a => ["401k","403b","457b","traditional_ira"].includes(a.accountType));
  const roth = accounts.filter(a => ["roth_401k","roth_ira"].includes(a.accountType));
  const afterTax = accounts.filter(a => ["brokerage","checking","savings","cd","money_market"].includes(a.accountType));
  const hsa = accounts.filter(a => a.accountType === "hsa");
  const other = accounts.filter(a => a.accountType === "529");

  const groups = [
    { label: "Pre-Tax", accounts: preTax, color: "border-l-blue-500" },
    { label: "Roth", accounts: roth, color: "border-l-purple-500" },
    { label: "After-Tax / Brokerage", accounts: afterTax, color: "border-l-orange-500" },
    { label: "HSA", accounts: hsa, color: "border-l-green-500" },
    { label: "529 / Education", accounts: other, color: "border-l-yellow-500" },
  ].filter(g => g.accounts.length > 0);

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Accounts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Total: <span className="font-semibold text-foreground">{formatCurrency(totalBalance)}</span></p>
        </div>
        <Button data-testid="button-add-account" onClick={() => { setEditAccount(null); setDialogOpen(true); }} className="gap-2">
          <Plus size={16} />
          Add Account
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : accounts.length === 0 ? (
        <EmptyState onAdd={() => setDialogOpen(true)} />
      ) : (
        <div className="space-y-5">
          {groups.map(group => (
            <div key={group.label}>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>{group.label}</span>
                <span>{formatCurrency(group.accounts.reduce((s, a) => s + (a.balance || 0), 0), true)}</span>
              </div>
              <div className="space-y-2">
                {group.accounts.map(account => (
                  <Card key={account.id} className={`border-l-4 ${group.color}`}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Landmark size={16} className="text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{account.name}</span>
                            <Badge variant="secondary" className={`text-xs ${BUCKET_COLORS[account.accountType] || ""}`}>
                              {ACCOUNT_TYPE_LABELS[account.accountType] || account.accountType}
                            </Badge>
                            {account.owner !== "primary" && (
                              <Badge variant="outline" className="text-xs capitalize">{account.owner}</Badge>
                            )}
                          </div>
                          <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span>Return: {account.rateOfReturn}%</span>
                            <span>Stocks: {account.assetAllocation}%</span>
                            {account.annualContribution ? <span>Annual contrib: {formatCurrency(account.annualContribution, true)}</span> : null}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-semibold text-sm">{formatCurrency(account.balance, true)}</div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button data-testid={`button-edit-account-${account.id}`} variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => { setEditAccount(account); setDialogOpen(true); }}>
                            <Pencil size={13} />
                          </Button>
                          <Button data-testid={`button-delete-account-${account.id}`} variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(account.id)}>
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AccountDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        account={editAccount}
      />
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
      <Landmark className="mx-auto mb-3 text-muted-foreground" size={32} />
      <div className="font-medium mb-1">No accounts yet</div>
      <p className="text-sm text-muted-foreground mb-4">Add your retirement and investment accounts to start planning</p>
      <Button onClick={onAdd} variant="outline" className="gap-2">
        <Plus size={16} /> Add your first account
      </Button>
    </div>
  );
}
