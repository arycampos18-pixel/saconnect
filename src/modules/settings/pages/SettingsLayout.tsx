import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  Users,
  Building2,
  ShieldCheck,
  Activity,
  Settings as SettingsIcon,
  Link2,
  Shield,
} from "lucide-react";
import { useCompany } from "../contexts/CompanyContext";

/** Navegação: cada item corresponde a uma rota/página isolada em `App.tsx`. */
const items = [
  { to: "/app/settings/dashboard", label: "Dashboard", icon: LayoutGrid, perm: "settings.dashboard.view" },
  { to: "/app/settings/users", label: "Usuários", icon: Users, perm: "settings.users.view" },
  { to: "/app/settings/user-company", label: "Vínculos", icon: Link2, perm: "settings.users.view" },
  { to: "/app/settings/companies", label: "Empresas", icon: Building2, perm: "settings.companies.view", superOnly: true },
  { to: "/app/settings/profiles", label: "Perfis", icon: ShieldCheck, perm: "settings.profiles.view" },
  { to: "/app/settings/permissions", label: "Permissões", icon: Shield, perm: "settings.profiles.view" },
  { to: "/app/settings/audit", label: "Auditoria", icon: Activity, perm: "settings.audit.view" },
  { to: "/app/settings/general", label: "Geral", icon: SettingsIcon, perm: "settings.global.view" },
];

export default function SettingsLayout() {
  const { hasPermission, isSuperAdmin } = useCompany();
  const { pathname } = useLocation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
          <SettingsIcon className="h-7 w-7 text-primary" /> Configurações
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Identidade, empresas, usuários, perfis e regras de acesso.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 rounded-xl border bg-card p-2">
        {items
          .filter((i) => (i.superOnly ? isSuperAdmin : hasPermission(i.perm)))
          .map((i) => {
            const active = pathname.startsWith(i.to);
            return (
              <NavLink
                key={i.to}
                to={i.to}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-primary text-primary-foreground shadow-elegant-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <i.icon className="h-4 w-4" />
                {i.label}
              </NavLink>
            );
          })}
      </nav>

      <Outlet />
    </div>
  );
}