import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, Legend,
} from "recharts";
import { Star, Megaphone, Users, TrendingUp, LinkIcon } from "lucide-react";
import { hierarquiaDashboardService } from "../services/hierarquiaDashboardService";

function Stat({ label, value, icon: Icon }: { label: string; value: number | string; icon: any }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HierarquiaDashboard() {
  const [liderancaSel, setLiderancaSel] = useState<string>("todas");

  const { data: resumo } = useQuery({
    queryKey: ["hier-resumo"],
    queryFn: () => hierarquiaDashboardService.resumoGeral(),
  });
  const { data: porLideranca = [] } = useQuery({
    queryKey: ["hier-lid"],
    queryFn: () => hierarquiaDashboardService.statsPorLideranca(),
  });
  const { data: porCabo = [] } = useQuery({
    queryKey: ["hier-cabo", liderancaSel],
    queryFn: () => hierarquiaDashboardService.statsPorCabo(
      liderancaSel !== "todas" ? liderancaSel : undefined,
    ),
  });
  const { data: serie = [] } = useQuery({
    queryKey: ["hier-serie", liderancaSel],
    queryFn: () => hierarquiaDashboardService.serieCadastros30d(
      liderancaSel !== "todas" ? { liderancaId: liderancaSel } : undefined,
    ),
  });

  const topCabos = useMemo(
    () => [...porCabo].sort((a, b) => b.total_eleitores - a.total_eleitores).slice(0, 10),
    [porCabo],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Hierárquico</h1>
          <p className="text-sm text-muted-foreground">
            Visão consolidada por Liderança e Cabo Eleitoral
          </p>
        </div>
        <div className="w-full sm:w-72">
          <Select value={liderancaSel} onValueChange={setLiderancaSel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as lideranças</SelectItem>
              {porLideranca.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Lideranças" value={resumo?.totalLiderancas ?? 0} icon={Star} />
        <Stat label="Cabos" value={resumo?.totalCabos ?? 0} icon={Megaphone} />
        <Stat label="Eleitores na hierarquia" value={resumo?.totalEleitoresHierarquia ?? 0} icon={Users} />
        <Stat label="Cadastros (30d)" value={resumo?.cadastros30d ?? 0} icon={TrendingUp} />
        <Stat label="Via Links/QR" value={resumo?.totalCaptacaoLinks ?? 0} icon={LinkIcon} />
      </div>

      <Card>
        <CardHeader><CardTitle>Cadastros nos últimos 30 dias</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={serie}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="cadastros" stroke="hsl(var(--primary))" fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Lideranças</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[480px] overflow-auto">
              {porLideranca.length === 0 && (
                <p className="p-6 text-sm text-muted-foreground">Nenhuma liderança cadastrada.</p>
              )}
              {porLideranca.map((l) => (
                <div key={l.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{l.nome}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {l.regiao || "—"} · <Badge variant="secondary" className="ml-1">{l.status}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-4 text-right shrink-0 text-sm">
                    <div><div className="font-semibold">{l.total_cabos}</div><div className="text-[10px] text-muted-foreground">cabos</div></div>
                    <div><div className="font-semibold">{l.total_eleitores}</div><div className="text-[10px] text-muted-foreground">eleitores</div></div>
                    <div><div className="font-semibold text-primary">+{l.cadastros_30d}</div><div className="text-[10px] text-muted-foreground">30d</div></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top 10 Cabos por eleitores</CardTitle></CardHeader>
          <CardContent className="h-[480px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCabos} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total_eleitores" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Cabos detalhados</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Cabo</th>
                  <th className="px-3 py-2 text-left">Liderança</th>
                  <th className="px-3 py-2 text-left">Zona</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right">30d</th>
                  <th className="px-3 py-2 text-right">Link</th>
                  <th className="px-3 py-2 text-right">QR</th>
                  <th className="px-3 py-2 text-right">Manual</th>
                </tr>
              </thead>
              <tbody>
                {porCabo.length === 0 && (
                  <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Nenhum cabo encontrado.</td></tr>
                )}
                {porCabo.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{c.nome}</td>
                    <td className="px-3 py-2 text-muted-foreground">{c.lideranca_nome ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{c.zona ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-semibold">{c.total_eleitores}</td>
                    <td className="px-3 py-2 text-right text-primary">+{c.cadastros_30d}</td>
                    <td className="px-3 py-2 text-right">{c.via_link}</td>
                    <td className="px-3 py-2 text-right">{c.via_qrcode}</td>
                    <td className="px-3 py-2 text-right">{c.manual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}