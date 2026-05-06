import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Smartphone, FileText, Megaphone, Users, Plug } from "lucide-react";

const tabs = [
  { to: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "connect", label: "Conexão", icon: Plug },
  { to: "sessions", label: "Sessões", icon: Smartphone },
  { to: "templates", label: "Templates", icon: FileText },
  { to: "campaigns", label: "Campanhas", icon: Megaphone },
  { to: "leads", label: "Leads", icon: Users },
];

export default function MetaLayout() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">WhatsApp Oficial (Meta)</h1>
        <p className="text-sm text-muted-foreground">API oficial do WhatsApp Business — sessões, templates, campanhas e leads.</p>
      </div>
      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
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