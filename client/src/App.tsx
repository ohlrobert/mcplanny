import { useEffect } from "react";
import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient, setAuthToken } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import AuthPage from "@/pages/auth";
import Overview from "@/pages/overview";
import ProfilePage from "@/pages/profile";
import AccountsPage from "@/pages/accounts";
import RealEstatePage from "@/pages/real-estate";
import DebtsPage from "@/pages/debts";
import IncomePage from "@/pages/income";
import ExpensesPage from "@/pages/expenses";
import HealthcarePage from "@/pages/healthcare";
import InsightsPage from "@/pages/insights";
import ExplorersPage from "@/pages/explorers";
import ScenariosPage from "@/pages/scenarios";
import WithdrawalPage from "@/pages/withdrawal";
import PositionsPage from "@/pages/positions";
import RothConversionPage from "@/pages/roth-conversion";
import NotFound from "@/pages/not-found";

export function handleLogout() {
  setAuthToken(null);
  queryClient.setQueryData(["/api/auth/me"], null);
  queryClient.clear();
}

function useTokenFromUrl() {
  useEffect(() => {
    const hash = window.location.hash;
    const queryPart = hash.includes("?") ? hash.split("?")[1] : "";
    const params = new URLSearchParams(queryPart);
    const token = params.get("auth_token");
    const authError = params.get("auth_error");

    if (token) {
      setAuthToken(token);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      window.location.hash = "#/";
    } else if (authError) {
      window.location.hash = "#/";
    }
  }, []);
}

function AppRouter() {
  useTokenFromUrl();

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
    // Return null (not throw) on 401 — handled via on401: "returnNull" default
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground animate-pulse">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
              <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.32C16.5 22.15 20 17.25 20 12V6L12 2z" />
              <path d="M8 12l3 3 5-5" />
            </svg>
          </div>
          <div className="text-sm text-muted-foreground">Loading McPlanny…</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Overview} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/accounts" component={AccountsPage} />
        <Route path="/real-estate" component={RealEstatePage} />
        <Route path="/debts" component={DebtsPage} />
        <Route path="/income" component={IncomePage} />
        <Route path="/expenses" component={ExpensesPage} />
        <Route path="/healthcare" component={HealthcarePage} />
        <Route path="/insights" component={InsightsPage} />
        <Route path="/explorers" component={ExplorersPage} />
        <Route path="/scenarios" component={ScenariosPage} />
        <Route path="/withdrawal" component={WithdrawalPage} />
        <Route path="/positions" component={PositionsPage} />
        <Route path="/roth-conversion" component={RothConversionPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <AppRouter />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
