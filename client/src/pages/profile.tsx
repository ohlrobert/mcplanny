import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { US_STATES } from "@/lib/finance";
import { User, Target, TrendingUp, MapPin } from "lucide-react";

export default function ProfilePage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: plan, isLoading } = useQuery({ queryKey: ["/api/plan"] });
  const p = plan as any;

  const { register, handleSubmit, watch, setValue, reset, formState: { isDirty } } = useForm({
    defaultValues: {
      firstName: "", lastName: "", birthYear: "", gender: "male",
      retirementAge: 65, planToAge: 90, stateOfResidence: "",
      filingStatus: "single", hasSpouse: false,
      spouseFirstName: "", spouseLastName: "", spouseBirthYear: "",
      spouseGender: "female", spouseRetirementAge: 65, spousePlanToAge: 90,
      inflationRate: 2.5, medicalInflationRate: 5.0,
      housingAppreciationRate: 3.0, ssCola: 2.5,
      legacyGoal: 0, dollarDisplay: "today",
    },
  });

  const hasSpouse = watch("hasSpouse");

  useEffect(() => {
    if (p) {
      reset({
        firstName: p.firstName || "",
        lastName: p.lastName || "",
        birthYear: p.birthYear ? String(p.birthYear) : "",
        gender: p.gender || "male",
        retirementAge: p.retirementAge || 65,
        planToAge: p.planToAge || 90,
        stateOfResidence: p.stateOfResidence || "",
        filingStatus: p.filingStatus || "single",
        hasSpouse: p.hasSpouse || false,
        spouseFirstName: p.spouseFirstName || "",
        spouseLastName: p.spouseLastName || "",
        spouseBirthYear: p.spouseBirthYear ? String(p.spouseBirthYear) : "",
        spouseGender: p.spouseGender || "female",
        spouseRetirementAge: p.spouseRetirementAge || 65,
        spousePlanToAge: p.spousePlanToAge || 90,
        inflationRate: p.inflationRate ?? 2.5,
        medicalInflationRate: p.medicalInflationRate ?? 5.0,
        housingAppreciationRate: p.housingAppreciationRate ?? 3.0,
        ssCola: p.ssCola ?? 2.5,
        legacyGoal: p.legacyGoal || 0,
        dollarDisplay: p.dollarDisplay || "today",
      });
    }
  }, [p]);

  const mutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("/api/plan", {
        method: "PATCH",
        body: JSON.stringify({
          ...data,
          birthYear: data.birthYear ? parseInt(data.birthYear) : null,
          spouseBirthYear: data.spouseBirthYear ? parseInt(data.spouseBirthYear) : null,
          retirementAge: parseInt(data.retirementAge),
          planToAge: parseInt(data.planToAge),
          spouseRetirementAge: parseInt(data.spouseRetirementAge),
          spousePlanToAge: parseInt(data.spousePlanToAge),
        }),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/plan"] });
      qc.invalidateQueries({ queryKey: ["/api/projections"] });
      toast({ title: "Profile saved", description: "Your plan has been updated." });
    },
    onError: () => toast({ title: "Error", description: "Failed to save profile.", variant: "destructive" }),
  });

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Profile & Goals</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your personal information and planning assumptions</p>
      </div>

      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-6">
        {/* Personal Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User size={16} className="text-primary" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input {...register("firstName")} data-testid="input-first-name" placeholder="First name" />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input {...register("lastName")} data-testid="input-last-name" placeholder="Last name" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Birth Year</Label>
                <Input {...register("birthYear")} data-testid="input-birth-year" type="number" placeholder="1965" min={1920} max={2010} />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={watch("gender")} onValueChange={v => setValue("gender", v, { shouldDirty: true })}>
                  <SelectTrigger data-testid="select-gender"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Filing Status</Label>
                <Select value={watch("filingStatus")} onValueChange={v => setValue("filingStatus", v, { shouldDirty: true })}>
                  <SelectTrigger data-testid="select-filing-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married Filing Jointly</SelectItem>
                    <SelectItem value="married_separately">Married Separately</SelectItem>
                    <SelectItem value="head_of_household">Head of Household</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>State of Residence</Label>
              <Select value={watch("stateOfResidence") || ""} onValueChange={v => setValue("stateOfResidence", v, { shouldDirty: true })}>
                <SelectTrigger data-testid="select-state"><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Retirement Goals */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target size={16} className="text-primary" />
              Retirement Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Retirement Age</Label>
                <Input {...register("retirementAge")} data-testid="input-retirement-age" type="number" min={50} max={85} />
              </div>
              <div className="space-y-1.5">
                <Label>Plan to Age</Label>
                <Input {...register("planToAge")} data-testid="input-plan-to-age" type="number" min={65} max={110} />
              </div>
              <div className="space-y-1.5">
                <Label>Legacy Goal ($)</Label>
                <Input {...register("legacyGoal")} data-testid="input-legacy-goal" type="number" min={0} placeholder="0" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Dollar Display</Label>
              <Select value={watch("dollarDisplay")} onValueChange={v => setValue("dollarDisplay", v, { shouldDirty: true })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today's Dollars (inflation-adjusted)</SelectItem>
                  <SelectItem value="future">Future Dollars (nominal)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Spouse */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <User size={16} className="text-primary" />
                Spouse / Partner
              </CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-sm font-normal">Include spouse</Label>
                <Switch
                  data-testid="switch-has-spouse"
                  checked={watch("hasSpouse")}
                  onCheckedChange={v => setValue("hasSpouse", v)}
                />
              </div>
            </div>
          </CardHeader>
          {hasSpouse && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Spouse First Name</Label>
                  <Input {...register("spouseFirstName")} placeholder="First name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Spouse Last Name</Label>
                  <Input {...register("spouseLastName")} placeholder="Last name" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Birth Year</Label>
                  <Input {...register("spouseBirthYear")} type="number" placeholder="1967" />
                </div>
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Select value={watch("spouseGender")} onValueChange={v => setValue("spouseGender", v, { shouldDirty: true })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Retirement Age</Label>
                  <Input {...register("spouseRetirementAge")} type="number" min={50} max={85} />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Assumptions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              Rate Assumptions
            </CardTitle>
            <CardDescription>Used for all long-term projections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label>General Inflation (%)</Label>
                <Input {...register("inflationRate")} type="number" step="0.1" min={0} max={20} />
              </div>
              <div className="space-y-1.5">
                <Label>Medical Inflation (%)</Label>
                <Input {...register("medicalInflationRate")} type="number" step="0.1" min={0} max={20} />
              </div>
              <div className="space-y-1.5">
                <Label>Housing Appreciation (%)</Label>
                <Input {...register("housingAppreciationRate")} type="number" step="0.1" min={0} max={20} />
              </div>
              <div className="space-y-1.5">
                <Label>SS COLA (%)</Label>
                <Input {...register("ssCola")} type="number" step="0.1" min={0} max={10} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button data-testid="button-save-profile" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}
