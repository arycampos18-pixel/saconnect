import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "../components/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Activity, DollarSign, CheckCircle2, AlertCircle } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { analiseService } from "../services/analiseService";
import { LimiteProvedorCard } from "../components/LimiteProvedorCard";

const fmtBRL = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Mascara qualquer referência ao hostname do provedor externo. */
const mascarar = (v?: string | null): string => {
  if (!v) return "—";
  return v
    .replace(/api\.assertivasolucoes\.com\.br/gi, "SA Connect")
    .replace(/assertivasolucoes\.com\.br/gi, "SA Connect")
    .replace(/assertivasolucoes/gi, "SA Connect")
    .replace(/provedor-cadastral/gi, "SA Connect");
};

const labelProvedor = (p?: string | null): string => {
  if (!p) return "—";
  const lc = p.toLowerCase();
  if (
    lc === "assertiva" ||
    lc === "mock" ||
    lc.includes("assertivasolucoes") ||
    lc.includes("provedor-cadastral") ||
    lc.includes("sa connect")
  ) return "SA Connect";
  return mascarar(p);
};

const sanitizarEndpoint = (ep?: string | null): string => mascarar(ep);

export default function AnaliseConsultasApi() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["analise-consultas-api", "consumo"],
    queryFn: () => analiseService.listarConsultasApi(1000),
    staleTime: 0,
    refetchOnMount: true,
  });

  const [provedorFiltro, setProvedorFiltro] = useState<string>("todos");
  const [periodo, setPeriodo] = useState<string>("mes");

  const provedores = useMemo(() => {
    const set = new Set<string>();
    (data as any[]).forEach((c) => c.provedor && set.add(c.provedor));
    return Array.from(set).sort();
  }, [data]);

  const filtradas = useMemo(() => {
    const agora = new Date();
    const limite = new Date(agora);
    if (periodo === "mes") limite.setDate(1);
    else if (periodo === "30d") limite.setDate(agora.getDate() - 30);
    else if (periodo === "7d") limite.setDate(agora.getDate() - 7);
    else limite.setFullYear(2000);
    return (data as any[]).filter((c) => {
      if (provedorFiltro !== "todos" && c.provedor !== provedorFiltro) return false;
      return new Date(c.created_at) >= limite;
    });
  }, [data, provedorFiltro, periodo]);

  const kpis = useMemo(() => {
    const total = filtradas.length;
    const custo = filtradas.reduce((acc, c) => acc + (c.custo_centavos ?? 0), 0);
    const sucesso = filtradas.filter((c) => c.status === "sucesso").length;
    const erros = total - sucesso;
    return { total, custo, sucesso, erros };
  }, [filtradas]);

  const porDia = useMemo(() => {
    const map = new Map<string, { dia: string; consultas: number; custo: number }>();
    filtradas.forEach((c) => {
      const d = new Date(c.created_at).toISOString().slice(0, 10);
      const cur = map.get(d) ?? { dia: d.slice(5), consultas: 0, custo: 0 };
      cur.consultas += 1;
      cur.custo += (c.custo_centavos ?? 0) / 100;
      map.set(d, cur);
    });
    return Array.from(map.values()).sort((a, b) => a.dia.localeCompare(b.dia));
  }, [filtradas]);

  const exportarCsv = () => {
    const linhas = [
      ["Data", "Provedor", "Endpoint", "Status", "HTTP", "Duração (ms)", "Custo (R$)"].join(";"),
      ...filtradas.map((c) =>
        [
          new Date(c.created_at).toLocaleString("pt-BR"),
          labelProvedor(c.provedor),
          sanitizarEndpoint(c.endpoint),
          c.status,
          c.http_status ?? "",
          c.duracao_ms ?? "",
          ((c.custo_centavos ?? 0) / 100).toFixed(2).replace(".", ","),
        ].join(";"),
      ),
    ].join("\n");
    const blob = new Blob([linhas], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `consumo-apis-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageShell
      title="Consumo de APIs"
      description="Histórico de chamadas, custo por consulta e total gasto com provedores externos (SA Connect Data)."
      actions={
        <Button variant="outline" onClick={exportarCsv} disabled={filtradas.length === 0}>
          <Download className="h-4 w-4 mr-2" /> Exportar CSV
        </Button>
      }
    >
      <LimiteProvedorCard provedor="assertiva" />

      <div className="grid gap-3 md:grid-cols-4 sm:grid-cols-2">
        <Kpi icon={<Activity className="h-4 w-4" />} label="Consultas" value={kpis.total.toLocaleString("pt-BR")} />
        <Kpi icon={<DollarSign className="h-4 w-4" />} label="Custo total" value={fmtBRL(kpis.custo)} highlight />
        <Kpi icon={<CheckCircle2 className="h-4 w-4" />} label="Sucesso" value={kpis.sucesso.toLocaleString("pt-BR")} />
        <Kpi icon={<AlertCircle className="h-4 w-4" />} label="Erros" value={kpis.erros.toLocaleString("pt-BR")} />
      </div>

      <Card>
        <CardContent className="p-3 grid gap-2 md:grid-cols-3 sm:grid-cols-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="mes">Mês atual</SelectItem>
              <SelectItem value="todos">Todo o período</SelectItem>
            </SelectContent>
          </Select>
          <Select value={provedorFiltro} onValueChange={setProvedorFiltro}>
            <SelectTrigger><SelectValue placeholder="Provedor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os provedores</SelectItem>
              {provedores.map((p) => <SelectItem key={p} value={p}>{labelProvedor(p)}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Consultas por dia</CardTitle></CardHeader>
        <CardContent className="h-64">
          {porDia.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem dados no período.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porDia}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="dia" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip
                  formatter={(v: any, k: string) =>
                    k === "custo" ? [fmtBRL(Number(v) * 100), "Custo"] : [v, "Consultas"]
                  }
                />
                <Bar dataKey="consultas" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Detalhamento</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-auto">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : filtradas.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma consulta no período.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Provedor</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Duração</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.slice(0, 200).map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(c.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-xs">{labelProvedor(c.provedor)}</TableCell>
                    <TableCell className="text-xs">{sanitizarEndpoint(c.endpoint)}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "sucesso" ? "default" : "destructive"}>
                        {c.status}{c.http_status ? ` · ${c.http_status}` : ""}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs">{c.duracao_ms ?? "—"} ms</TableCell>
                    <TableCell className="text-right text-xs font-medium">
                      {fmtBRL(c.custo_centavos ?? 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {filtradas.length > 200 && (
            <div className="px-4 py-2 text-xs text-muted-foreground border-t">
              Mostrando 200 de {filtradas.length}. Exporte o CSV para a lista completa.
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

function Kpi({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-primary/40" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon} {label}
        </div>
        <div className={`text-2xl font-semibold mt-1 ${highlight ? "text-primary" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
