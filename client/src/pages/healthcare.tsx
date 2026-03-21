import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/finance";
import { Heart, AlertCircle } from "lucide-react";

export default function HealthcarePage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: plan } = useQuery({ queryKey: ["/api/plan"] });
  const { data: healthcare } = useQuery({ queryKey: ["/api/healthcare"] });
  const h = healthcare as any;
  const p = plan as any;

  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      preMedicareAnnualCost: 12000,
      medicarePartBMonthly: 174.70,
      medicarePartDMonthly: 35,
      ltcMonthlyCost: 4500,
      ltcStartAge: 80,
      ltcDurationYears: 3,
      spouseLtcMonthlyCost: 4500,
      spouseLtcStartAge: 80,
      spouseLtcDurationYears: 3,
      irmaaSurchargeEnabled: true,
    },
  });

  useEffect(() => {
    if (h) {
      reset({
        preMedicareAnnualCost: h.preMedicareAnnualCost ?? 12000,
        medicarePartBMonthly: h.medicarePartBMonthly ?? 174.70,
        medicarePartDMonthly: h.medicarePartDMonthly ?? 35,
        ltcMonthlyCost: h.ltcMonthlyCost ?? 4500,
        ltcStartAge: h.ltcStartAge ?? 80,
        ltcDurationYears: h.ltcDurationYears ?? 3,
        spouseLtcMonthlyCost: h.spouseLtcMonthlyCost ?? 4500,
        spouseLtcStartAge: h.spouseLtcStartAge ?? 80,
        spouseLtcDurationYears: h.spouseLtcDurationYears ?? 3,
        irmaaSurchargeEnabled: h.irmaaSurchargeEnabled ?? true,
      });
    }
  }, [h]);

  const mutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("/api/healthcare", {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/healthcare"] });
      qc.invalidateQueries({ queryKey: ["/api/projections"] });
      toast({ title: "Healthcare settings saved" });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const totalAnnualHealthcare = (watch("preMedicareAnnualCost") || 0);
  const medicareAnnual = ((watch("medicarePartBMonthly") || 0) + (watch("medicarePartDMonthly") || 0)) * 12;
  const ltcTotalAnnual = (watch("ltcMonthlyCost") || 0) * 12 * (watch("ltcDurationYears") || 3);

  const coerce = (v: any) => parseFloat(String(v)) || 0;
  const coerceInt = (v: any) => parseInt(String(v)) || 0;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Healthcare Planning</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Medical costs are often the largest and most underestimated retirement expense</p>
      </div>

      {/* Info card */}
      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3">
        <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          Healthcare costs grow at ~5%/year — much faster than general inflation. A 65-year-old couple may need <strong>$300,000+</strong> for retirement healthcare, not including long-term care.
        </div>
      </div>

      <form onSubmit={handleSubmit(d => mutation.mutate({
        preMedicareAnnualCost: coerce(d.preMedicareAnnualCost),
        medicarePartBMonthly: coerce(d.medicarePartBMonthly),
        medicarePartDMonthly: coerce(d.medicarePartDMonthly),
        ltcMonthlyCost: coerce(d.ltcMonthlyCost),
        ltcStartAge: coerceInt(d.ltcStartAge),
        ltcDurationYears: coerceInt(d.ltcDurationYears),
        spouseLtcMonthlyCost: coerce(d.spouseLtcMonthlyCost),
        spouseLtcStartAge: coerceInt(d.spouseLtcStartAge),
        spouseLtcDurationYears: coerceInt(d.spouseLtcDurationYears),
        irmaaSurchargeEnabled: d.irmaaSurchargeEnabled,
      }))} className="space-y-6">

        {/* Pre-Medicare */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart size={16} className="text-primary" />
              Pre-Medicare Healthcare (Before Age 65)
            </CardTitle>
            <CardDescription>Health insurance premiums, deductibles, and out-of-pocket costs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label>Annual Healthcare Cost ($)</Label>
              <Input {...register("preMedicareAnnualCost")} type="number" min={0} step={500} />
              <p className="text-xs text-muted-foreground">Estimated total annual healthcare cost before Medicare eligibility</p>
            </div>
          </CardContent>
        </Card>

        {/* Medicare */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart size={16} className="text-primary" />
              Medicare (Age 65+)
            </CardTitle>
            <CardDescription>Medicare Part B and Part D premiums. Grows with medical inflation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Part B Monthly Premium ($)</Label>
                <Input {...register("medicarePartBMonthly")} type="number" step={0.10} min={0} />
                <p className="text-xs text-muted-foreground">2025 standard: $174.70/mo</p>
              </div>
              <div className="space-y-1.5">
                <Label>Part D Monthly Premium ($)</Label>
                <Input {...register("medicarePartDMonthly")} type="number" step={1} min={0} />
                <p className="text-xs text-muted-foreground">Average: ~$35/mo</p>
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg text-sm">
              Estimated annual Medicare cost: <strong>{formatCurrency(medicareAnnual)}</strong>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={watch("irmaaSurchargeEnabled")}
                onCheckedChange={v => setValue("irmaaSurchargeEnabled", v)}
              />
              <div>
                <div className="text-sm font-medium">Include IRMAA Surcharges</div>
                <div className="text-xs text-muted-foreground">Higher-income retirees pay more for Medicare. IRMAA adds up to $594/mo for top brackets.</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* LTC */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Long-Term Care (Primary)</CardTitle>
            <CardDescription>Nursing home, assisted living, or in-home care costs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Monthly Cost ($)</Label>
                <Input {...register("ltcMonthlyCost")} type="number" min={0} step={100} />
              </div>
              <div className="space-y-1.5">
                <Label>Start Age</Label>
                <Input {...register("ltcStartAge")} type="number" min={60} max={110} />
              </div>
              <div className="space-y-1.5">
                <Label>Duration (years)</Label>
                <Input {...register("ltcDurationYears")} type="number" min={1} max={20} />
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg text-sm">
              Total LTC reserve needed: <strong>{formatCurrency(ltcTotalAnnual)}</strong> (in today's dollars)
            </div>
          </CardContent>
        </Card>

        {/* Spouse LTC */}
        {p?.hasSpouse && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Long-Term Care (Spouse)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Monthly Cost ($)</Label>
                  <Input {...register("spouseLtcMonthlyCost")} type="number" min={0} step={100} />
                </div>
                <div className="space-y-1.5">
                  <Label>Start Age</Label>
                  <Input {...register("spouseLtcStartAge")} type="number" min={60} max={110} />
                </div>
                <div className="space-y-1.5">
                  <Label>Duration (years)</Label>
                  <Input {...register("spouseLtcDurationYears")} type="number" min={1} max={20} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save Healthcare Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
