import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Inbox, Clock, CheckCircle2, MessageCircle, Users, Timer, TrendingUp, Download, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { atendimentoService } from "../services/atendimentoService";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { toast } from "sonner";

const STATUS_CORES: Record<string, string> = {
  "Pendente": "hsl(var(--chart-3, 38 92% 50%))",
  "Em atendimento": "hsl(var(--chart-1, 221 83% 53%))",
  "Atendido": "hsl(var(--chart-2, 142 71% 45%))",
};

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function fmtDur(min: number) {
  if (!isFinite(min) || min <= 0) return "—";
  if (min < 60) return `${Math.round(min)}m`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${m}m`;
}

export default function Relatorios() {
  const hoje = new Date();
  const inicial = new Date(); inicial.setDate(hoje.getDate() - 29);
  const [from, setFrom] = useState<string>(toISODate(inicial));
  const [to, setTo] = useState<string>(toISODate(hoje));
  const [deptoFiltro, setDeptoFiltro] = useState<string>("todos");
  const [atendenteFiltro, setAtendenteFiltro] = useState<string>("todos");

  const { data: deptos = [] } = useQuery({
    queryKey: ["rel-departamentos"],
    queryFn: () => atendimentoService.listarDepartamentos(),
  });
  const { data: atendentes = [] } = useQuery({
    queryKey: ["rel-atendentes"],
    queryFn: () => atendimentoService.listarAtendentes(),
  });

  const { data: conversas = [], isLoading } = useQuery({
    queryKey: ["rel-conversas", from, to, deptoFiltro, atendenteFiltro],
    queryFn: async () => {
      const fromDt = new Date(from + "T00:00:00").toISOString();
      const toDt = new Date(to + "T23:59:59").toISOString();
      let q = supabase
        .from("whatsapp_conversas")
        .select("id,status,departamento_id,atendente_id,created_at,assumida_em,finalizada_em,primeira_resposta_em,sla_primeira_resposta_violado,sla_resolucao_violado,tags")
        .gte("created_at", fromDt)
        .lte("created_at", toDt)
        .limit(5000);
      if (deptoFiltro !== "todos") q = q.eq("departamento_id", deptoFiltro);
      if (atendenteFiltro !== "todos") q = q.eq("atendente_id", atendenteFiltro);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: mensagens = [] } = useQuery({
    queryKey: ["rel-mensagens", from, to],
    queryFn: async () => {
      const fromDt = new Date(from + "T00:00:00").toISOString();
      const toDt = new Date(to + "T23:59:59").toISOString();
      const { data, error } = await supabase
        .from("whatsapp_mensagens")
        .select("direcao,created_at,enviado_por")
        .gte("created_at", fromDt)
        .lte("created_at", toDt)
        .limit(10000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const total = conversas.length;
    const pend = conversas.filter((c: any) => c.status === "Pendente").length;
    const emAt = conversas.filter((c: any) => c.status === "Em atendimento").length;
    const fin = conversas.filter((c: any) => c.status === "Atendido").length;

    const respMins: number[] = [];
    const resolMins: number[] = [];
    let slaResp = 0, slaRes = 0;
    conversas.forEach((c: any) => {
      if (c.created_at && c.primeira_resposta_em) {
        respMins.push((new Date(c.primeira_resposta_em).getTime() - new Date(c.created_at).getTime()) / 60000);
      }
      if (c.created_at && c.finalizada_em) {
        resolMins.push((new Date(c.finalizada_em).getTime() - new Date(c.created_at).getTime()) / 60000);
      }
      if (c.sla_primeira_resposta_violado) slaResp++;
      if (c.sla_resolucao_violado) slaRes++;
    });
    const avg = (a: number[]) => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;

    const entradas = mensagens.filter((m: any) => m.direcao === "entrada").length;
    const saidas = mensagens.filter((m: any) => m.direcao === "saida").length;

    return {
      total, pend, emAt, fin,
      tmr: avg(respMins),
      tme: avg(resolMins),
      slaResp, slaRes,
      entradas, saidas,
      taxaResolucao: total ? (fin / total) * 100 : 0,
    };
  }, [conversas, mensagens]);

  const serieDiaria = useMemo(() => {
    const map = new Map<string, { dia: string; novas: number; finalizadas: number; entradas: number; saidas: number }>();
    const start = new Date(from); const end = new Date(to);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const k = toISODate(d);
      map.set(k, { dia: k.slice(5), novas: 0, finalizadas: 0, entradas: 0, saidas: 0 });
    }
    conversas.forEach((c: any) => {
      const k = c.created_at?.slice(0, 10);
      const r = map.get(k); if (r) r.novas++;
      if (c.finalizada_em) {
        const kf = c.finalizada_em.slice(0, 10);
        const rf = map.get(kf); if (rf) rf.finalizadas++;
      }
    });
    mensagens.forEach((m: any) => {
      const k = m.created_at?.slice(0, 10);
      const r = map.get(k); if (!r) return;
      if (m.direcao === "entrada") r.entradas++; else r.saidas++;
    });
    return Array.from(map.values());
  }, [conversas, mensagens, from, to]);

  const porDepto = useMemo(() => {
    const map = new Map<string, number>();
    conversas.forEach((c: any) => {
      const k = c.departamento_id ?? "sem";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([k, v]) => ({
      nome: k === "sem" ? "Sem depto" : (deptos.find((d) => d.id === k)?.nome ?? "—"),
      total: v,
      cor: k === "sem" ? "#94a3b8" : (deptos.find((d) => d.id === k)?.cor ?? "#2563EB"),
    })).sort((a, b) => b.total - a.total);
  }, [conversas, deptos]);

  const porStatus = useMemo(() => ([
    { nome: "Pendente", total: stats.pend, cor: STATUS_CORES["Pendente"] },
    { nome: "Em atendimento", total: stats.emAt, cor: STATUS_CORES["Em atendimento"] },
    { nome: "Atendido", total: stats.fin, cor: STATUS_CORES["Atendido"] },
  ]), [stats]);

  const rankingAtendentes = useMemo(() => {
    const map = new Map<string, { atendidas: number; respMins: number[]; resolMins: number[] }>();
    conversas.forEach((c: any) => {
      if (!c.atendente_id) return;
      const r = map.get(c.atendente_id) ?? { atendidas: 0, respMins: [], resolMins: [] };
      if (c.status === "Atendido") r.atendidas++;
      if (c.created_at && c.primeira_resposta_em) {
        r.respMins.push((new Date(c.primeira_resposta_em).getTime() - new Date(c.created_at).getTime()) / 60000);
      }
      if (c.created_at && c.finalizada_em) {
        r.resolMins.push((new Date(c.finalizada_em).getTime() - new Date(c.created_at).getTime()) / 60000);
      }
      map.set(c.atendente_id, r);
    });
    return Array.from(map.entries()).map(([uid, r]) => {
      const at = (atendentes as any[]).find((a) => a.user_id === uid);
      const mensagensAt = mensagens.filter((m: any) => m.enviado_por === uid && m.direcao === "saida").length;
      const avg = (a: number[]) => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
      return {
        nome: at?.nome ?? at?.email ?? "—",
        atendidas: r.atendidas,
        mensagens: mensagensAt,
        tmr: avg(r.respMins),
        tme: avg(r.resolMins),
      };
    }).sort((a, b) => b.atendidas - a.atendidas);
  }, [conversas, atendentes, mensagens]);

  function exportarCSV() {
    const linhas = [
      ["Métrica", "Valor"],
      ["Período", `${from} a ${to}`],
      ["Total conversas", String(stats.total)],
      ["Pendentes", String(stats.pend)],
      ["Em atendimento", String(stats.emAt)],
      ["Atendidas", String(stats.fin)],
      ["Taxa resolução (%)", stats.taxaResolucao.toFixed(1)],
      ["TMR (min)", stats.tmr.toFixed(1)],
      ["TME (min)", stats.tme.toFixed(1)],
      ["SLA 1ª resposta violado", String(stats.slaResp)],
      ["SLA resolução violado", String(stats.slaRes)],
      ["Mensagens recebidas", String(stats.entradas)],
      ["Mensagens enviadas", String(stats.saidas)],
      [],
      ["Ranking atendentes"],
      ["Atendente", "Atendidas", "Mensagens", "TMR (min)", "TME (min)"],
      ...rankingAtendentes.map((r) => [r.nome, String(r.atendidas), String(r.mensagens), r.tmr.toFixed(1), r.tme.toFixed(1)]),
      [],
      ["Conversas por departamento"],
      ["Departamento", "Total"],
      ...porDepto.map((p) => [p.nome, String(p.total)]),
    ];
    const csv = linhas.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-atendimento-${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado");
  }

  function setPreset(dias: number) {
    const t = new Date();
    const f = new Date(); f.setDate(t.getDate() - (dias - 1));
    setFrom(toISODate(f)); setTo(toISODate(t));
  }

  return (
    <div className="container max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild size="icon" variant="ghost">
            <Link to="/app/atendimento"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Relatórios de Atendimento</h1>
            <p className="text-sm text-muted-foreground">Análise de volume, SLA, TMR e produtividade</p>
          </div>
        </div>
        <Button onClick={exportarCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-5">
          <div>
            <Label className="text-xs">De</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Até</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Departamento</Label>
            <Select value={deptoFiltro} onValueChange={setDeptoFiltro}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {deptos.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Atendente</Label>
            <Select value={atendenteFiltro} onValueChange={setAtendenteFiltro}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {(atendentes as any[]).map((a) => (
                  <SelectItem key={a.user_id} value={a.user_id}>{a.nome ?? a.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-1">
            <Button size="sm" variant="secondary" onClick={() => setPreset(7)}>7d</Button>
            <Button size="sm" variant="secondary" onClick={() => setPreset(30)}>30d</Button>
            <Button size="sm" variant="secondary" onClick={() => setPreset(90)}>90d</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="Total conversas" value={stats.total} icon={MessageCircle} accent="text-foreground" />
        <KPI label="Atendidas" value={stats.fin} icon={CheckCircle2} accent="text-green-600" hint={`${stats.taxaResolucao.toFixed(0)}% resolução`} />
        <KPI label="Pendentes" value={stats.pend} icon={Inbox} accent="text-amber-600" />
        <KPI label="Em atendimento" value={stats.emAt} icon={Clock} accent="text-blue-600" />
        <KPI label="TMR (1ª resposta)" value={fmtDur(stats.tmr)} icon={Timer} accent="text-primary" />
        <KPI label="TME (resolução)" value={fmtDur(stats.tme)} icon={TrendingUp} accent="text-primary" />
        <KPI label="SLA 1ª resp. violado" value={stats.slaResp} icon={AlertTriangle} accent="text-red-600" />
        <KPI label="Mensagens (in/out)" value={`${stats.entradas} / ${stats.saidas}`} icon={Users} accent="text-foreground" />
      </div>

      <Tabs defaultValue="volume" className="space-y-4">
        <TabsList>
          <TabsTrigger value="volume">Volume</TabsTrigger>
          <TabsTrigger value="distribuicao">Distribuição</TabsTrigger>
          <TabsTrigger value="atendentes">Atendentes</TabsTrigger>
        </TabsList>

        <TabsContent value="volume" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Conversas por dia</CardTitle></CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer>
                  <LineChart data={serieDiaria}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="dia" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="novas" stroke="hsl(var(--primary))" name="Novas" strokeWidth={2} />
                    <Line type="monotone" dataKey="finalizadas" stroke="#16a34a" name="Finalizadas" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Mensagens por dia</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={serieDiaria}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="dia" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="entradas" fill="#2563eb" name="Recebidas" />
                    <Bar dataKey="saidas" fill="#16a34a" name="Enviadas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribuicao" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Status</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={porStatus} dataKey="total" nameKey="nome" outerRadius={90} label>
                        {porStatus.map((p, i) => <Cell key={i} fill={p.cor} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Por departamento</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={porDepto} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" fontSize={12} />
                      <YAxis dataKey="nome" type="category" fontSize={12} width={110} />
                      <Tooltip />
                      <Bar dataKey="total">
                        {porDepto.map((p, i) => <Cell key={i} fill={p.cor} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="atendentes">
          <Card>
            <CardHeader><CardTitle className="text-base">Ranking de atendentes</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">Atendente</th>
                    <th className="px-4 py-2 text-right">Atendidas</th>
                    <th className="px-4 py-2 text-right">Mensagens</th>
                    <th className="px-4 py-2 text-right">TMR</th>
                    <th className="px-4 py-2 text-right">TME</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingAtendentes.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Sem dados no período</td></tr>
                  )}
                  {rankingAtendentes.map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-2 font-medium">{r.nome}</td>
                      <td className="px-4 py-2 text-right">{r.atendidas}</td>
                      <td className="px-4 py-2 text-right">{r.mensagens}</td>
                      <td className="px-4 py-2 text-right">{fmtDur(r.tmr)}</td>
                      <td className="px-4 py-2 text-right">{fmtDur(r.tme)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {isLoading && <p className="text-center text-sm text-muted-foreground">Carregando…</p>}
    </div>
  );
}

function KPI({ label, value, icon: Icon, accent, hint }: { label: string; value: number | string; icon: any; accent: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-lg bg-muted p-2 ${accent}`}><Icon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <div className="truncate text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}{hint && ` · ${hint}`}</div>
        </div>
      </CardContent>
    </Card>
  );
}