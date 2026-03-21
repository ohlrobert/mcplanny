import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { apiRequest, setAuthToken } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

function GoogleSignInContent() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (credential: string) =>
      apiRequest("/api/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential }),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: (data: any) => {
      if (data?.token) setAuthToken(data.token);
      if (data?.user) qc.setQueryData(["/api/auth/me"], data.user);
      qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (err: any) => {
      toast({ title: "Sign in failed", description: err.message || "Could not sign in with Google", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground shadow-md">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-7 h-7">
              <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.32C16.5 22.15 20 17.25 20 12V6L12 2z" />
              <path d="M8 12l3 3 5-5" />
            </svg>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground" style={{ fontFamily: "'DM Serif Display', serif" }}>McPlanny</div>
            <div className="text-sm text-muted-foreground">Personal Financial Planner</div>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle>Welcome to McPlanny</CardTitle>
            <CardDescription>
              Sign in with your Google account to access your financial plan
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pt-2 pb-6">
            {mutation.isPending ? (
              <div className="text-sm text-muted-foreground">Signing you in…</div>
            ) : (
              <GoogleLogin
                onSuccess={(response) => {
                  if (response.credential) {
                    mutation.mutate(response.credential);
                  }
                }}
                onError={() => {
                  toast({ title: "Sign in failed", description: "Google sign-in was cancelled or failed", variant: "destructive" });
                }}
                useOneTap={false}
                theme="outline"
                size="large"
                text="signin_with_google"
                shape="rectangular"
                width="300"
              />
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Your data is stored securely on this server.
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then(r => r.json())
      .then(data => {
        if (data.googleClientId) {
          setClientId(data.googleClientId);
        } else {
          setError("Google Sign-In is not configured yet.");
        }
      })
      .catch(() => setError("Failed to load configuration."));
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4">
        <div className="w-full max-w-md text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground shadow-md">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-7 h-7">
                <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.32C16.5 22.15 20 17.25 20 12V6L12 2z" />
                <path d="M8 12l3 3 5-5" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">McPlanny</div>
              <div className="text-sm text-muted-foreground">Personal Financial Planner</div>
            </div>
          </div>
          <Card className="shadow-lg">
            <CardContent className="pt-6 pb-6 text-center">
              <p className="text-sm text-muted-foreground">{error}</p>
              <p className="text-xs text-muted-foreground mt-2">Please contact the administrator to configure Google Sign-In.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <GoogleSignInContent />
    </GoogleOAuthProvider>
  );
}
