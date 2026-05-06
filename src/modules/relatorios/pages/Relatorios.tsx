import { lazy, Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart2, Calendar, Download, Loader2, MessageSquare, Users, Vote } from "lucide-react";
import { toast } from "sonner";
import { relatoriosService, type Periodo, type RelatorioGeral } from "../services/relatoriosService";
import { DrillDownSheet, type DrillTarget } from "../components/DrillDownSheet";
import type { DrillDimensao } from "../services/relatoriosService";

const AreaTrendChart = lazy(() =>
  import("@/shared/components/charts/AreaTrendChart").then((m) => ({ default: m.AreaTrendChart })),
);
const HBarChart = lazy(() =>
  import("@/shared/components/charts/HBarChart").then((m) => ({ default: m.HBarChart })),
);
const DonutChart = lazy(() =>
  import("@/shared/components/charts/DonutChart").then((m) => ({ default: m.DonutChart })),
);

const ChartFallback = ({ h = 240 }: { h?: number }) => (
  <div className="flex items-center justify-center text-xs text-muted-foreground" style={{ height: h }}>
    Renderizando…
  </div>
);

export default function Relatorios() {
  const [periodo, setPeriodo] = useState<Periodo>("30d");
  const [data, setData] = useState<RelatorioGeral | null>(null);
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState<DrillTarget>(null);

  const open = (dimensao: DrillDimensao) => (valor: string) => setDrill({ dimensao, valor });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setData(await relatoriosService.carregar(periodo));
      } catch (e: any) {
        toast.error(e.message ?? "Erro ao carregar relatórios.");
      } finally {
        setLoading(false);
      }
    })();
  }, [periodo]);

  function exportar() {
    if (!data) return;
    const linhas: string[][] = [["Seção", "Métrica", "Valor"]];
    linhas.push(["Eleitores", "Total", String(data.eleitores.total)]);
    linhas.push(["Eleitores", "Novos no período", String(data.eleitores.novosPeriodo)]);
    data.eleitores.porBairro.forEach((b) => linhas.push(["Eleitores · Bairro", b.nome, String(b.total)]));
    data.eleitores.porCidade.forEach((b) => linhas.push(["Eleitores · Cidade", b.nome, String(b.total)]));
    data.eleitores.porLideranca.forEach((b) => linhas.push(["Eleitores · Liderança", b.nome, String(b.total)]));
    data.eleitores.porTag.forEach((b) => linhas.push(["Eleitores · Tag", b.nome, String(b.total)]));
    linhas.push(["Eventos", "Total", String(data.eventos.total)]);
    linhas.push(["Eventos", "Inscritos", String(data.eventos.inscritos)]);
    linhas.push(["Eventos", "Presentes", String(data.eventos.presentes)]);
    data.eventos.porStatus.forEach((b) => linhas.push(["Eventos · Status", b.nome, String(b.total)]));
    linhas.push(["Pesquisas", "Total", String(data.pesquisas.total)]);
    linhas.push(["Pesquisas", "Ativas", String(data.pesquisas.ativas)]);
    linhas.push(["Pesquisas", "Sessões", String(data.pesquisas.sessoes)]);
    linhas.push(["Pesquisas", "Respostas", String(data.pesquisas.respostas)]);
    linhas.push(["Comunicação", "Envios", String(data.comunicacao.totalEnvios)]);
    linhas.push(["Comunicação", "Destinatários", String(data.comunicacao.destinatarios)]);
    data.comunicacao.porCanal.forEach((b) => linhas.push(["Comunicação · Canal", b.nome, String(b.total)]));

    const csv = linhas.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `relatorio-${periodo}-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (loading || !data) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            <BarChart2 className="h-7 w-7 text-primary" /> Relatórios
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Visão consolidada de todas as áreas do gabinete.</p>
        </div>
        <div className="flex gap-2">
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="ano">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportar}><Download className="mr-2 h-4 w-4" />Exportar CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={<Users className="h-5 w-5 text-primary" />} label="Eleitores" valor={data.eleitores.total} sub={`+${data.eleitores.novosPeriodo} no período`} />
        <Kpi icon={<Calendar className="h-5 w-5 text-primary" />} label="Eventos" valor={data.eventos.total} sub={`${data.eventos.presentes}/${data.eventos.inscritos} presentes`} />
        <Kpi icon={<Vote className="h-5 w-5 text-primary" />} label="Pesquisas" valor={data.pesquisas.total} sub={`${data.pesquisas.sessoes} sessões`} />
        <Kpi icon={<MessageSquare className="h-5 w-5 text-primary" />} label="Envios" valor={data.comunicacao.totalEnvios} sub={`${data.comunicacao.destinatarios} destinatários`} />
      </div>

      <Tabs defaultValue="eleitores">
        <TabsList>
          <TabsTrigger value="eleitores">Eleitores</TabsTrigger>
          <TabsTrigger value="eventos">Eventos</TabsTrigger>
          <TabsTrigger value="pesquisas">Pesquisas</TabsTrigger>
          <TabsTrigger value="comunicacao">Comunicação</TabsTrigger>
        </TabsList>

        <TabsContent value="eleitores" className="mt-4 space-y-6">
          <Card titulo="Cadastros no período">
            <Suspense fallback={<ChartFallback h={260} />}>
              <AreaTrendChart
                data={data.eleitores.serieDiaria.map((d: any) => ({ label: d.dia, value: d.total }))}
                height={260}
              />
            </Suspense>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card titulo="Top bairros"><BarsHorizontal data={data.eleitores.porBairro} onClick={open("bairro")} /></Card>
            <Card titulo="Top cidades"><BarsHorizontal data={data.eleitores.porCidade} onClick={open("cidade")} /></Card>
            <Card titulo="Por liderança"><BarsHorizontal data={data.eleitores.porLideranca} onClick={open("lideranca")} /></Card>
            <Card titulo="Por origem"><Pizza data={data.eleitores.porOrigem} onClick={open("origem")} /></Card>
            <Card titulo="Por gênero"><Pizza data={data.eleitores.porGenero} onClick={open("genero")} /></Card>
            <Card titulo="Por tag">
              {data.eleitores.porTag.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma tag aplicada.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.eleitores.porTag.map((t) => (
                    <Badge
                      key={t.nome}
                      style={{ backgroundColor: t.cor, color: "white" }}
                      className="cursor-pointer"
                      onClick={() => setDrill({ dimensao: "tag", valor: t.nome })}
                    >
                      {t.nome} · {t.total}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="eventos" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card titulo="Por status"><Pizza data={data.eventos.porStatus} onClick={open("evento_status")} /></Card>
            <Card titulo="Por tipo"><BarsHorizontal data={data.eventos.porTipo} onClick={open("evento_tipo")} /></Card>
          </div>
          <Card titulo="Próximos eventos">
            {data.eventos.proximos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum evento futuro.</p>
            ) : (
              <ul className="divide-y">
                {data.eventos.proximos.map((e) => (
                  <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium text-foreground">{e.nome}</p>
                      <p className="text-xs text-muted-foreground">{e.local}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(e.data_hora).toLocaleString("pt-BR")}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="pesquisas" className="mt-4 space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi label="Pesquisas" valor={data.pesquisas.total} />
            <Kpi label="Ativas" valor={data.pesquisas.ativas} />
            <Kpi label="Sessões" valor={data.pesquisas.sessoes} />
            <Kpi label="Respostas" valor={data.pesquisas.respostas} />
          </div>
          <Card titulo="Por status"><Pizza data={data.pesquisas.porStatus} onClick={open("pesquisa_status")} /></Card>
        </TabsContent>

        <TabsContent value="comunicacao" className="mt-4 space-y-6">
          <Card titulo="Envios por canal"><BarsHorizontal data={data.comunicacao.porCanal} onClick={open("comunicacao_canal")} /></Card>
        </TabsContent>
      </Tabs>

      <DrillDownSheet target={drill} onClose={() => setDrill(null)} />
    </div>
  );
}

function Kpi({ icon, label, valor, sub }: { icon?: React.ReactNode; label: string; valor: number; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-elegant-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-3xl font-bold text-foreground">{valor}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Card({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-elegant-sm">
      <h3 className="mb-4 font-semibold text-foreground">{titulo}</h3>
      {children}
    </div>
  );
}

function BarsHorizontal({ data, onClick }: { data: { nome: string; total: number }[]; onClick?: (nome: string) => void }) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">Sem dados.</p>;
  return (
    <Suspense fallback={<ChartFallback h={240} />}>
      <HBarChart
        data={data.map((d) => ({ label: d.nome, value: d.total }))}
        onSelect={onClick}
      />
    </Suspense>
  );
}

function Pizza({ data, onClick }: { data: { nome: string; total: number }[]; onClick?: (nome: string) => void }) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">Sem dados.</p>;
  return (
    <Suspense fallback={<ChartFallback h={260} />}>
      <DonutChart
        data={data.map((d) => ({ label: d.nome, value: d.total }))}
        onSelect={onClick}
        height={280}
      />
    </Suspense>
  );
}