import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Smartphone, Settings2, FileText, Megaphone, ListChecks, BarChart3, ShieldOff, Inbox } from "lucide-react";

const tabs = [
  { to: "/app/whatsapp-bulk/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/whatsapp-bulk/apis", label: "Conexões / APIs", icon: Smartphone },
  { to: "/app/whatsapp-bulk/templates", label: "Templates", icon: FileText },
  { to: "/app/whatsapp-bulk/campanhas", label: "Campanhas", icon: Megaphone },
  { to: "/app/whatsapp-bulk/atendimento", label: "Atendimento", icon: Inbox },
  { to: "/app/whatsapp-bulk/fila", label: "Fila", icon: ListChecks },
  { to: "/app/whatsapp-bulk/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/app/whatsapp-bulk/optout", label: "Opt-out", icon: ShieldOff },
  { to: "/app/whatsapp-bulk/configuracoes", label: "Configurações", icon: Settings2 },
];

export default function WaBulkLayout() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Disparos API OFICIAL</h1>
        <p className="text-sm text-muted-foreground">
          Envios oficiais via Meta Cloud API com balanceamento entre múltiplas APIs.
        </p>
      </div>
      <nav className="flex flex-wrap gap-2 border-b">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`
            }
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}