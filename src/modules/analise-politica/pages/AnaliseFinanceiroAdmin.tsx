import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PageShell } from "../components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/modules/settings/contexts/CompanyContext";
import { analiseService } from "../services/analiseService";

const sb: any = supabase;
const fmtBRL = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#84cc16", "#64748b"];

type Preset = "hoje" | "7d" | "30d" | "mes" | "custom";

function rangeFor(preset: Preset, custom: { from: string; to: string }) {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
  if (preset === "hoje") return { from: startOfDay(now), to: endOfDay(now) };
  if (preset === "7d") {
    const f = new Date(now); f.setDate(f.getDate() - 6);
    return { from: startOfDay(f), to: endOfDay(now) };
  }
  if (preset === "30d") {
    const f = new Date(now); f.setDate(f.getDate() - 29);
    return { from: startOfDay(f), to: endOfDay(now) };
  }
  if (preset === "mes") {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
  }
  return {
    from: custom.from ? new Date(custom.from + "T00:00:00") : startOfDay(now),
    to: custom.to ? new Date(custom.to + "T23:59:59") : endOfDay(now),
  };
}

export default function AnaliseFinanceiroAdmin() {
  const { isSuperAdmin, loading } = useCompany();

  const [preset, setPreset] = useState<Preset>("30d");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [filtros, setFiltros] = useState<{ api_nome: string | null; lideranca_id: string | null; user_id: string | null }>({
    api_nome: null, lideranca_id: null, user_id: null,
  });

  const { from, to } = useMemo(() => rangeFor(preset, custom), [preset, custom]);

  const { data: cfgs = [] } = useQuery({
    queryKey: ["api-cfg-custo-fin"],
    queryFn: () => analiseService.listarConfiguracoesCusto(),
    enabled: isSuperAdmin,
  });

  const { data: liderancas = [] } = useQuery({
    queryKey: ["liderancas-fin"],
    queryFn: () => analiseService.listarLiderancas(),
    enabled: isSuperAdmin,
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios-fin"],
    queryFn: async () => {
      const { data } = await sb.from("settings_users").select("id,nome,email").order("nome");
      return data ?? [];
    },
    enabled: isSuperAdmin,
  });

  const { data: rows = [] } = useQuery({
    queryKey: ["fin-consultas", from.toISOString(), to.toISOString(), filtros],
    enabled: isSuperAdmin,
    queryFn: async () => {
      let q = sb.from("api_consultas_custos").select("*")
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString())
        .order("created_at", { ascending: false })
        .limit(5000);
      if (filtros.api_nome) q = q.eq("api_nome", filtros.api_nome);
      if (filtros.lideranca_id) q = q.eq("lideranca_id", filtros.lideranca_id);
      if (filtros.user_id) q = q.eq("user_id", filtros.user_id);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: validados } = useQuery({
    queryKey: ["fin-validados", from.toISOString(), to.toISOString()],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const { count } = await sb.from("eleitores")
        .select("id", { count: "exact", head: true })
        .eq("status_validacao_eleitoral", "validado")
        .gte("validado_em", from.toISOString())
        .lte("validado_em", to.toISOString());
      return count ?? 0;
    },
  });

  const userMap = useMemo(() => {
    const m = new Map<string, string>();
    (usuarios as any[]).forEach((u) => m.set(u.id, u.nome || u.email));
    return m;
  }, [usuarios]);
  const lidMap = useMemo(() => {
    const m = new Map<string, string>();
    (liderancas as any[]).forEach((l) => m.set(l.id, l.nome));
    return m;
  }, [liderancas]);

  const stats = useMemo(() => {
    let total = 0, erros = 0;
    const byApi = new Map<string, number>();
    const byLid = new Map<string, number>();
    const byUser = new Map<string, number>();
    for (const r of rows as any[]) {
      total += r.custo_total_centavos ?? 0;
      if (r.status === "erro") erros++;
      byApi.set(r.api_nome, (byApi.get(r.api_nome) ?? 0) + (r.custo_total_centavos ?? 0));
      const lkey = r.lideranca_id ? (lidMap.get(r.lideranca_id) ?? r.lideranca_id.slice(0, 8)) : "Sem liderança";
      byLid.set(lkey, (byLid.get(lkey) ?? 0) + (r.custo_total_centavos ?? 0));
      const ukey = r.user_id ? (userMap.get(r.user_id) ?? r.user_id.slice(0, 8)) : "Sem usuário";
      byUser.set(ukey, (byUser.get(ukey) ?? 0) + (r.custo_total_centavos ?? 0));
    }
    const toArr = (m: Map<string, number>) =>
      Array.from(m.entries()).map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    return {
      total, erros, totalConsultas: rows.length,
      byApi: toArr(byApi), byLid: toArr(byLid).slice(0, 10), byUser: toArr(byUser).slice(0, 10),
    };
  }, [rows, lidMap, userMap]);

  const mediaPorEleitor = validados && validados > 0 ? Math.round(stats.total / validados) : 0;

  if (loading) return <PageShell title="Financeiro"><div className="text-sm text-muted-foreground">Carregando…</div></PageShell>;
  if (!isSuperAdmin) return <Navigate to="/app" replace />;

  const cards = [
    { label: "Total gasto", value: fmtBRL(stats.total) },
    { label: "Total de consultas", value: stats.totalConsultas },
    { label: "Consultas com erro", value: stats.erros },
    { label: "Custo médio por validado", value: fmtBRL(mediaPorEleitor) },
  ];

  return (
    <PageShell
      title="Financeiro Super Admin"
      description="Custos consolidados das APIs por API, liderança e usuário (acesso restrito)."
    >
      <Card>
        <CardHeader><CardTitle className="text-base">Período</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <ToggleGroup type="single" value={preset} onValueChange={(v) => v && setPreset(v as Preset)}>
            <ToggleGroupItem value="hoje">Hoje</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 dias</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 dias</ToggleGroupItem>
            <ToggleGroupItem value="mes">Mês atual</ToggleGroupItem>
            <ToggleGroupItem value="custom">Personalizado</ToggleGroupItem>
          </ToggleGroup>
          {preset === "custom" && (
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <div>
                <Label className="text-xs">De</Label>
                <Input type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Até</Label>
                <Input type="date" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
              </div>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label className="text-xs">API</Label>
              <Select value={filtros.api_nome ?? "__all"} onValueChange={(v) => setFiltros((p) => ({ ...p, api_nome: v === "__all" ? null : v }))}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Todas</SelectItem>
                  {(cfgs as any[]).map((c) => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Liderança</Label>
              <Select value={filtros.lideranca_id ?? "__all"} onValueChange={(v) => setFiltros((p) => ({ ...p, lideranca_id: v === "__all" ? null : v }))}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Todas</SelectItem>
                  {(liderancas as any[]).map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Usuário</Label>
              <Select value={filtros.user_id ?? "__all"} onValueChange={(v) => setFiltros((p) => ({ ...p, user_id: v === "__all" ? null : v }))}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Todos</SelectItem>
                  {(usuarios as any[]).map((u) => <SelectItem key={u.id} value={u.id}>{u.nome || u.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => {
              setPreset("30d"); setCustom({ from: "", to: "" });
              setFiltros({ api_nome: null, lideranca_id: null, user_id: null });
            }}>Limpar</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{c.label}</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-semibold">{c.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Custo por API</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={stats.byApi} dataKey="value" nameKey="name" outerRadius={100}
                  label={(d: any) => fmtBRL(d.value)}>
                  {stats.byApi.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top lideranças</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={stats.byLid}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tickFormatter={(v) => fmtBRL(Number(v))} />
                <Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Top usuários</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={stats.byUser}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tickFormatter={(v) => fmtBRL(Number(v))} />
                <Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
                <Bar dataKey="value" fill="hsl(var(--accent))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
