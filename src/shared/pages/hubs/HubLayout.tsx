import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCompany } from "@/modules/settings/contexts/CompanyContext";
import { canAccessRoute } from "@/shared/auth/routePermissions";

export interface HubMetric {
  label: string;
  value: string | number;
  hint?: string;
}

export interface HubStatus {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "danger" | "muted";
}

export interface HubSubmodule {
  to: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  badge?: string;
}

interface Props {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  status?: HubStatus[];
  metrics?: HubMetric[];
  submodules: HubSubmodule[];
  extra?: ReactNode;
}

const toneClass: Record<NonNullable<HubStatus["tone"]>, string> = {
  ok: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  warn: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  danger: "bg-destructive/15 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

export default function HubLayout({
  title,
  subtitle,
  icon: Icon,
  status = [],
  metrics = [],
  submodules,
  extra,
}: Props) {
  const { hasPermission, isSuperAdmin, loading } = useCompany();
  const visibleSubmodules = submodules.filter((sub) =>
    canAccessRoute(sub.to, hasPermission, isSuperAdmin),
  );

  return (
    <div className="space-y-6 animate-fade-in-page">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-[0_8px_24px_-4px_hsl(var(--primary)/0.45)]">
          <Icon className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {status.length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap gap-3 p-4">
            {status.map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"
              >
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <Badge variant="secondary" className={toneClass[s.tone ?? "muted"]}>
                  {s.value}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {metrics.map((m, i) => (
            <div
              key={m.label}
              className={`card-glass animate-fade-in-up p-5 stagger-${Math.min(i + 1, 4)}`}
            >
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {m.label}
              </p>
              <p className="mt-2 font-[Poppins,Inter,sans-serif] text-[28px] font-bold leading-none tracking-[-0.02em] text-foreground">
                {m.value}
              </p>
              {m.hint && <p className="mt-2 text-xs text-muted-foreground">{m.hint}</p>}
            </div>
          ))}
        </div>
      )}

      {extra}

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Submódulos
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {!loading && visibleSubmodules.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Nenhum submódulo disponível para este perfil.
              </CardContent>
            </Card>
          ) : visibleSubmodules.map((sub) => (
            <NavLink
              key={sub.to}
              to={sub.to}
              className="group rounded-xl border border-border/70 bg-gradient-to-br from-card to-secondary/40 p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary transition-transform duration-200 group-hover:scale-110">
                  <sub.icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <h3 className="font-[Poppins,Inter,sans-serif] font-semibold text-foreground">{sub.title}</h3>
                {sub.badge && (
                  <Badge variant="secondary" className="text-[10px]">
                    {sub.badge}
                  </Badge>
                )}
              </div>
              {sub.description && (
                <p className="mt-1 text-sm text-muted-foreground">{sub.description}</p>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}