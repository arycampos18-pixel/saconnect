import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users, CheckCircle2, XCircle, AlertTriangle, AlertOctagon, MapPin, IdCard,
  Phone, FileText, Calendar, ArrowUpRight, Loader2, Search, ChevronLeft, ChevronRight,
} from "lucide-react";
import { MetricCard } from "@/shared/components/MetricCard";
import { HBarChart } from "@/shared/components/charts/HBarChart";
import { DonutChart } from "@/shared/components/charts/DonutChart";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { EleitorDetalheDialog } from "../components/EleitorDetalheDialog";
import { analiseService } from "../services/analiseService";
import { AnaliseFiltrosAvancados, FILTROS_VAZIOS, type AnaliseFiltros } from "../components/AnaliseFiltrosAvancados";

const AreaTrendChart = lazy(() =>
  import("@/shared/components/charts/AreaTrendChart").then((m) => ({ default: m.AreaTrendChart })),
);

type DrillKey =
  | "total" | "validados" | "naoValidados" | "pendentes"
  | "divergentes" | "comZonaSecao" | "comTitulo";

const DRILL_LABEL: Record<DrillKey, string> = {
  total: "Cadastrados",
  validados: "Validados",
  naoValidados: "Não validados",
  pendentes: "Pendentes",
  divergentes: "Divergentes",
  comZonaSecao: "Com zona/seção localizada",
  comTitulo: "Com título encontrado",
};

function matchDrill(r: any, key: DrillKey) {
  const s = r.status_validacao_eleitoral ?? null;
  switch (key) {
    case "total": return true;
    case "validados": return s === "validado";
    case "naoValidados": return s === "rejeitado" || s === "incompleto";
    case "pendentes": return s == null || s === "pendente";
    case "divergentes": return s === "pendente revisão";
    case "comZonaSecao": return !!r.zona_eleitoral && !!r.secao_eleitoral;
    case "comTitulo": return !!r.titulo_eleitoral;
  }
}

export default function AnaliseDashboard() {
  const [filtros, setFiltros] = useState<AnaliseFiltros>(FILTROS_VAZIOS);
  const [drill, setDrill] = useState<DrillKey | null>(null);
  const [eleitorId, setEleitorId] = useState<string | null>(null);
  const [drillSearch, setDrillSearch] = useState("");
  const [drillSort, setDrillSort] = useState<"recent" | "old" | "az" | "za">("recent");
  const [drillPage, setDrillPage] = useState(1);
  const PAGE_SIZE = 20;

  // reset busca/ordenação/página ao trocar o KPI
  useEffect(() => {
    setDrillSearch("");
    setDrillPage(1);
  }, [drill]);
  useEffect(() => { setDrillPage(1); }, [drillSearch, drillSort]);

  const { data: eleitorDetalhe, isFetching: loadingEleitor } = useQuery({
    queryKey: ["analise-eleitor-detalhe", eleitorId],
    enabled: !!eleitorId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("eleitores")
        .select("*")
        .eq("id", eleitorId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: metricas } = useQuery({
    queryKey: ["analise-metricas", filtros],
    queryFn: () => analiseService.metricasDashboard(null),
  });

  const { data: rows = [] } = useQuery({
    queryKey: ["analise-dashboard-dados", filtros],
    queryFn: () => analiseService.dashboardDados(filtros),
  });

  // Conta tudo a partir do mesmo dataset usado no drilldown — assim o número do KPI
  // bate exatamente com a lista que abre no slide-over.
  const counts = useMemo(() => {
    const c: Record<DrillKey, number> = {
      total: 0, validados: 0, naoValidados: 0, pendentes: 0,
      divergentes: 0, comZonaSecao: 0, comTitulo: 0,
    };
    for (const r of rows as any[]) {
      (Object.keys(c) as DrillKey[]).forEach((k) => { if (matchDrill(r, k)) c[k]++; });
    }
    return c;
  }, [rows]);

  const pctValidados = counts.total > 0 ? Math.round((counts.validados / counts.total) * 100) : 0;

  const metricCards: Array<{
    key: DrillKey; title: string; value: string; icon: any;
    variant: "primary" | "success" | "accent"; trend?: string;
  }> = [
    { key: "total", title: "Cadastrados", value: counts.total.toLocaleString("pt-BR"), icon: Users, variant: "primary" },
    { key: "validados", title: "Validados", value: counts.validados.toLocaleString("pt-BR"), icon: CheckCircle2, trend: `${pctValidados}% do total`, variant: "success" },
    { key: "naoValidados", title: "Não validados", value: counts.naoValidados.toLocaleString("pt-BR"), icon: XCircle, variant: "primary" },
    { key: "pendentes", title: "Pendentes", value: counts.pendentes.toLocaleString("pt-BR"), icon: AlertTriangle, variant: "accent" },
    { key: "divergentes", title: "Divergentes", value: counts.divergentes.toLocaleString("pt-BR"), icon: AlertOctagon, variant: "primary" },
    { key: "comZonaSecao", title: "Zona/Seção localizada", value: counts.comZonaSecao.toLocaleString("pt-BR"), icon: MapPin, variant: "success" },
    { key: "comTitulo", title: "Título encontrado", value: counts.comTitulo.toLocaleString("pt-BR"), icon: IdCard, variant: "accent" },
  ];
  void metricas; // mantido para compatibilidade com o cache da query

  const { donut, barras, evolucao, drillRows } = useMemo(() => {
    const byStatus = new Map<string, number>();
    const byCidade = new Map<string, number>();
    const byDia = new Map<string, number>();
    for (const r of rows as any[]) {
      const s = r.status_validacao_eleitoral || "pendente";
      byStatus.set(s, (byStatus.get(s) ?? 0) + 1);
      const c = r.cidade || "Sem cidade";
      byCidade.set(c, (byCidade.get(c) ?? 0) + 1);
      const d = r.created_at ? r.created_at.slice(0, 10) : "—";
      byDia.set(d, (byDia.get(d) ?? 0) + 1);
    }
    const donut = Array.from(byStatus.entries()).map(([label, value]) => ({ label, value }));
    const barras = Array.from(byCidade.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    const evolucao = Array.from(byDia.entries())
      .filter(([d]) => d !== "—")
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([data, value]) => {
        const [, m, day] = data.split("-");
        return { label: `${day}/${m}`, value };
      });
    const drillRows = drill ? (rows as any[]).filter((r) => matchDrill(r, drill)) : [];
    return { donut, barras, evolucao, drillRows };
  }, [rows, drill]);

  const drillProcessed = useMemo(() => {
    const term = drillSearch.trim().toLowerCase();
    let arr = drillRows;
    if (term) {
      arr = arr.filter((r: any) =>
        [r.nome, r.cpf, r.telefone, r.cidade, r.bairro]
          .some((v: any) => (v ?? "").toString().toLowerCase().includes(term))
      );
    }
    arr = [...arr].sort((a: any, b: any) => {
      switch (drillSort) {
        case "recent": return (b.created_at ?? "").localeCompare(a.created_at ?? "");
        case "old": return (a.created_at ?? "").localeCompare(b.created_at ?? "");
        case "az": return (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR");
        case "za": return (b.nome ?? "").localeCompare(a.nome ?? "", "pt-BR");
      }
    });
    return arr;
  }, [drillRows, drillSearch, drillSort]);

  const totalPages = Math.max(1, Math.ceil(drillProcessed.length / PAGE_SIZE));
  const currentPage = Math.min(drillPage, totalPages);
  const pageItems = drillProcessed.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="space-y-7 animate-fade-in-page">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-primary">Análise eleitoral</p>
          <h1>Dashboard de Validação Eleitoral</h1>
          <p className="max-w-2xl text-[15px] text-muted-foreground">
            Indicadores, filtros e gráficos de validação dos eleitores em tempo real.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="rounded-full border border-border/70 bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-elegant-sm">
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-success align-middle" />
            Dados ao vivo · hoje
          </div>
        </div>
      </section>

      {/* KPIs (todos clicáveis para detalhar) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {metricCards.map((card, i) => (
          <button
            key={card.key}
            type="button"
            onClick={() => setDrill(card.key)}
            className={`h-full text-left transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-2xl animate-fade-in-up stagger-${Math.min(i + 1, 4)}`}
            aria-label={`Ver detalhes de ${card.title}`}
          >
            <MetricCard
              title={card.title}
              value={card.value}
              icon={card.icon}
              trend={card.trend}
              variant={card.variant}
            />
          </button>
        ))}
      </div>

      <AnaliseFiltrosAvancados value={filtros} onChange={setFiltros} />

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="card-interactive p-5 md:p-6 lg:col-span-2">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-base font-semibold">Top 10 cidades</h2>
              <p className="text-xs text-muted-foreground">Eleitores cadastrados por município</p>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary">
              Ranking
            </span>
          </div>
          {barras.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
              Sem dados para exibir.
            </div>
          ) : (
            <HBarChart data={barras} />
          )}
        </div>

        <div className="card-interactive p-5 md:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-base font-semibold">Distribuição por status</h2>
              <p className="text-xs text-muted-foreground">Validação eleitoral</p>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary">
              Status
            </span>
          </div>
          {donut.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
              Sem dados.
            </div>
          ) : (
            <DonutChart data={donut} />
          )}
        </div>
      </div>

      <div className="card-interactive p-5 md:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Evolução de cadastros</h2>
            <p className="text-xs text-muted-foreground">Histórico no período filtrado</p>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary">
            Tendência
          </span>
        </div>
        {evolucao.length === 0 ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
            Sem dados no período.
          </div>
        ) : (
          <Suspense fallback={<div className="flex h-[220px] items-center justify-center text-xs text-muted-foreground">Renderizando…</div>}>
            <AreaTrendChart data={evolucao} height={220} />
          </Suspense>
        )}
      </div>

      {/* Drilldown */}
      <Sheet open={!!drill} onOpenChange={(o) => !o && setDrill(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {drill ? DRILL_LABEL[drill] : ""}
              <Badge variant="secondary">{drillProcessed.length.toLocaleString("pt-BR")}</Badge>
            </SheetTitle>
            <SheetDescription>
              Eleitores que correspondem a este indicador (com base nos filtros atuais).
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={drillSearch}
                onChange={(e) => setDrillSearch(e.target.value)}
                placeholder="Buscar por nome, CPF, telefone, cidade…"
                className="h-9 pl-9 text-sm"
              />
            </div>
            <Select value={drillSort} onValueChange={(v) => setDrillSort(v as any)}>
              <SelectTrigger className="h-9 w-full sm:w-[180px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="old">Mais antigos</SelectItem>
                <SelectItem value="az">Nome A → Z</SelectItem>
                <SelectItem value="za">Nome Z → A</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-3 flex-1 overflow-y-auto pr-1">
            {drillProcessed.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {drillSearch ? "Nenhum resultado para a busca." : "Nenhum eleitor encontrado."}
              </p>
            ) : (
              <ul className="space-y-2">
                {pageItems.map((r: any) => {
                  const iniciais = (r.nome ?? "?")
                    .split(" ").slice(0, 2).map((s: string) => s[0]).join("").toUpperCase();
                  const dataFmt = r.created_at
                    ? new Date(r.created_at).toLocaleDateString("pt-BR")
                    : null;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setEleitorId(r.id)}
                        className="group flex w-full items-start gap-3 rounded-xl border border-border/70 bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 text-xs font-bold text-primary">
                          {iniciais}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {r.nome ?? "Sem nome"}
                            </p>
                            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                            {r.cpf && (
                              <span className="inline-flex items-center gap-1">
                                <IdCard className="h-3 w-3" />{r.cpf}
                              </span>
                            )}
                            {r.telefone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-3 w-3" />{r.telefone}
                              </span>
                            )}
                            {(r.cidade || r.bairro) && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {[r.cidade, r.bairro].filter(Boolean).join(" · ")}
                              </span>
                            )}
                            {r.zona_eleitoral && r.secao_eleitoral && (
                              <span className="inline-flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                Zona {r.zona_eleitoral} / Seção {r.secao_eleitoral}
                              </span>
                            )}
                            {dataFmt && (
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3 w-3" />{dataFmt}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
                          {r.status_validacao_eleitoral ?? "pendente"}
                        </Badge>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {drillProcessed.length > PAGE_SIZE && (
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
              <span className="text-muted-foreground">
                Página {currentPage} de {totalPages} ·{" "}
                {drillProcessed.length.toLocaleString("pt-BR")} resultados
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={currentPage <= 1}
                  onClick={() => setDrillPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={currentPage >= totalPages}
                  onClick={() => setDrillPage((p) => Math.min(totalPages, p + 1))}
                >
                  Próxima <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Golden Record (dados completos + LGPD) */}
      {loadingEleitor && eleitorId && !eleitorDetalhe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-sm">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      <EleitorDetalheDialog
        eleitor={eleitorDetalhe ?? null}
        open={!!eleitorId && !!eleitorDetalhe}
        onOpenChange={(v) => !v && setEleitorId(null)}
      />
    </div>
  );
}
