import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  BarChart, Bar,
} from "recharts";
import { Download, FileSpreadsheet, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { waBulkService, downloadCsv } from "../services/waBulkService";

type Periodo = "7" | "15" | "30" | "90";

export default function WaBulkRelatorios() {
  const [periodo, setPeriodo] = useState<Periodo>("7");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof waBulkService.metricasPeriodo>> | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const r = await waBulkService.metricasPeriodo(parseInt(periodo, 10));
      setData(r);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao carregar relatórios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [periodo]);

  const exportar = async (tipo: "campanhas" | "fila") => {
    setExporting(tipo);
    try {
      const csv = tipo === "campanhas"
        ? await waBulkService.exportCampanhasCsv()
        : await waBulkService.exportFilaCsv();
      if (!csv) { toast.error("Sem dados para exportar"); return; }
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`wa-bulk-${tipo}-${stamp}.csv`, csv);
      toast.success("Arquivo gerado");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao exportar");
    } finally {
      setExporting(null);
    }
  };

  const totais = data?.totais;
  const taxaEntrega = totais && totais.enviados > 0
    ? ((totais.entregues / totais.enviados) * 100).toFixed(1) : "0.0";
  const taxaLeitura = totais && totais.entregues > 0
    ? ((totais.lidos / totais.entregues) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Relatórios</h2>
          <p className="text-sm text-muted-foreground">Métricas, taxas e exportações.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="15">Últimos 15 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportar("campanhas")} disabled={exporting === "campanhas"}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> {exporting === "campanhas" ? "Gerando..." : "Exportar campanhas"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportar("fila")} disabled={exporting === "fila"}>
            <Download className="mr-2 h-4 w-4" /> {exporting === "fila" ? "Gerando..." : "Exportar fila"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Enviados" value={totais?.enviados ?? 0} />
        <Kpi label="Entregues" value={totais?.entregues ?? 0} subtitle={`${taxaEntrega}%`} />
        <Kpi label="Lidos" value={totais?.lidos ?? 0} subtitle={`${taxaLeitura}%`} />
        <Kpi label="Erros" value={totais?.erros ?? 0} className="text-destructive" />
        <Kpi label="Custo total" value={`R$ ${(totais?.custo ?? 0).toFixed(2)}`} />
      </div>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Envios diários</h3>
        <div className="h-72">
          <ResponsiveContainer>
            <AreaChart data={data?.serie ?? []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="data" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="enviados" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.3)" />
              <Area type="monotone" dataKey="entregues" stackId="2" stroke="hsl(var(--chart-2, 142 76% 36%))" fill="hsl(var(--chart-2, 142 76% 36%) / 0.3)" />
              <Area type="monotone" dataKey="erros" stackId="3" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.3)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Custo por dia (R$)</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data?.serie ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="data" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => `R$ ${Number(v).toFixed(2)}`} />
                <Bar dataKey="custo" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Distribuição por API</h3>
          {(data?.porApi.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem dados no período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2">API</th>
                    <th className="py-2 text-right">Enviados</th>
                    <th className="py-2 text-right">Entregues</th>
                    <th className="py-2 text-right">Erros</th>
                    <th className="py-2 text-right">Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.porApi.map((a) => (
                    <tr key={a.api_id} className="border-b last:border-0">
                      <td className="py-2 font-medium">{a.nome}</td>
                      <td className="py-2 text-right">{a.enviados}</td>
                      <td className="py-2 text-right">{a.entregues}</td>
                      <td className="py-2 text-right text-destructive">{a.erros}</td>
                      <td className="py-2 text-right">R$ {a.custo.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, subtitle, className }: { label: string; value: string | number; subtitle?: string; className?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${className ?? ""}`}>{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </Card>
  );
}