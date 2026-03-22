import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { handleLogout } from "@/App";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, User, Landmark, Home, CreditCard, DollarSign,
  ShoppingCart, Heart, BarChart3, Compass, GitBranch,
  LogOut, Sun, Moon, Menu, X, TrendingUp, PieChart, ArrowRightLeft, Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

const PLAN_NAV = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
  { href: "/profile", icon: User, label: "Profile & Goals" },
  { href: "/accounts", icon: Landmark, label: "Accounts" },
  { href: "/positions", icon: PieChart, label: "Positions" },
  { href: "/connections", icon: Link2, label: "Connections" },
  { href: "/real-estate", icon: Home, label: "Real Estate" },
  { href: "/debts", icon: CreditCard, label: "Debts" },
  { href: "/income", icon: DollarSign, label: "Income" },
  { href: "/expenses", icon: ShoppingCart, label: "Expenses" },
  { href: "/healthcare", icon: Heart, label: "Healthcare" },
];

const ANALYSIS_NAV = [
  { href: "/insights", icon: BarChart3, label: "Insights" },
  { href: "/explorers", icon: Compass, label: "Explorers" },
  { href: "/scenarios", icon: GitBranch, label: "Scenarios" },
  { href: "/roth-conversion", icon: ArrowRightLeft, label: "Roth Conversion" },
  { href: "/withdrawal", icon: TrendingUp, label: "Withdrawal" },
];

function ThemeToggle() {
  const [dark, setDark] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  return (
    <button
      onClick={() => setDark(d => !d)}
      className="p-2 rounded-md hover:bg-accent transition-colors"
      aria-label="Toggle theme"
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const Sidebar = ({ mobile = false }) => (
    <div className={cn(
      "flex flex-col h-full bg-sidebar border-r border-sidebar-border",
      mobile ? "w-72" : "w-60"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
            <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.32C16.5 22.15 20 17.25 20 12V6L12 2z" />
            <path d="M8 12l3 3 5-5" />
          </svg>
        </div>
        <div>
          <div className="font-bold text-sm leading-tight text-sidebar-foreground">McPlanny</div>
          <div className="text-xs text-muted-foreground">Financial Planner</div>
        </div>
        {mobile && (
          <button onClick={() => setSidebarOpen(false)} className="ml-auto p-1">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">My Plan</div>
        {PLAN_NAV.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setSidebarOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors mb-0.5",
              location === href
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2 mt-4">Analysis</div>
        {ANALYSIS_NAV.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setSidebarOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors mb-0.5",
              location === href
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-sidebar-border p-3">
        {user && (
          <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {(user as any).username?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{(user as any).username}</div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleLogout()}
            className="flex-1 justify-start gap-2 text-xs"
          >
            <LogOut size={14} />
            Sign out
          </Button>
        </div>
        <div className="mt-2">
          <PerplexityAttribution />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 flex-shrink-0">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-background">
          <button onClick={() => setSidebarOpen(true)} className="p-1">
            <Menu size={20} />
          </button>
          <span className="font-semibold text-sm">McPlanny</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
