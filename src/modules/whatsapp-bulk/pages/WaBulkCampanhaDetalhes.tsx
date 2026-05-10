import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Play, Pause, X, RefreshCw, RotateCcw, Search, AlertCircle,
  CheckCircle2, Clock, Send, Eye, Ban, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  waBulkService, type WaBulkCampanha, type WaBulkFilaItem,
} from "../services/waBulkService";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

const STATUS_CAMP: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  rascunho: { label: "Rascunho", variant: "secondary" },
  agendada: { label: "Agendada", variant: "outline" },
  em_andamento: { label: "Em andamento", variant: "default" },
  pausada: { label: "Pausada", variant: "outline" },
  concluida: { label: "Concluída", variant: "default" },
  cancelada: { label: "Cancelada", variant: "destructive" },
};

const STATUS_ITEM: Record<string, { label: string; cls: string }> = {
  pendente: { label: "Pendente", cls: "text-muted-foreground" },
  enviando: { label: "Enviando", cls: "text-blue-600" },
  enviado: { label: "Enviado", cls: "text-emerald-600" },
  entregue: { label: "Entregue", cls: "text-emerald-600" },
  lido: { label: "Lido", cls: "text-emerald-700" },
  erro: { label: "Erro", cls: "text-destructive" },
  cancelado: { label: "Cancelado", cls: "text-muted-foreground" },
  optout: { label: "Opt-out", cls: "text-amber-600" },
};

export default function WaBulkCampanhaDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [camp, setCamp] = useState<WaBulkCampanha | null>(null);
  const [itens, setItens] = useState<WaBulkFilaItem[]>([]);
  const [contagem, setContagem] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>("");
  const [busca, setBusca] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof waBulkService.metricasCampanha>> | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const carregar = async () => {
    if (!id) return;
    try {
      const [c, fila, cont] = await Promise.all([
        waBulkService.getCampanha(id),
        waBulkService.listFila({ campanha_id: id, status: filtroStatus || undefined, limit: 500 }),
        waBulkService.filaContagemPorStatusCampanha(id),
      ]);
      setCamp(c);
      setItens(fila);
      setContagem(cont);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  const carregarAnalytics = async () => {
    if (!id) return;
    setLoadingAnalytics(true);
    try {
      const a = await waBulkService.metricasCampanha(id);
      setAnalytics(a);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao carregar análise");
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => { carregarAnalytics(); /* eslint-disable-next-line */ }, [id]);

  useEffect(() => { setLoading(true); carregar(); /* eslint-disable-next-line */ }, [id, filtroStatus]);

  // Realtime: atualiza ao mudar status na fila ou campanha
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`wa-bulk-camp-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_bulk_fila_envios", filter: `campanha_id=eq.${id}` }, () => carregar())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "wa_bulk_campanhas", filter: `id=eq.${id}` }, () => carregar())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [id]);

  // Polling de fallback
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(carregar, 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [autoRefresh, id, filtroStatus]);

  const itensFiltrados = useMemo(() => {
    if (!busca.trim()) return itens;
    const b = busca.trim().toLowerCase();
    return itens.filter(
      (i) =>
        (i.destinatario_telefone ?? "").toLowerCase().includes(b) ||
        (i.destinatario_nome ?? "").toLowerCase().includes(b),
    );
  }, [itens, busca]);

  const acaoStatus = async (status: WaBulkCampanha["status"]) => {
    if (!camp) return;
    try {
      await waBulkService.updateCampanhaStatus(camp.id, status);
      toast.success("Status atualizado");
      carregar();
    } catch (e: any) { toast.error(e.message ?? "Erro"); }
  };

  const togglePausa = async () => {
    if (!camp) return;
    try {
      await waBulkService.pausarCampanha(camp.id, !camp.pausada);
      toast.success(camp.pausada ? "Campanha retomada" : "Campanha pausada");
      carregar();
    } catch (e: any) { toast.error(e.message ?? "Erro"); }
  };

  const dispararWorker = async () => {
    try {
      await waBulkService.dispararWorker();
      toast.success("Worker acionado");
      setTimeout(carregar, 1500);
    } catch (e: any) { toast.error(e.message ?? "Erro"); }
  };

  const retentarTodosErros = async () => {
    if (!camp) return;
    try {
      const n = await waBulkService.retentarErrosCampanha(camp.id);
      toast.success(`${n} item(ns) reenfileirado(s)`);
      carregar();
    } catch (e: any) { toast.error(e.message ?? "Erro"); }
  };

  const retentarItem = async (itemId: string) => {
    try {
      await waBulkService.retentarItem(itemId);
      toast.success("Item reenfileirado");
      carregar();
    } catch (e: any) { toast.error(e.message ?? "Erro"); }
  };

  if (loading && !camp) {
    return <Card className="p-6 text-sm text-muted-foreground">Carregando...</Card>;
  }
  if (!camp) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        Campanha não encontrada.
        <div className="mt-3">
          <Button asChild variant="outline" size="sm">
            <Link to="/app/whatsapp-bulk/campanhas"><ArrowLeft className="mr-1 h-3.5 w-3.5" /> Voltar</Link>
          </Button>
        </div>
      </Card>
    );
  }

  const st = STATUS_CAMP[camp.status] ?? STATUS_CAMP.rascunho;
  const total = camp.total_destinatarios || 1;
  const pct = Math.min(100, Math.round((camp.total_enviados / total) * 100));
  const pendentes = contagem.pendente ?? 0;
  const enviando = contagem.enviando ?? 0;
  const enviados = (contagem.enviado ?? 0) + (contagem.entregue ?? 0) + (contagem.lido ?? 0);
  const entregues = (contagem.entregue ?? 0) + (contagem.lido ?? 0);
  const lidos = contagem.lido ?? 0;
  const erros = contagem.erro ?? 0;
  const optout = contagem.optout ?? 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/app/whatsapp-bulk/campanhas"><ArrowLeft className="mr-1 h-3.5 w-3.5" /> Voltar</Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{camp.nome}</h1>
              <Badge variant={st.variant}>{st.label}</Badge>
              {camp.pausada && <Badge variant="outline" className="text-amber-600">Pausada</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              Criada em {new Date(camp.created_at).toLocaleString()}
              {camp.iniciado_em && ` · Iniciada: ${new Date(camp.iniciado_em).toLocaleString()}`}
              {camp.concluido_em && ` · Concluída: ${new Date(camp.concluido_em).toLocaleString()}`}
              {camp.agendado_para && ` · Agendada: ${new Date(camp.agendado_para).toLocaleString()}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(camp.status === "rascunho" || camp.status === "agendada" || camp.status === "pausada") && !camp.pausada && (
            <Button size="sm" onClick={() => acaoStatus("em_andamento")}>
              <Play className="mr-1 h-3.5 w-3.5" /> Iniciar
            </Button>
          )}
          {camp.status !== "concluida" && camp.status !== "cancelada" && (
            <Button size="sm" variant="outline" onClick={togglePausa}>
              {camp.pausada ? <><Play className="mr-1 h-3.5 w-3.5" /> Retomar</> : <><Pause className="mr-1 h-3.5 w-3.5" /> Pausar</>}
            </Button>
          )}
          {erros > 0 && (
            <Button size="sm" variant="outline" onClick={retentarTodosErros}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reenviar erros ({erros})
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={dispararWorker}>
            <Send className="mr-1 h-3.5 w-3.5" /> Disparar agora
          </Button>
          <Button size="sm" variant="ghost" onClick={carregar}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Atualizar
          </Button>
          {camp.status !== "concluida" && camp.status !== "cancelada" && (
            <Button size="sm" variant="ghost" onClick={() => acaoStatus("cancelada")}>
              <X className="mr-1 h-3.5 w-3.5" /> Cancelar
            </Button>
          )}
        </div>
      </div>

      {/* Progresso */}
      <Card className="p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progresso geral</span>
          <span className="font-medium">{pct}% · {camp.total_enviados.toLocaleString()} de {camp.total_destinatarios.toLocaleString()}</span>
        </div>
        <Progress value={pct} className="mt-2 h-2" />
        <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
          <KPI icon={<Clock className="h-4 w-4 text-muted-foreground" />} label="Pendentes" value={pendentes} />
          <KPI icon={<Send className="h-4 w-4 text-blue-600" />} label="Enviando" value={enviando} />
          <KPI icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Enviados" value={enviados} />
          <KPI icon={<CheckCircle2 className="h-4 w-4 text-emerald-700" />} label="Entregues" value={entregues} />
          <KPI icon={<Eye className="h-4 w-4 text-emerald-700" />} label="Lidos" value={lidos} />
          <KPI icon={<AlertCircle className="h-4 w-4 text-destructive" />} label="Erros" value={erros} tone="destructive" />
          <KPI icon={<Ban className="h-4 w-4 text-amber-600" />} label="Opt-out" value={optout} tone="warn" />
        </div>
      </Card>

      {/* Filtros + lista */}
      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Destinatários</h2>
            <Badge variant="secondary">{itensFiltrados.length}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar nome ou telefone"
                className="h-8 w-56 pl-7"
              />
            </div>
            <Select value={filtroStatus || "__all"} onValueChange={(v) => setFiltroStatus(v === "__all" ? "" : v)}>
              <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="enviando">Enviando</SelectItem>
                <SelectItem value="enviado">Enviados</SelectItem>
                <SelectItem value="entregue">Entregues</SelectItem>
                <SelectItem value="lido">Lidos</SelectItem>
                <SelectItem value="erro">Erros</SelectItem>
                <SelectItem value="optout">Opt-out</SelectItem>
                <SelectItem value="cancelado">Cancelados</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              Auto-refresh
            </label>
          </div>
        </div>

        {itensFiltrados.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum destinatário {filtroStatus ? `com status "${filtroStatus}"` : ""}.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-2 py-1.5 text-left">Telefone</th>
                  <th className="px-2 py-1.5 text-left">Nome</th>
                  <th className="px-2 py-1.5 text-left">Status</th>
                  <th className="px-2 py-1.5 text-center">Tent.</th>
                  <th className="px-2 py-1.5 text-left">Enviado em</th>
                  <th className="px-2 py-1.5 text-left">Erro</th>
                  <th className="px-2 py-1.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {itensFiltrados.map((i) => {
                  const stI = STATUS_ITEM[i.status] ?? { label: i.status, cls: "" };
                  return (
                    <tr key={i.id} className="border-t">
                      <td className="px-2 py-1.5 font-mono">{i.destinatario_telefone}</td>
                      <td className="px-2 py-1.5">{i.destinatario_nome ?? "—"}</td>
                      <td className={`px-2 py-1.5 font-medium ${stI.cls}`}>{stI.label}</td>
                      <td className="px-2 py-1.5 text-center text-muted-foreground">{i.tentativas}/{i.max_tentativas}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">
                        {i.enviado_em ? new Date(i.enviado_em).toLocaleString() : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-destructive">
                        {i.erro_mensagem ? (
                          <span title={i.erro_mensagem}>
                            {i.erro_mensagem.length > 60 ? `${i.erro_mensagem.slice(0, 60)}…` : i.erro_mensagem}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {i.status === "erro" && (
                          <Button size="sm" variant="ghost" onClick={() => retentarItem(i.id)}>
                            <RotateCcw className="mr-1 h-3 w-3" /> Tentar
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {itens.length >= 500 && (
              <p className="border-t bg-muted/30 px-2 py-1 text-center text-xs text-muted-foreground">
                Exibindo 500 itens mais recentes — refine o filtro para ver outros.
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Analytics da campanha */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Análise da campanha</h2>
          </div>
          <Button size="sm" variant="ghost" onClick={carregarAnalytics} disabled={loadingAnalytics}>
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loadingAnalytics ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>

        {!analytics ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {loadingAnalytics ? "Carregando análise…" : "Sem dados disponíveis."}
          </p>
        ) : (
          <div className="space-y-4">
            {/* Tempos médios */}
            <div className="grid gap-3 sm:grid-cols-3">
              <TempoCard label="Tempo médio até envio" segundos={analytics.tempos.mediaEnvioSeg} />
              <TempoCard label="Tempo médio até entrega" segundos={analytics.tempos.mediaEntregaSeg} />
              <TempoCard label="Tempo médio até leitura" segundos={analytics.tempos.mediaLeituraSeg} />
            </div>

            {/* Timeline por hora (últimas 24h) */}
            {analytics.timelineHora.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium text-muted-foreground">Linha do tempo (últimas 24h por hora)</h3>
                <div className="h-56">
                  <ResponsiveContainer>
                    <AreaChart data={analytics.timelineHora}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="hora" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="enviados" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.3)" />
                      <Area type="monotone" dataKey="entregues" stroke="hsl(142 76% 36%)" fill="hsl(142 76% 36% / 0.3)" />
                      <Area type="monotone" dataKey="lidos" stroke="hsl(217 91% 60%)" fill="hsl(217 91% 60% / 0.3)" />
                      <Area type="monotone" dataKey="erros" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.3)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Distribuição por hora do dia */}
              <div>
                <h3 className="mb-2 text-xs font-medium text-muted-foreground">Envios por hora do dia</h3>
                <div className="h-52">
                  <ResponsiveContainer>
                    <BarChart data={analytics.distribuicaoHoraDia}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="hora" tick={{ fontSize: 11 }} tickFormatter={(h) => `${h}h`} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip labelFormatter={(h) => `${h}h`} />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Por API */}
              <div>
                <h3 className="mb-2 text-xs font-medium text-muted-foreground">Por API</h3>
                {analytics.porApi.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">Nenhum envio realizado ainda.</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-2 py-1.5 text-left">API</th>
                          <th className="px-2 py-1.5 text-right">Enviados</th>
                          <th className="px-2 py-1.5 text-right">Erros</th>
                          <th className="px-2 py-1.5 text-right">Taxa erro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.porApi.map((a) => {
                          const taxa = a.enviados > 0 ? ((a.erros / a.enviados) * 100).toFixed(1) : "0.0";
                          return (
                            <tr key={a.api_id} className="border-t">
                              <td className="px-2 py-1.5 font-medium">{a.nome}</td>
                              <td className="px-2 py-1.5 text-right">{a.enviados}</td>
                              <td className="px-2 py-1.5 text-right text-destructive">{a.erros}</td>
                              <td className="px-2 py-1.5 text-right">{taxa}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Top erros */}
            {analytics.errosTop.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium text-muted-foreground">Principais erros</h3>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-2 py-1.5 text-left">Mensagem</th>
                        <th className="px-2 py-1.5 text-right">Ocorrências</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.errosTop.map((e, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-2 py-1.5 text-destructive">{e.mensagem}</td>
                          <td className="px-2 py-1.5 text-right font-medium">{e.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function KPI({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: "destructive" | "warn" }) {
  const cls = tone === "destructive" ? "text-destructive" : tone === "warn" ? "text-amber-600" : "text-foreground";
  return (
    <div className="rounded-md border p-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}<span>{label}</span></div>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${cls}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function TempoCard({ label, segundos }: { label: string; segundos: number | null }) {
  const formatar = (s: number | null) => {
    if (s == null) return "—";
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
  };
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{formatar(segundos)}</p>
    </div>
  );
}