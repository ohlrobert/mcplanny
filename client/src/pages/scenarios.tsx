import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, GitBranch, Star } from "lucide-react";
import type { Scenario } from "@shared/schema";

function ScenarioDialog({ open, onClose, scenario }: { open: boolean; onClose: () => void; scenario?: Scenario | null }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!scenario;

  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      name: scenario?.name || "",
      description: scenario?.description || "",
      isBase: scenario?.isBase || false,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: any) =>
      isEdit
        ? apiRequest(`/api/scenarios/${scenario!.id}`, { method: "PATCH", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } })
        : apiRequest("/api/scenarios", { method: "POST", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/scenarios"] });
      toast({ title: isEdit ? "Scenario updated" : "Scenario created" });
      onClose();
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Scenario" : "New Scenario"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Scenario Name</Label>
            <Input {...register("name")} required placeholder="e.g. Early Retirement at 60" />
          </div>
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Textarea {...register("description")} placeholder="Describe what this scenario tests..." rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : isEdit ? "Update" : "Create Scenario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ScenariosPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editScenario, setEditScenario] = useState<Scenario | null>(null);

  const { data: scenarios = [] } = useQuery<Scenario[]>({ queryKey: ["/api/scenarios"] });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/scenarios/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/scenarios"] });
      toast({ title: "Scenario deleted" });
    },
  });

  const SCENARIO_IDEAS = [
    { name: "Early Retirement (60)", description: "What if you retire 5 years early?" },
    { name: "Delay SS to 70", description: "Maximize Social Security by claiming at 70" },
    { name: "Relocate to Lower-Tax State", description: "Move to Florida or Texas — no state income tax" },
    { name: "Roth Conversion Strategy", description: "Convert $20K/year before RMDs begin" },
    { name: "Downsize Home at 70", description: "Sell primary home, move to smaller place" },
    { name: "Part-Time Work to 70", description: "Work part-time for 5 extra years" },
  ];

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Scenarios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create and compare different versions of your financial plan</p>
        </div>
        <Button data-testid="button-add-scenario" onClick={() => { setEditScenario(null); setDialogOpen(true); }} className="gap-2">
          <Plus size={16} /> New Scenario
        </Button>
      </div>

      {scenarios.length === 0 ? (
        <div className="space-y-6">
          <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
            <GitBranch className="mx-auto mb-3 text-muted-foreground" size={32} />
            <div className="font-medium mb-1">No scenarios yet</div>
            <p className="text-sm text-muted-foreground mb-4">Create scenarios to compare different planning strategies side-by-side</p>
            <Button onClick={() => setDialogOpen(true)} variant="outline" className="gap-2"><Plus size={16} /> Create your first scenario</Button>
          </div>

          <div>
            <div className="text-sm font-medium mb-3">Scenario ideas to get you started:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SCENARIO_IDEAS.map(idea => (
                <button key={idea.name}
                  onClick={() => {
                    setEditScenario(null);
                    setDialogOpen(true);
                  }}
                  className="text-left p-3 border border-border rounded-lg hover:bg-accent transition-colors">
                  <div className="font-medium text-sm">{idea.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{idea.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {scenarios.map(scenario => (
            <Card key={scenario.id}>
              <CardContent className="py-4 px-5">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{scenario.name}</span>
                      {scenario.isBase && (
                        <Badge className="gap-1 text-xs">
                          <Star size={10} />
                          Base
                        </Badge>
                      )}
                    </div>
                    {scenario.description && (
                      <p className="text-sm text-muted-foreground">{scenario.description}</p>
                    )}
                    <div className="text-xs text-muted-foreground mt-2">
                      Created {new Date(scenario.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => { setEditScenario(scenario); setDialogOpen(true); }}>
                      <Pencil size={13} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(scenario.id)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ScenarioDialog open={dialogOpen} onClose={() => setDialogOpen(false)} scenario={editScenario} />
    </div>
  );
}
