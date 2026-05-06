import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownRight, ArrowUpRight, Download, FileJson, Users, Calendar, MessageSquare, Trophy, TrendingUp, Target } from "lucide-react";
import { toast } from "sonner";
import { executivoService, exportarCSV, exportarJSON, type ExecutivoKPIs } from "../services/executivoService";
import { AreaTrendChart } from "@/shared/components/charts/AreaTrendChart";
import { HBarChart } from "@/shared/components/charts/HBarChart";
import { DonutChart } from "@/shared/components/charts/DonutChart";

function VariacaoBadge({ valor }: { valor: number }) {
  if (valor === 0) return <span className="text-xs text-muted-foreground">— 0%</span>;
  const positivo = valor > 0;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${positivo ? "text-emerald-600" : "text-destructive"}`}>
      {positivo ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {positivo ? "+" : ""}{valor}%
    </span>
  );
}

function KPICard({ icon: Icon, label, valor, variacao, hint }: any) {
  return (
    <Card className="border-border/60 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">{valor}</p>
        {(hint || variacao !== undefined) && (
          <div className="mt-1.5 flex items-center justify-between">
            {variacao !== undefined ? <VariacaoBadge valor={variacao} /> : <span />}
            {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{children}</h2>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

export default function Executivo() {
  const [periodo, setPeriodo] = useState(30);
  const [kpis, setKpis] = useState<ExecutivoKPIs | null>(null);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    try {
      const data = await executivoService.carregar(periodo);
      setKpis(data);
    } catch (e: any) {
      toast.error("Erro ao carregar dashboard", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [periodo]);

  const exportarTudo = (formato: "csv" | "json") => {
    if (!kpis) return;
    if (formato === "json") {
      exportarJSON(`dashboard-executivo-${Date.now()}.json`, kpis);
    } else {
      exportarCSV(`dashboard-bairros-${Date.now()}.csv`, kpis.eleitoresPorBairro);
    }
    toast.success("Exportação iniciada");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Executivo</h1>
          <p className="text-sm text-muted-foreground">Visão estratégica com KPIs, comparativos e tendências.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={String(periodo)} onValueChange={(v) => setPeriodo(Number(v))}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="180">Últimos 180 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => exportarTudo("csv")}>
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportarTudo("json")}>
            <FileJson className="mr-2 h-4 w-4" /> JSON
          </Button>
        </div>
      </div>

      {loading || !kpis ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="space-y-8">
          {/* Visão geral — 4 KPIs principais */}
          <section className="space-y-3">
            <SectionTitle>Visão geral</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KPICard icon={Users} label="Eleitores" valor={kpis.totalEleitores} hint={`${kpis.consentimentoLgpdPct}% LGPD`} />
              <KPICard icon={Trophy} label="Lideranças" valor={kpis.totalLiderancas} />
              <KPICard icon={Calendar} label="Eventos" valor={kpis.totalEventos} />
              <KPICard icon={Target} label="Conversão" valor={`${kpis.taxaConversao}%`} hint={`${kpis.totalVotosFunil} no funil`} />
            </div>
          </section>

          {/* Comparativo — 3 indicadores essenciais */}
          <section className="space-y-3">
            <SectionTitle hint={`Atual vs ${periodo} dias anteriores`}>Comparativo do período</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-3">
              <KPICard icon={Users} label="Novos eleitores" valor={kpis.periodoAtual.eleitoresNovos} variacao={kpis.variacao.eleitoresNovos} />
              <KPICard icon={TrendingUp} label="Respostas pesquisas" valor={kpis.periodoAtual.pesquisasRespostas} variacao={kpis.variacao.pesquisasRespostas} />
              <KPICard icon={Trophy} label="Votos compromissados" valor={kpis.periodoAtual.votosGanhos} variacao={kpis.variacao.votosGanhos} />
            </div>
          </section>

          {/* Evolução temporal */}
          <section className="space-y-3">
            <SectionTitle>Evolução</SectionTitle>
            <Card className="overflow-hidden border-border/60">
            <CardHeader className="flex flex-row items-start justify-between gap-3 p-5 md:p-6">
              <div>
                <CardTitle className="text-base font-semibold">Evolução da base de eleitores</CardTitle>
                <CardDescription className="text-xs">Crescimento acumulado nos últimos {periodo} dias.</CardDescription>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-primary">
                Tendência
              </span>
            </CardHeader>
            <CardContent className="px-2 pb-5 md:px-3 md:pb-6">
              <AreaTrendChart
                data={kpis.evolucaoEleitores.map((d: any) => ({ label: d.dia, value: d.total }))}
                height={260}
              />
            </CardContent>
            </Card>
          </section>

          <section className="space-y-3">
            <SectionTitle>Distribuição</SectionTitle>
            <div className="grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden border-border/60">
              <CardHeader className="flex flex-row items-start justify-between gap-3 p-5 md:p-6">
                <div>
                  <CardTitle className="text-base font-semibold">Top 10 bairros</CardTitle>
                  <CardDescription className="text-xs">Distribuição da base por região.</CardDescription>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-primary">
                  Ranking
                </span>
              </CardHeader>
              <CardContent className="px-2 pb-5 md:px-3 md:pb-6">
                <HBarChart
                  data={kpis.eleitoresPorBairro.map((d: any) => ({ label: d.bairro, value: d.total }))}
                />
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-border/60">
              <CardHeader className="flex flex-row items-start justify-between gap-3 p-5 md:p-6">
                <div>
                  <CardTitle className="text-base font-semibold">Origem dos cadastros</CardTitle>
                  <CardDescription className="text-xs">Como os eleitores chegam à base.</CardDescription>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-primary">
                  Distribuição
                </span>
              </CardHeader>
              <CardContent className="px-2 pb-5 md:px-3 md:pb-6">
                <DonutChart
                  data={kpis.eleitoresPorOrigem.map((d: any) => ({ label: d.origem, value: d.total }))}
                  height={280}
                />
              </CardContent>
            </Card>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}