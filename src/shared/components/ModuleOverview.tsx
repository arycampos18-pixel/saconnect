import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export interface OverviewKPI {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
}

export interface OverviewQuickAction {
  label: string;
  to: string;
  icon: LucideIcon;
}

export interface OverviewSubpage {
  label: string;
  to: string;
  icon: LucideIcon;
  description?: string;
}

export interface OverviewActivity {
  title: string;
  subtitle?: string;
  when?: string;
  to?: string;
}

export interface OverviewSeriesPoint {
  label: string;
  value: number;
}

export interface OverviewPieSlice {
  name: string;
  value: number;
}

interface Props {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  loading?: boolean;
  kpis: OverviewKPI[];
  series?: { title: string; data: OverviewSeriesPoint[]; type?: "line" | "bar" };
  pie?: { title: string; data: OverviewPieSlice[] };
  quickActions?: OverviewQuickAction[];
  activities?: { title: string; items: OverviewActivity[] };
  subpages?: OverviewSubpage[];
  extra?: ReactNode;
}

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.7)",
  "hsl(var(--primary) / 0.5)",
  "hsl(var(--primary) / 0.35)",
  "hsl(var(--muted-foreground))",
];

export function ModuleOverview({
  title,
  subtitle,
  icon: Icon,
  loading,
  kpis,
  series,
  pie,
  quickActions = [],
  activities,
  subpages = [],
  extra,
}: Props) {
  return (
    <div className="space-y-6 animate-fade-in-page">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md">
          <Icon className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</p>
                {k.icon && (
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <k.icon className="h-4 w-4" />
                  </div>
                )}
              </div>
              <p className="mt-2 text-[26px] font-bold leading-none tracking-tight text-foreground">
                {loading ? <Skeleton className="h-7 w-20" /> : k.value}
              </p>
              {k.hint && <p className="mt-2 text-xs text-muted-foreground">{k.hint}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      {(series || pie) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {series && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{series.title}</CardTitle>
              </CardHeader>
              <CardContent className="h-[240px] pt-0">
                {loading ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    {series.type === "bar" ? (
                      <BarChart data={series.data}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    ) : (
                      <LineChart data={series.data}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2.5}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}
          {pie && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{pie.title}</CardTitle>
              </CardHeader>
              <CardContent className="h-[240px] pt-0">
                {loading ? (
                  <Skeleton className="h-full w-full" />
                ) : pie.data.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Sem dados
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pie.data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={40}
                      >
                        {pie.data.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Quick actions + activities */}
      <div className="grid gap-4 lg:grid-cols-3">
        {quickActions.length > 0 && (
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Ações rápidas</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {quickActions.map((qa) => (
                <Button
                  key={qa.to}
                  asChild
                  variant="outline"
                  className="h-11 justify-start gap-2 hover:border-primary/40 hover:bg-primary/5"
                >
                  <NavLink to={qa.to}>
                    <qa.icon className="h-4 w-4 text-primary" />
                    <span>{qa.label}</span>
                  </NavLink>
                </Button>
              ))}
            </CardContent>
          </Card>
        )}

        {activities && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{activities.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : activities.items.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma atividade recente.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {activities.items.map((a, i) => {
                    const inner = (
                      <div className="flex items-center justify-between py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{a.title}</p>
                          {a.subtitle && (
                            <p className="truncate text-xs text-muted-foreground">{a.subtitle}</p>
                          )}
                        </div>
                        {a.when && (
                          <span className="ml-2 shrink-0 text-xs text-muted-foreground">{a.when}</span>
                        )}
                      </div>
                    );
                    return (
                      <li key={i}>
                        {a.to ? (
                          <NavLink to={a.to} className="block hover:bg-muted/40 rounded">
                            {inner}
                          </NavLink>
                        ) : (
                          inner
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {extra}

      {/* Subpages */}
      {subpages.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Acesso rápido
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subpages.map((s) => (
              <NavLink
                key={s.to}
                to={s.to}
                className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{s.label}</p>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                  </div>
                  {s.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {s.description}
                    </p>
                  )}
                </div>
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ModuleOverview;