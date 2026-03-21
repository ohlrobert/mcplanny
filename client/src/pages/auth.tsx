import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, setAuthToken } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest(`/api/auth/${mode}`, { method: "POST", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } }),
    onSuccess: (data: any) => {
      // Store JWT token in memory
      if (data?.token) {
        setAuthToken(data.token);
      }
      // Update the /api/auth/me cache directly with the user data
      if (data?.user) {
        qc.setQueryData(["/api/auth/me"], data.user);
      }
      qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Authentication failed", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ username, password, email });
  };

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
          <CardHeader>
            <CardTitle>{mode === "login" ? "Welcome back" : "Create your account"}</CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Sign in to access your financial plan"
                : "Start planning your financial future today"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  data-testid="input-username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  autoComplete="username"
                />
              </div>
              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    data-testid="input-email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  data-testid="input-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </div>
              <Button
                data-testid="button-submit"
                type="submit"
                className="w-full"
                disabled={mutation.isPending}
              >
                {mutation.isPending
                  ? "Please wait..."
                  : mode === "login" ? "Sign In" : "Create Account"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <>Don't have an account?{" "}
                  <button onClick={() => setMode("register")} className="text-primary hover:underline font-medium">
                    Sign up
                  </button>
                </>
              ) : (
                <>Already have an account?{" "}
                  <button onClick={() => setMode("login")} className="text-primary hover:underline font-medium">
                    Sign in
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-6">
          Your data is stored securely on this server.
        </p>
      </div>
    </div>
  );
}
