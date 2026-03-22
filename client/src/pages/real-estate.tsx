import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
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
import { formatCurrency } from "@/lib/finance";
import { Plus, Pencil, Trash2, Home } from "lucide-react";
import type { RealEstate } from "@shared/schema";

const PROPERTY_ICONS: Record<string, string> = {
  primary: "🏠", vacation: "🏖️", rental: "🏘️", future_purchase: "🔮",
};

function RealEstateDialog({ open, onClose, property }: { open: boolean; onClose: () => void; property?: RealEstate | null }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!property;

  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      propertyType: property?.propertyType || "primary",
      name: property?.name || "",
      ownershipType: property?.ownershipType || "own",
      currentValue: property?.currentValue || 0,
      mortgageBalance: property?.mortgageBalance || 0,
      mortgageRate: property?.mortgageRate || 0,
      monthlyPayment: property?.monthlyPayment || 0,
      appreciationRate: property?.appreciationRate ?? 3.0,
      monthlyRentalIncome: property?.monthlyRentalIncome || 0,
      plannedSaleAge: property?.plannedSaleAge || "",
      plannedPurchaseAge: property?.plannedPurchaseAge || "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        propertyType: property?.propertyType || "primary",
        name: property?.name || "",
        ownershipType: property?.ownershipType || "own",
        currentValue: property?.currentValue || 0,
        mortgageBalance: property?.mortgageBalance || 0,
        mortgageRate: property?.mortgageRate || 0,
        monthlyPayment: property?.monthlyPayment || 0,
        appreciationRate: property?.appreciationRate ?? 3.0,
        monthlyRentalIncome: property?.monthlyRentalIncome || 0,
        plannedSaleAge: property?.plannedSaleAge || "",
        plannedPurchaseAge: property?.plannedPurchaseAge || "",
      });
    }
  }, [open, property]);

  const mutation = useMutation({
    mutationFn: (data: any) =>
      isEdit
        ? apiRequest(`/api/real-estate/${property!.id}`, { method: "PATCH", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } })
        : apiRequest("/api/real-estate", { method: "POST", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/real-estate"] });
      qc.invalidateQueries({ queryKey: ["/api/projections"] });
      toast({ title: isEdit ? "Property updated" : "Property added" });
      onClose();
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const coerceInt = (v: any) => v === "" ? null : parseInt(String(v)) || null;
  const coerce = (v: any) => parseFloat(String(v)) || 0;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Property" : "Add Property"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate({
          ...d,
          currentValue: coerce(d.currentValue),
          mortgageBalance: coerce(d.mortgageBalance),
          mortgageRate: coerce(d.mortgageRate),
          monthlyPayment: coerce(d.monthlyPayment),
          appreciationRate: coerce(d.appreciationRate),
          monthlyRentalIncome: coerce(d.monthlyRentalIncome),
          plannedSaleAge: coerceInt(d.plannedSaleAge),
          plannedPurchaseAge: coerceInt(d.plannedPurchaseAge),
        }))} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Property Type</Label>
              <Select value={watch("propertyType")} onValueChange={v => setValue("propertyType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">🏠 Primary Residence</SelectItem>
                  <SelectItem value="vacation">🏖️ Vacation Home</SelectItem>
                  <SelectItem value="rental">🏘️ Rental Property</SelectItem>
                  <SelectItem value="future_purchase">🔮 Future Purchase</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ownership Type</Label>
              <Select value={watch("ownershipType")} onValueChange={v => setValue("ownershipType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="own">Own</SelectItem>
                  <SelectItem value="own_with_mortgage">Own with Mortgage</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="reverse_mortgage">Reverse Mortgage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Property Name</Label>
            <Input {...register("name")} required placeholder="e.g. Primary Home - Portland, OR" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Current Value ($)</Label>
              <Input {...register("currentValue")} type="number" min={0} step={1000} />
            </div>
            <div className="space-y-1.5">
              <Label>Appreciation Rate (%/yr)</Label>
              <Input {...register("appreciationRate")} type="number" step={0.1} min={0} max={20} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Mortgage Balance ($)</Label>
              <Input {...register("mortgageBalance")} type="number" min={0} step={1000} />
            </div>
            <div className="space-y-1.5">
              <Label>Mortgage Rate (%)</Label>
              <Input {...register("mortgageRate")} type="number" step={0.1} min={0} max={20} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Monthly P&I Payment ($)</Label>
              <Input {...register("monthlyPayment")} type="number" min={0} step={50} />
            </div>
            <div className="space-y-1.5">
              <Label>Monthly Rental Income ($)</Label>
              <Input {...register("monthlyRentalIncome")} type="number" min={0} step={50} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Planned Sale Age</Label>
              <Input {...register("plannedSaleAge")} type="number" min={18} max={110} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label>Planned Purchase Age</Label>
              <Input {...register("plannedPurchaseAge")} type="number" min={18} max={110} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : isEdit ? "Update" : "Add Property"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function RealEstatePage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProperty, setEditProperty] = useState<RealEstate | null>(null);

  const { data: properties = [] } = useQuery<RealEstate[]>({ queryKey: ["/api/real-estate"] });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/real-estate/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/real-estate"] });
      qc.invalidateQueries({ queryKey: ["/api/projections"] });
      toast({ title: "Property removed" });
    },
  });

  const totalEquity = properties.reduce((s, p) => s + ((p.currentValue || 0) - (p.mortgageBalance || 0)), 0);

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Real Estate</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Total equity: <span className="font-semibold text-foreground">{formatCurrency(totalEquity)}</span>
          </p>
        </div>
        <Button data-testid="button-add-property" onClick={() => { setEditProperty(null); setDialogOpen(true); }} className="gap-2">
          <Plus size={16} /> Add Property
        </Button>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <Home className="mx-auto mb-3 text-muted-foreground" size={32} />
          <div className="font-medium mb-1">No properties yet</div>
          <p className="text-sm text-muted-foreground mb-4">Add your home, rental properties, or future purchases</p>
          <Button onClick={() => setDialogOpen(true)} variant="outline" className="gap-2"><Plus size={16} /> Add property</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {properties.map(prop => (
            <Card key={prop.id}>
              <CardContent className="py-4 px-5">
                <div className="flex items-start gap-4">
                  <span className="text-2xl mt-0.5">{PROPERTY_ICONS[prop.propertyType] || "🏠"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium">{prop.name}</span>
                      <Badge variant="secondary" className="text-xs capitalize">{prop.propertyType.replace("_", " ")}</Badge>
                      {prop.ownershipType !== "own" && <Badge variant="outline" className="text-xs capitalize">{prop.ownershipType.replace("_", " ")}</Badge>}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                      <div><span className="text-foreground font-medium">{formatCurrency(prop.currentValue || 0, true)}</span> value</div>
                      {prop.mortgageBalance ? <div><span className="text-foreground font-medium">{formatCurrency(prop.mortgageBalance, true)}</span> mortgage</div> : null}
                      <div><span className="text-foreground font-medium">{formatCurrency((prop.currentValue || 0) - (prop.mortgageBalance || 0), true)}</span> equity</div>
                      <div><span className="text-foreground font-medium">{prop.appreciationRate}%</span> appreciation/yr</div>
                      {prop.monthlyRentalIncome ? <div><span className="text-foreground font-medium">{formatCurrency(prop.monthlyRentalIncome, true)}</span>/mo rental</div> : null}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => { setEditProperty(prop); setDialogOpen(true); }}>
                      <Pencil size={13} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(prop.id)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RealEstateDialog open={dialogOpen} onClose={() => setDialogOpen(false)} property={editProperty} />
    </div>
  );
}
