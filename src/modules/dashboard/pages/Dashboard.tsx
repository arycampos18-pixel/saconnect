import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users, UserPlus, Target, Layers, Loader2, Trophy, Activity,
  Calendar, MessageSquare, BarChart2, Inbox, AlertCircle, ArrowRight,
} from "lucide-react";
import { lazy, Suspense } from "react";
import { MetricCard } from "@/shared/components/MetricCard";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useUserRole } from "@/modules/auth/hooks/useUserRole";
import { eleitoresService } from "@/modules/eleitores/services/eleitoresService";
import { rankingService, type RankingLiderancaItem } from "@/modules/dashboard/services/rankingService";
import { RankingHierarquico } from "@/modules/dashboard/components/RankingHierarquico";
import { TopLiderancasChart } from "@/modules/dashboard/components/TopLiderancasChart";
import { usePendentesCount } from "@/modules/atendimento/hooks/usePendentesCount";
import { cn } from "@/lib/utils";
import { useCompany } from "@/modules/settings/contexts/CompanyContext";
import { canAccessRoute } from "@/shared/auth/routePermissions";

const AreaTrendChart = lazy(() =>
  import("@/shared/components/charts/AreaTrendChart").then((m) => ({ default: m.AreaTrendChart })),
);

type VisaoAdmin = "politico" | "lideranca" | "cabo";
const visaoLabels: Record<VisaoAdmin, string> = {
  politico: "Político",
  lideranca: "Liderança",
  cabo: "Cabo Eleitoral",
};

function ProgressBar({ value }: { value: number }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${v}%` }} />
    </div>
  );
}

function MetaCard({ atingido, meta, label }: { atingido: number; meta: number; label: string }) {
  const pct = meta > 0 ? Math.round((atingido / meta) * 100) : 0;
  return (
    <div className="rounded-xl border border-border/80 bg-card p-6 shadow-elegant-sm">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
        <span className="text-xs font-semibold text-primary">{pct}%</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-foreground">{atingido.toLocaleString("pt-BR")}</span>
        <span className="text-sm text-muted-foreground">/ {meta.toLocaleString("pt-BR")}</span>
      </div>
      <div className="mt-4"><ProgressBar value={pct} /></div>
    </div>
  );
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState<RankingLiderancaItem[]>([]);
  const [metricas, setMetricas] = useState<{ total: number; hoje: number; serie7d: { dia: string; cadastros: number }[] }>({
    total: 0, hoje: 0, serie7d: [],
  });
  const [visao, setVisao] = useState<VisaoAdmin>("politico");

  useEffect(() => {
    (async () => {
      try {
        const [r, m] = await Promise.all([
          rankingService.ranking(),
          eleitoresService.metricas(),
        ]);
        setRanking(r);
        setMetricas(m);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || roleLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const totalMeta = ranking.reduce((s, l) => s + l.meta, 0);
  const pctMeta = totalMeta > 0 ? Math.round((metricas.total / totalMeta) * 100) : 0;
  const nome = profile?.nome ?? user?.email?.split("@")[0] ?? "Bem-vindo";

  return (
    <div className="space-y-7 animate-fade-in-page">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-primary">Painel principal</p>
          <h1>Olá, {nome} 👋</h1>
          <p className="max-w-2xl text-[15px] text-muted-foreground">
              {isAdmin ? <>Acompanhamento em tempo real na visão de <span className="font-medium text-foreground">{visaoLabels[visao]}</span>.</> : "Visão geral da sua base de eleitores em tempo real."}
            </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="rounded-full border border-border/70 bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-elegant-sm">
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-success align-middle" />
            Dados ao vivo · hoje
          </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Perfil</span>
                <Select value={visao} onValueChange={(v) => setVisao(v as VisaoAdmin)}>
                  <SelectTrigger className="h-9 w-[200px] rounded-lg border-border bg-card text-sm shadow-elegant-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="politico">Político</SelectItem>
                    <SelectItem value="lideranca">Liderança</SelectItem>
                    <SelectItem value="cabo">Cabo Eleitoral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
        </div>
      </section>

      {!isAdmin || visao === "politico" ? (
        <VisaoPolitico ranking={ranking} metricas={metricas} totalMeta={totalMeta} pctMeta={pctMeta} />
      ) : visao === "lideranca" ? (
        <VisaoLideranca ranking={ranking} />
      ) : (
        <VisaoCabo ranking={ranking} />
      )}
    </div>
  );
}

/* ---------- Visão Político (default e perfis não-admin) ---------- */
function VisaoPolitico({
  ranking, metricas, totalMeta, pctMeta,
}: {
  ranking: RankingLiderancaItem[];
  metricas: { total: number; hoje: number; serie7d: { dia: string; cadastros: number }[] };
  totalMeta: number;
  pctMeta: number;
}) {
  const { hasPermission, isSuperAdmin } = useCompany();
  const metricCards = [
    { to: "/app/eleitores", title: "Total de Eleitores", value: metricas.total.toLocaleString("pt-BR"), icon: Users, variant: "primary" as const },
    { to: "/app/political/voters?cadastrados=hoje", title: "Cadastros Hoje", value: metricas.hoje.toString(), icon: UserPlus, variant: "success" as const },
    { to: "/app/cadastros", title: "Lideranças Ativas", value: ranking.length.toString(), icon: Layers, variant: "primary" as const },
    { to: "/app/relatorios", title: "Meta do Mês", value: `${pctMeta}%`, icon: Target, trend: `${metricas.total}/${totalMeta}`, variant: "success" as const },
  ].filter((card) => canAccessRoute(card.to, hasPermission, isSuperAdmin));

  return (
    <>
      {/* KPIs clicáveis */}
      {metricCards.length > 0 && (
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {metricCards.map((card, index) => (
            <Link key={card.to} to={card.to} className={`block animate-fade-in-up stagger-${Math.min(index + 1, 4)}`}>
              <MetricCard title={card.title} value={card.value} icon={card.icon} trend={card.trend} variant={card.variant} />
            </Link>
          ))}
        </div>
      )}

      {/* Ações rápidas + alertas */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2"><AcoesRapidas /></div>
        <AlertasCriticos />
      </div>

      {/* Atividades recentes */}
      <UltimasAtividades />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2"><TopLiderancasChart ranking={ranking} /></div>
        <MetaCard atingido={metricas.total} meta={Math.max(totalMeta, 1)} label="Progresso geral" />
      </div>

      <div className="card-interactive p-5 md:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Cadastros · últimos 7 dias</h2>
            <p className="text-xs text-muted-foreground">Histórico semanal</p>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary">
            Tendência
          </span>
        </div>
        <Suspense fallback={<div className="flex h-[220px] items-center justify-center text-xs text-muted-foreground">Renderizando…</div>}>
          <AreaTrendChart
            data={metricas.serie7d.map((d) => ({ label: d.dia, value: d.cadastros }))}
            height={220}
          />
        </Suspense>
      </div>

      <RankingHierarquico ranking={ranking} />
    </>
  );
}

/* ---------- Ações Rápidas ---------- */
function AcoesRapidas() {
  const navigate = useNavigate();
  const { hasPermission, isSuperAdmin } = useCompany();
  const acoes: Array<{ label: string; icon: any; to: string; tone: string }> = [
    { label: "Novo Eleitor",     icon: UserPlus,       to: "/app/captacao",       tone: "from-primary/15 to-primary/5 text-primary" },
    { label: "Novo Evento",      icon: Calendar,       to: "/app/eventos",        tone: "from-success/15 to-success/5 text-success" },
    { label: "Enviar Mensagem",  icon: MessageSquare,  to: "/app/atendimento", tone: "from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-400" },
    { label: "Nova Pesquisa",    icon: BarChart2,      to: "/app/pesquisas/nova", tone: "from-warning/15 to-warning/5 text-warning" },
  ];
  const acoesVisiveis = acoes.filter((acao) => canAccessRoute(acao.to, hasPermission, isSuperAdmin));

  if (acoesVisiveis.length === 0) return null;

  return (
    <div className="card-interactive p-6">
      <div className="mb-4">
        <h2 className="text-base">Ações rápidas</h2>
        <p className="text-sm text-muted-foreground">Atalhos para o que você mais usa</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {acoesVisiveis.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => navigate(a.to)}
            className={cn(
              "group flex flex-col items-center gap-3 rounded-xl border border-border/70 bg-gradient-to-br p-5 text-center shadow-sm transition-all duration-200",
              "hover:scale-[1.04] hover:shadow-md hover:border-primary/30",
              a.tone,
            )}
          >
            <a.icon className="h-10 w-10 transition-transform duration-200 group-hover:scale-110" strokeWidth={1.75} />
            <span className="text-sm font-semibold text-foreground">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Alertas Críticos ---------- */
function AlertasCriticos() {
  const { data: pendentes = 0 } = usePendentesCount();
  const { hasPermission, isSuperAdmin } = useCompany();
  const alerts: Array<{ icon: any; titulo: string; sub: string; to: string; tone: string }> = [];
  if (pendentes > 0 && canAccessRoute("/app/atendimento", hasPermission, isSuperAdmin)) {
    alerts.push({
      icon: Inbox,
      titulo: `${pendentes} ${pendentes === 1 ? "atendimento pendente" : "atendimentos pendentes"}`,
      sub: "Conversas aguardando resposta",
      to: "/app/atendimento",
      tone: "text-warning",
    });
  }
  return (
    <div className="card-interactive flex h-full flex-col p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base">Alertas</h2>
          <p className="text-sm text-muted-foreground">O que precisa de atenção</p>
        </div>
        {alerts.length > 0 && <Badge variant="secondary">{alerts.length}</Badge>}
      </div>
      {alerts.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success">
            <AlertCircle className="h-5 w-5" />
          </div>
          <p className="text-sm text-muted-foreground">Tudo em dia ✨</p>
        </div>
      ) : (
        <ul className="flex-1 space-y-2">
          {alerts.map((a) => (
            <li key={a.titulo}>
              <Link
                to={a.to}
                className="flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-3 transition-all hover:border-primary/40 hover:bg-accent"
              >
                <a.icon className={`mt-0.5 h-4 w-4 ${a.tone}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{a.titulo}</p>
                  <p className="text-xs text-muted-foreground">{a.sub}</p>
                </div>
                <ArrowRight className="mt-0.5 h-4 w-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Últimas Atividades ---------- */
function UltimasAtividades() {
  const { hasPermission, isSuperAdmin } = useCompany();
  const [items, setItems] = useState<Array<{ id: string; nome: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const canSeeEleitores = canAccessRoute("/app/eleitores", hasPermission, isSuperAdmin);
  useEffect(() => {
    if (!canSeeEleitores) {
      setItems([]);
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("eleitores")
        .select("id,nome,created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      setItems((data ?? []) as any);
      setLoading(false);
    })();
  }, [canSeeEleitores]);

  if (!canSeeEleitores) return null;

  const fmt = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.round(diff / 60000);
    if (min < 1) return "agora";
    if (min < 60) return `há ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `há ${h}h`;
    const d = Math.round(h / 24);
    return `há ${d}d`;
  };

  return (
    <div className="card-interactive p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base">Últimas atividades</h2>
          <p className="text-sm text-muted-foreground">Cadastros mais recentes</p>
        </div>
        <Button asChild size="sm" variant="ghost">
          <Link to="/app/eleitores">Ver todos <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Nenhum cadastro ainda.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                {i.nome.split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{i.nome}</p>
                <p className="text-xs text-muted-foreground">Cadastrado · {fmt(i.created_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Visão Liderança ---------- */
function VisaoLideranca({ ranking }: { ranking: RankingLiderancaItem[] }) {
  const minha = ranking[0];
  if (!minha) return <p className="text-muted-foreground">Sem dados de liderança.</p>;
  const total = minha.total;
  const mediaCabos = minha.cabos.length > 0 ? Math.round(total / minha.cabos.length) : 0;
  const minhaPos = minha.posicao;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Meus Cadastros" value={total.toString()} icon={Users} variant="primary" />
        <MetricCard title="Meta" value={minha.meta.toString()} icon={Target} variant="success" />
        <MetricCard title="Meus Cabos" value={minha.cabos.length.toString()} icon={Layers} variant="primary" />
        <MetricCard title="Média por Cabo" value={mediaCabos.toString()} icon={Activity} variant="success" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border/80 bg-card shadow-elegant-sm">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">Ranking dos Meus Cabos Eleitorais</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Cabo Eleitoral</TableHead>
                <TableHead className="text-center">Cadastros</TableHead>
                <TableHead className="text-center">Meta</TableHead>
                <TableHead>% Atingido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...minha.cabos].sort((a, b) => b.cadastros - a.cadastros).map((c) => {
                const pct = c.meta > 0 ? Math.min(100, Math.round((c.cadastros / c.meta) * 100)) : 0;
                return (
                  <TableRow key={c.id} className="border-border">
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell className="text-center">{c.cadastros}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{c.meta}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ProgressBar value={pct} />
                        <span className="w-10 text-right text-xs text-muted-foreground">{pct}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border/80 bg-card p-6 shadow-elegant-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Minha posição no ranking</p>
                <p className="text-2xl font-bold text-foreground">#{minhaPos}</p>
              </div>
            </div>
          </div>
          <MetaCard atingido={total} meta={Math.max(minha.meta, 1)} label="Minha meta" />
        </div>
      </div>
    </>
  );
}

/* ---------- Visão Cabo ---------- */
function VisaoCabo({ ranking }: { ranking: RankingLiderancaItem[] }) {
  const lid = ranking[0];
  const meu = lid?.cabos[0];
  if (!meu) return <p className="text-muted-foreground">Sem dados de cabo.</p>;
  const pct = meu.meta > 0 ? Math.round((meu.cadastros / meu.meta) * 100) : 0;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Meus Cadastros" value={meu.cadastros.toString()} icon={Users} variant="primary" />
        <MetricCard title="Minha Meta" value={meu.meta.toString()} icon={Target} variant="success" />
        <MetricCard title="% da Meta" value={`${pct}%`} icon={Activity} variant="primary" />
        <MetricCard title="Total da Liderança" value={lid.total.toString()} icon={Users} variant="success" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <MetaCard atingido={meu.cadastros} meta={Math.max(meu.meta, 1)} label="Minha meta pessoal" />
        <div className="lg:col-span-2 rounded-xl border border-border/80 bg-card p-6 shadow-elegant-sm">
          <p className="text-sm text-muted-foreground">Minha Liderança</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{lid.nome}</p>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total da liderança</span>
            <span className="font-semibold text-foreground">{lid.total}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Meta da liderança</span>
            <span className="font-semibold text-foreground">{lid.meta}</span>
          </div>
        </div>
      </div>
    </>
  );
}
