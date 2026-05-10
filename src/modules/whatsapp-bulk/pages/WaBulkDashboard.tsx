import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { waBulkService } from "../services/waBulkService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Play, Send, CheckCheck, Eye, AlertTriangle, Server, Megaphone, Ban } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary))", "hsl(var(--muted-foreground))", "hsl(var(--destructive))"];

export default function WaBulkDashboard() {
  const apis = useQuery({ queryKey: ["wa-bulk-apis"], queryFn: () => waBulkService.listApis() });
  const met = useQuery({ queryKey: ["wa-bulk-metricas"], queryFn: () => waBulkService.metricasHoje() });
  const cfg = useQuery({ queryKey: ["wa-bulk-config"], queryFn: () => waBulkService.getConfig() });
  const fila = useQuery({ queryKey: ["wa-bulk-fila"], queryFn: () => waBulkService.filaPendentes() });
  const enviosHora = useQuery({ queryKey: ["wa-bulk-envios-hora"], queryFn: () => waBulkService.enviosPorHora() });
  const distApi = useQuery({ queryKey: ["wa-bulk-dist-api"], queryFn: () => waBulkService.distribuicaoPorApi() });
  const taxa7d = useQuery({ queryKey: ["wa-bulk-taxa-7d"], queryFn: () => waBulkService.taxaEntrega7Dias() });
  const errosTipo = useQuery({ queryKey: ["wa-bulk-erros-tipo"], queryFn: () => waBulkService.errosPorTipo() });
  const kpis = useQuery({ queryKey: ["wa-bulk-kpis-consolidados"], queryFn: () => waBulkService.kpisConsolidados() });
  const envios30d = useQuery({ queryKey: ["wa-bulk-envios-30d"], queryFn: () => waBulkService.enviosPorDia(30) });
  const topCamps = useQuery({ queryKey: ["wa-bulk-top-campanhas"], queryFn: () => waBulkService.topCampanhas(5) });
  const topAps = useQuery({ queryKey: ["wa-bulk-top-apis"], queryFn: () => waBulkService.topApis(5) });

  // Realtime: refetch on changes to fila/metricas/apis
  useEffect(() => {
    const ch = supabase
      .channel("wa-bulk-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_bulk_fila_envios" },
        () => { fila.refetch(); enviosHora.refetch(); errosTipo.refetch(); kpis.refetch(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_bulk_metricas_diarias" },
        () => { met.refetch(); distApi.refetch(); taxa7d.refetch(); envios30d.refetch(); kpis.refetch(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_bulk_apis" },
        () => { apis.refetch(); topAps.refetch(); kpis.refetch(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_bulk_campanhas" },
        () => { topCamps.refetch(); kpis.refetch(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const meta = cfg.data?.meta_diaria_total ?? 10000;
  const m = met.data ?? { enviados: 0, entregues: 0, lidos: 0, erros: 0, taxa: 0 };
  const k = kpis.data;

  const dispararWorker = async () => {
    try {
      const res = await waBulkService.dispararWorker();
      toast.success(`Worker executado: ${res?.stats?.enviados ?? 0} enviadas`);
      met.refetch(); fila.refetch(); apis.refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Visão Geral — Hoje</h2>
        <Button onClick={dispararWorker} size="sm"><Play className="h-4 w-4 mr-2" />Processar Fila</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Kpi label="Meta Diária" value={meta.toLocaleString()} />
        <Kpi label="Enviadas" value={m.enviados.toLocaleString()} />
        <Kpi label="Entregues" value={m.entregues.toLocaleString()} />
        <Kpi label="Erros" value={m.erros.toLocaleString()} />
        <Kpi label="Taxa Entrega" value={`${m.taxa.toFixed(1)}%`} />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Consolidado (geral)</h3>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
          <KpiIcon icon={<Send className="h-4 w-4" />} label="Total enviadas" value={(k?.total_enviadas ?? 0).toLocaleString()} />
          <KpiIcon icon={<CheckCheck className="h-4 w-4" />} label="Entregues" value={(k?.total_entregues ?? 0).toLocaleString()} />
          <KpiIcon icon={<Eye className="h-4 w-4" />} label="Lidos" value={(k?.total_lidos ?? 0).toLocaleString()} />
          <KpiIcon icon={<AlertTriangle className="h-4 w-4" />} label="Erros" value={(k?.total_erros ?? 0).toLocaleString()} />
          <KpiIcon icon={<CheckCheck className="h-4 w-4" />} label="Tx Entrega" value={`${(k?.taxa_entrega ?? 0).toFixed(1)}%`} />
          <KpiIcon icon={<Server className="h-4 w-4" />} label="APIs ativas" value={`${k?.apis_ativas ?? 0}/${k?.apis_total ?? 0}`} hint={k?.apis_aquecimento ? `${k.apis_aquecimento} em aquecimento` : undefined} />
          <KpiIcon icon={<Megaphone className="h-4 w-4" />} label="Campanhas" value={`${k?.campanhas_ativas ?? 0} ativas`} hint={`${k?.campanhas_total ?? 0} total`} />
          <KpiIcon icon={<Ban className="h-4 w-4" />} label="Opt-out" value={(k?.optout_total ?? 0).toLocaleString()} hint={`Fila: ${k?.fila_pendente ?? 0}`} />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Progresso da Meta</CardTitle></CardHeader>
        <CardContent>
          <Progress value={Math.min(100, (m.enviados / Math.max(1, meta)) * 100)} />
          <p className="mt-2 text-sm text-muted-foreground">
            {m.enviados.toLocaleString()} / {meta.toLocaleString()} mensagens · Fila pendente: {fila.data ?? 0}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Envios por Dia (últimos 30 dias)</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={envios30d.data ?? []}>
              <defs>
                <linearGradient id="gEnv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gEnt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="data" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <Area type="monotone" dataKey="enviados" stroke="hsl(var(--primary))" fill="url(#gEnv)" strokeWidth={2} />
              <Area type="monotone" dataKey="entregues" stroke="hsl(var(--accent))" fill="url(#gEnt)" strokeWidth={2} />
              <Line type="monotone" dataKey="erros" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top 5 Campanhas</CardTitle>
            <Link to="/app/whatsapp-bulk/campanhas" className="text-xs text-primary hover:underline">Ver todas</Link>
          </CardHeader>
          <CardContent>
            {(topCamps.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma campanha ainda.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="py-2">Campanha</th><th>Status</th><th className="text-right">Enviadas</th><th className="text-right">Taxa</th></tr>
                </thead>
                <tbody>
                  {topCamps.data!.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="py-2 font-medium truncate max-w-[180px]" title={c.nome}>{c.nome}</td>
                      <td><Badge variant="secondary">{c.status}</Badge></td>
                      <td className="text-right">{c.enviados.toLocaleString()}</td>
                      <td className="text-right">{c.taxa.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top 5 APIs</CardTitle>
            <Link to="/app/whatsapp-bulk/apis" className="text-xs text-primary hover:underline">Ver todas</Link>
          </CardHeader>
          <CardContent>
            {(topAps.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma API cadastrada.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="py-2">API</th><th className="w-24">Saúde</th><th className="text-right">Enviadas</th><th className="text-right">Erros</th></tr>
                </thead>
                <tbody>
                  {topAps.data!.map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="py-2 font-medium truncate max-w-[180px]" title={a.nome}>{a.nome}</td>
                      <td><Progress value={a.saude} /></td>
                      <td className="text-right">{a.enviados.toLocaleString()}</td>
                      <td className="text-right">{a.erros.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Envios por Hora (24h)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={enviosHora.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hora" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Line type="monotone" dataKey="enviados" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="erros" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Distribuição por API (hoje)</CardTitle></CardHeader>
          <CardContent className="h-64">
            {(distApi.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Sem envios hoje.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distApi.data} dataKey="valor" nameKey="nome" outerRadius={80} label>
                    {(distApi.data ?? []).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Taxa de Entrega (últimos 7 dias)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={taxa7d.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="data" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} formatter={(v: any) => `${v}%`} />
                <Line type="monotone" dataKey="taxa" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Erros por Tipo</CardTitle></CardHeader>
          <CardContent className="h-64">
            {(errosTipo.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Sem erros registrados.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={errosTipo.data} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="tipo" type="category" width={140} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="total" fill="hsl(var(--destructive))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Status das APIs ({apis.data?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          {!apis.data || apis.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma API cadastrada. Vá em Conexões / APIs para adicionar.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="py-2">Nome</th><th>Número</th><th>Status</th><th>Saúde</th><th>Hoje</th><th>Limite</th><th>Último envio</th></tr>
                </thead>
                <tbody>
                  {apis.data.map((a) => {
                    const limite = a.msgs_limite_diario ?? cfg.data?.msgs_limite_diario_padrao ?? 500;
                    return (
                      <tr key={a.id} className="border-t">
                        <td className="py-2 font-medium">{a.nome}</td>
                        <td>{a.numero_telefone}</td>
                        <td><Badge variant={a.status === "ativo" ? "default" : "secondary"}>{a.status}</Badge></td>
                        <td className="w-32"><Progress value={a.saude} /></td>
                        <td>{a.msgs_enviadas_hoje}</td>
                        <td>{limite}</td>
                        <td className="text-xs text-muted-foreground">{a.ultimo_envio ? new Date(a.ultimo_envio).toLocaleString() : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardContent className="pt-6">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </CardContent></Card>
  );
}

function KpiIcon({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <p className="text-[11px] uppercase tracking-wide">{label}</p>
        </div>
        <p className="mt-1 text-xl font-semibold">{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}