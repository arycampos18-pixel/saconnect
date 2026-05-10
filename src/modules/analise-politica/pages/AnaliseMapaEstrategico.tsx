import { useEffect, useMemo, useState } from "react";
import { PageShell } from "../components/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HBarChart } from "@/shared/components/charts/HBarChart";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Flame, MapPin, Search, TrendingDown, TrendingUp, Users, Target, RefreshCw } from "lucide-react";

const sb: any = supabase;

type Eleitor = {
  bairro: string | null;
  cidade: string | null;
  zona_eleitoral: string | null;
  secao_eleitoral: string | null;
  status_validacao_eleitoral: string | null;
};

type Agg = { label: string; total: number; validados: number };

function aggBy(rows: Eleitor[], key: keyof Eleitor): Agg[] {
  const map = new Map<string, Agg>();
  rows.forEach((r) => {
    const v = (r[key] ?? "").toString().trim();
    if (!v) return;
    const cur = map.get(v) ?? { label: v, total: 0, validados: 0 };
    cur.total += 1;
    if (r.status_validacao_eleitoral === "validado") cur.validados += 1;
    map.set(v, cur);
  });
  return Array.from(map.values());
}

function heatColor(intensity: number) {
  // Gradiente alinhado ao design system (tons de roxo da marca)
  // Baixa: lavanda suave → Alta: roxo primário
  const hue = 292;
  const sat = 30 + intensity * 30; // 30% → 60%
  const light = 98 - intensity * 18; // 98% → 80%
  return `hsl(${hue} ${sat}% ${light}%)`;
}

export default function AnaliseMapaEstrategico() {
  const [cidade, setCidade] = useState("");
  const [eleitores, setEleitores] = useState<Eleitor[]>([]);
  const [loading, setLoading] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      let q = sb
        .from("eleitores")
        .select("bairro,cidade,zona_eleitoral,secao_eleitoral,status_validacao_eleitoral")
        .limit(10000);
      if (cidade) q = q.ilike("cidade", `%${cidade}%`);
      const { data, error } = await q;
      if (error) throw error;
      setEleitores(data ?? []);
      toast.success(`${data?.length ?? 0} eleitores carregados`);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bairros = useMemo(() => aggBy(eleitores, "bairro"), [eleitores]);
  const zonas = useMemo(() => aggBy(eleitores, "zona_eleitoral"), [eleitores]);
  const secoes = useMemo(() => aggBy(eleitores, "secao_eleitoral"), [eleitores]);

  const topBairros = useMemo(
    () => [...bairros].sort((a, b) => b.total - a.total).slice(0, 10),
    [bairros],
  );
  const topZonas = useMemo(
    () => [...zonas].sort((a, b) => b.total - a.total).slice(0, 10),
    [zonas],
  );
  const topSecoes = useMemo(
    () => [...secoes].sort((a, b) => b.total - a.total).slice(0, 10),
    [secoes],
  );

  const baixaConversao = useMemo(() => {
    return [...bairros]
      .filter((b) => b.total >= 5)
      .map((b) => ({ ...b, conv: b.validados / b.total }))
      .sort((a, b) => a.conv - b.conv)
      .slice(0, 10);
  }, [bairros]);

  const totalGeral = eleitores.length;
  const totalValidado = eleitores.filter((e) => e.status_validacao_eleitoral === "validado").length;
  const convGeral = totalGeral > 0 ? Math.round((totalValidado / totalGeral) * 100) : 0;

  // Heatmap por bairro (top 30)
  const heatmap = useMemo(() => {
    const top = [...bairros].sort((a, b) => b.total - a.total).slice(0, 30);
    const max = Math.max(1, ...top.map((b) => b.total));
    return top.map((b) => ({ ...b, intensity: b.total / max, conv: b.total > 0 ? b.validados / b.total : 0 }));
  }, [bairros]);

  return (
    <PageShell
      title="Mapa Estratégico Eleitoral"
      description="Identifique bairros, zonas e seções fortes — e regiões com baixa conversão."
    >
      {/* Hero / filtro */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Inteligência territorial</p>
                <h2 className="text-lg font-semibold leading-tight">Onde estão seus eleitores fortes?</h2>
                <p className="text-xs text-muted-foreground">Cruze densidade e validação para priorizar territórios.</p>
              </div>
            </div>
            <div className="flex w-full gap-2 md:w-auto">
              <div className="relative flex-1 md:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && carregar()}
                  placeholder="Filtrar por cidade…"
                  className="pl-9"
                />
              </div>
              <Button onClick={carregar} disabled={loading} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Atualizando" : "Atualizar"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard icon={<Users className="h-4 w-4" />} label="Total cadastrados" value={totalGeral.toLocaleString("pt-BR")} accent="from-sky-500/15 to-sky-500/0" iconClass="bg-sky-500/15 text-sky-600 dark:text-sky-400" />
        <KpiCard icon={<MapPin className="h-4 w-4" />} label="Bairros mapeados" value={bairros.length.toLocaleString("pt-BR")} accent="from-violet-500/15 to-violet-500/0" iconClass="bg-violet-500/15 text-violet-600 dark:text-violet-400" />
        <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Validados" value={totalValidado.toLocaleString("pt-BR")} accent="from-emerald-500/15 to-emerald-500/0" iconClass="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" />
        <KpiCard icon={<Flame className="h-4 w-4" />} label="Conversão" value={`${convGeral}%`} accent="from-orange-500/15 to-orange-500/0" iconClass="bg-orange-500/15 text-orange-600 dark:text-orange-400" />
      </div>

      {/* Heatmap */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-2 border-b bg-muted/30">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-4 w-4 text-orange-500" />
            Mapa de Calor — Densidade por Bairro
          </CardTitle>
          <div className="hidden items-center gap-2 text-[11px] text-muted-foreground sm:flex">
            <span>Baixa</span>
            <div className="h-2 w-32 rounded-full" style={{ background: "linear-gradient(to right, hsl(292 30% 98%), hsl(292 45% 90%), hsl(292 60% 80%))" }} />
            <span>Alta</span>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {heatmap.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Sem dados de bairro para a seleção atual.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {heatmap.map((b) => (
                <div
                  key={b.label}
                  className="group relative overflow-hidden rounded-xl border border-white/40 p-3 shadow-sm ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  style={{ background: heatColor(b.intensity) }}
                  title={`${b.label} · ${b.total} cadastros · ${Math.round(b.conv * 100)}% validados`}
                >
                  <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-zinc-900/80">{b.label}</div>
                  <div className="mt-1 text-2xl font-bold leading-none text-zinc-900">{b.total}</div>
                  <div className="mt-2 flex items-center justify-between text-[10px] font-medium text-zinc-900/75">
                    <span>{Math.round(b.conv * 100)}% válidos</span>
                    <span className="rounded-full bg-white/40 px-1.5 py-0.5 backdrop-blur">{Math.round(b.intensity * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tops em abas + baixa conversão */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-base">Rankings — Top 10</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Tabs defaultValue="bairros">
              <TabsList>
                <TabsTrigger value="bairros">Bairros</TabsTrigger>
                <TabsTrigger value="zonas">Zonas</TabsTrigger>
                <TabsTrigger value="secoes">Seções</TabsTrigger>
              </TabsList>
              <TabsContent value="bairros" className="mt-4">
                {topBairros.length ? (
                  <HBarChart data={topBairros.map((b) => ({ label: b.label, value: b.total }))} />
                ) : <EmptyMsg />}
              </TabsContent>
              <TabsContent value="zonas" className="mt-4">
                {topZonas.length ? (
                  <HBarChart data={topZonas.map((z) => ({ label: `Zona ${z.label}`, value: z.total }))} />
                ) : <EmptyMsg />}
              </TabsContent>
              <TabsContent value="secoes" className="mt-4">
                {topSecoes.length ? (
                  <HBarChart data={topSecoes.map((s) => ({ label: `Seção ${s.label}`, value: s.total }))} />
                ) : <EmptyMsg />}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b bg-gradient-to-r from-rose-500/10 to-transparent">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4 text-rose-500" />
              Atenção — Baixa Conversão
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {baixaConversao.length === 0 ? (
              <EmptyMsg msg="Sem dados suficientes." />
            ) : (
              <ul className="space-y-2">
                {baixaConversao.map((b) => (
                  <li key={b.label} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 transition-colors hover:bg-muted/50">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{b.label}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {b.total} cadastros · {b.validados} validados
                      </div>
                    </div>
                    <Badge variant="destructive" className="shrink-0">{Math.round(b.conv * 100)}%</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function KpiCard({ icon, label, value, accent, iconClass }: {
  icon: React.ReactNode; label: string; value: string; accent: string; iconClass: string;
}) {
  return (
    <Card className={`relative overflow-hidden border bg-gradient-to-br ${accent}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconClass}`}>{icon}</span>
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

function EmptyMsg({ msg = "Sem dados." }: { msg?: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{msg}</p>;
}