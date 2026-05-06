import { useEffect } from "react";
import { Outlet, useLocation, useNavigate, NavLink } from "react-router-dom";
import { LayoutGrid, Gauge, Vote } from "lucide-react";

const TABS = [
  { to: "/app/dashboard/principal", label: "Principal", icon: LayoutGrid },
  { to: "/app/dashboard/executivo", label: "Executivo", icon: Gauge },
  { to: "/app/dashboard/politico", label: "Político", icon: Vote },
];

const STORAGE_KEY = "sa:dashboard:last-tab";

export default function DashboardHome() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Memoriza a última aba
  useEffect(() => {
    if (pathname === "/app/dashboard" || pathname === "/app/dashboard/") {
      const last = localStorage.getItem(STORAGE_KEY);
      const target = last && TABS.some((t) => t.to === last) ? last : TABS[0].to;
      navigate(target, { replace: true });
      return;
    }
    if (TABS.some((t) => t.to === pathname)) {
      localStorage.setItem(STORAGE_KEY, pathname);
    }
  }, [pathname, navigate]);

  return (
    <div className="space-y-4 animate-fade-in-page">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Visão consolidada — alterne entre os painéis disponíveis.
        </p>
      </div>
      <div className="flex flex-wrap gap-1 rounded-xl border border-border/70 bg-gradient-to-br from-card to-secondary/40 p-1.5 shadow-sm backdrop-blur-md">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-[0_4px_12px_-2px_hsl(var(--primary)/0.4)]"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`
            }
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}