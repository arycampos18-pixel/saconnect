import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, List, CalendarDays, ListTree, Tags, Timer, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { useCompany } from "@/modules/settings/contexts/CompanyContext";

const tabs = [
  { to: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "list", label: "Chamados", icon: List },
  { to: "calendar", label: "Agenda", icon: CalendarDays },
  { to: "queues", label: "Filas", icon: ListTree },
  { to: "categories", label: "Categorias", icon: Tags },
  { to: "sla", label: "SLA", icon: Timer },
  { to: "settings", label: "Configurações", icon: Settings },
];

export default function TicketsLayout() {
  const { currentCompany } = useCompany();
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tickets / Chamados</h1>
        <p className="text-sm text-muted-foreground">
          Multi-tenant • Empresa: <span className="font-medium text-foreground">{currentCompany?.nome_fantasia ?? "—"}</span>
        </p>
      </div>
      <Card className="p-2">
        <nav className="flex flex-wrap gap-1">
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => cn(
                "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}>
              <Icon className="h-4 w-4" />{label}
            </NavLink>
          ))}
        </nav>
      </Card>
      <Outlet />
    </div>
  );
}
