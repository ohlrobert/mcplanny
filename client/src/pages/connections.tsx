import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePlaidLink } from "react-plaid-link";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link2, RefreshCw, Trash2, Plus, Building2, CheckCircle2, AlertCircle, Info } from "lucide-react";

type Connection = {
  id: number;
  institutionName: string | null;
  institutionId: string | null;
  lastSynced: string | null;
  createdAt: string | null;
};

type PlaidStatus = {
  configured: boolean;
  env: string;
};

function formatDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString();
}

function ConnectButton({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [linkReady, setLinkReady] = useState(false);

  const fetchToken = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/plaid/create-link-token", {});
      return res.json();
    },
    onSuccess: (data) => {
      if (data.link_token) {
        setToken(data.link_token);
        setLinkReady(true);
      } else {
        toast({ title: "Error", description: data.error || "Failed to get link token", variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Could not connect to Plaid", variant: "destructive" });
    },
  });

  const exchangeMutation = useMutation({
    mutationFn: async (params: { public_token: string; institution_id: string; institution_name: string }) => {
      const res = await apiRequest("POST", "/api/plaid/exchange-token", params);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Account connected!", description: "Your institution was linked successfully." });
      setToken(null);
      setLinkReady(false);
      onSuccess();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save connection", variant: "destructive" });
    },
  });

  const { open, ready } = usePlaidLink({
    token: token || "",
    onSuccess: (public_token, metadata) => {
      exchangeMutation.mutate({
        public_token,
        institution_id: metadata.institution?.institution_id || "",
        institution_name: metadata.institution?.name || "",
      });
    },
    onExit: () => {
      setToken(null);
      setLinkReady(false);
    },
  });

  const handleClick = () => {
    if (linkReady && ready) {
      open();
    } else {
      fetchToken.mutate();
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={fetchToken.isPending || exchangeMutation.isPending}
    >
      {fetchToken.isPending ? (
        <RefreshCw size={16} className="mr-2 animate-spin" />
      ) : (
        <Plus size={16} className="mr-2" />
      )}
      {fetchToken.isPending ? "Connecting…" : "Connect Account"}
    </Button>
  );
}

function ConnectionCard({
  conn,
  onDelete,
  onSync,
  syncLoading,
}: {
  conn: Connection;
  onDelete: (id: number) => void;
  onSync: (id: number) => void;
  syncLoading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-5 pb-5">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 flex-shrink-0">
          <Building2 size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{conn.institutionName || "Unknown Institution"}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Last synced: {formatDate(conn.lastSynced)}
          </div>
          <div className="text-xs text-muted-foreground">
            Connected: {formatDate(conn.createdAt)}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={conn.lastSynced ? "default" : "secondary"} className="text-xs">
            {conn.lastSynced ? (
              <><CheckCircle2 size={10} className="mr-1" />Synced</>
            ) : (
              "Not synced"
            )}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSync(conn.id)}
            disabled={syncLoading}
            title="Sync holdings"
          >
            <RefreshCw size={14} className={syncLoading ? "animate-spin" : ""} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(conn.id)}
            className="text-destructive hover:text-destructive"
            title="Remove connection"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ConnectionsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  const { data: plaidStatus } = useQuery<PlaidStatus>({
    queryKey: ["/api/plaid/status"],
    retry: false,
  });

  const { data: connections = [], isLoading } = useQuery<Connection[]>({
    queryKey: ["/api/plaid/connections"],
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/plaid/connections/${id}`, {});
    },
    onSuccess: () => {
      toast({ title: "Connection removed" });
      qc.invalidateQueries({ queryKey: ["/api/plaid/connections"] });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove connection", variant: "destructive" });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (id: number) => {
      setSyncingId(id);
      const res = await apiRequest("POST", `/api/plaid/sync/${id}`, {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sync complete",
        description: data.message || "Holdings updated",
      });
      qc.invalidateQueries({ queryKey: ["/api/plaid/connections"] });
      qc.invalidateQueries({ queryKey: ["/api/accounts"] });
      qc.invalidateQueries({ queryKey: ["/api/positions"] });
      setSyncingId(null);
    },
    onError: (err: any) => {
      toast({ title: "Sync failed", description: err.message || "Could not sync holdings", variant: "destructive" });
      setSyncingId(null);
    },
  });

  const handleSync = useCallback((id: number) => {
    syncMutation.mutate(id);
  }, []);

  const handleDelete = useCallback((id: number) => {
    setDeleteId(id);
  }, []);

  const configured = plaidStatus?.configured;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Link2 size={24} />
            Connected Accounts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Link your financial institutions to automatically import investment holdings.
          </p>
        </div>
        {configured && (
          <ConnectButton onSuccess={() => qc.invalidateQueries({ queryKey: ["/api/plaid/connections"] })} />
        )}
      </div>

      {/* Status banner */}
      {plaidStatus && !configured && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardContent className="flex items-start gap-3 pt-4 pb-4">
            <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-sm text-amber-800 dark:text-amber-300">Plaid API keys not configured</div>
              <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                To connect financial institutions, add <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">PLAID_CLIENT_ID</code> and{" "}
                <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">PLAID_SECRET</code> to your environment secrets.
                You can get these from the{" "}
                <a href="https://dashboard.plaid.com" target="_blank" rel="noopener noreferrer" className="underline">
                  Plaid Dashboard
                </a>
                .
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {plaidStatus?.configured && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
          <CardContent className="flex items-start gap-3 pt-4 pb-4">
            <Info size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700 dark:text-blue-400">
              <span className="font-semibold">Plaid {plaidStatus.env} mode</span> — Connect your brokerage, IRA, 401k, or HSA accounts. Syncing imports your current holdings and balances into McPlanny automatically.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : connections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14 text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Link2 size={22} className="text-muted-foreground" />
            </div>
            <div>
              <div className="font-medium text-sm">No connections yet</div>
              <div className="text-xs text-muted-foreground mt-1">
                {configured
                  ? "Click \"Connect Account\" to link your first institution."
                  : "Configure your Plaid API keys to get started."}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {connections.map(conn => (
            <ConnectionCard
              key={conn.id}
              conn={conn}
              onDelete={handleDelete}
              onSync={handleSync}
              syncLoading={syncingId === conn.id && syncMutation.isPending}
            />
          ))}
        </div>
      )}

      {connections.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => connections.forEach(c => handleSync(c.id))}
            disabled={syncMutation.isPending}
          >
            <RefreshCw size={14} className={`mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            Sync All
          </Button>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Connection</AlertDialogTitle>
            <AlertDialogDescription>
              This will unlink the institution and remove its Plaid access. Your accounts and positions already synced into McPlanny will remain. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
