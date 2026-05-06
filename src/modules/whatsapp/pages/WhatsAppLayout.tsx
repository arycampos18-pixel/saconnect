import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Smartphone,
  Users,
  Send,
  Bot,
  ListTree,
  FileText,
  Settings,
  BadgeCheck,
  Inbox,
  Plug,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCompany } from "@/modules/settings/contexts/CompanyContext";
import { Card } from "@/components/ui/card";

type TabItem = { to: string; label: string; icon: LucideIcon; perm?: string };

const tabs: TabItem[] = [
  { to: "dashboard", label: "Dashboard", icon: LayoutDashboard, perm: "whatsapp.dashboard.view" },
  { to: "sessions", label: "WhatsApp (Z-API)", icon: Smartphone, perm: "whatsapp.dashboard.view" },
  { to: "sessions?tab=meta", label: "API Oficial (Meta)", icon: BadgeCheck, perm: "whatsapp.dashboard.view" },
  { to: "conversations", label: "Conversas", icon: Inbox, perm: "whatsapp.chat.read" },
  { to: "chat", label: "Chat", icon: MessageSquare, perm: "whatsapp.chat.read" },
  { to: "contacts", label: "Contatos", icon: Users, perm: "whatsapp.dashboard.view" },
  { to: "campaigns", label: "Campanhas", icon: Send, perm: "whatsapp.dashboard.view" },
  { to: "bot", label: "Chatbot", icon: Bot, perm: "whatsapp.dashboard.view" },
  { to: "queues", label: "Filas", icon: ListTree, perm: "whatsapp.dashboard.view" },
  { to: "templates", label: "Templates", icon: FileText, perm: "whatsapp.dashboard.view" },
  { to: "integrations", label: "Integrações", icon: Plug, perm: "whatsapp.dashboard.view" },
  { to: "logs", label: "Logs", icon: ScrollText, perm: "whatsapp.dashboard.view" },
  { to: "settings", label: "Configurações", icon: Settings, perm: "whatsapp.dashboard.view" },
];

export default function WhatsAppLayout() {
  const { currentCompany, hasPermission, isSuperAdmin } = useCompany();

  const visible = tabs.filter((t) => !t.perm || isSuperAdmin || hasPermission(t.perm));

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">WhatsApp</h1>
        <p className="text-sm text-muted-foreground">
          Multi-tenant • Empresa atual: <span className="font-medium text-foreground">{currentCompany?.nome_fantasia ?? "—"}</span>
        </p>
      </div>

      <Card className="p-2">
        <nav className="flex flex-wrap gap-1">
          {visible.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </Card>

      <Outlet />
    </div>
  );
}
