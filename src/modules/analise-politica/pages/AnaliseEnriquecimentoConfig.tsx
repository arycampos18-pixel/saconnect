import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "../components/PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LimiteProvedorCard } from "../components/LimiteProvedorCard";
import { analiseService } from "../services/analiseService";
import { Info, History } from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

const fmtBRL = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const nomeMes = (ym: string) => {
  const [a, m] = ym.split("-").map(Number);
  return new Date(a, (m ?? 1) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};

export default function AnaliseEnriquecimentoConfig() {
  const { data: consultas = [], isLoading } = useQuery({
    queryKey: ["analise-consultas-api", "historico-enriquecimento"],
    queryFn: () => analiseService.listarConsultasApi(1000),
  });

  const porMes = useMemo(() => {
    const map = new Map<string, { ym: string; consultas: number; custo: number; sucesso: number; erros: number }>();
    (consultas as any[])
      .filter((c) => (c.provedor ?? "").toLowerCase().includes("assertiva"))
      .forEach((c) => {
        const ym = new Date(c.created_at).toISOString().slice(0, 7);
        const cur = map.get(ym) ?? { ym, consultas: 0, custo: 0, sucesso: 0, erros: 0 };
        cur.consultas += 1;
        cur.custo += c.custo_centavos ?? 0;
        if (c.status === "sucesso") cur.sucesso += 1;
        else cur.erros += 1;
        map.set(ym, cur);
      });
    return Array.from(map.values()).sort((a, b) => b.ym.localeCompare(a.ym));
  }, [consultas]);

  const mesAtualYm = new Date().toISOString().slice(0, 7);

  const grafico = useMemo(
    () =>
      [...porMes]
        .sort((a, b) => a.ym.localeCompare(b.ym))
        .map((r) => ({
          mes: nomeMes(r.ym).replace(/ de /, "/"),
          consultas: r.consultas,
          custo: +(r.custo / 100).toFixed(2),
        })),
    [porMes],
  );

  return (
    <PageShell
      title="Orçamento & Consumo de Enriquecimento"
      description="Defina tetos para o enriquecimento automático de cadastros via APIs externas (SA Connect Data)."
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Como funciona
          </CardTitle>
          <CardDescription>
            Cada consulta à SA Connect Data custa <strong>R$ 0,59</strong>. Quando o eleitor é
            cadastrado ou editado sem CPF, data de nascimento, nome da mãe ou endereço,
            o sistema dispara automaticamente uma consulta para completar os dados.
            Se o telefone retornar um CPF sem endereço, uma 2ª consulta é feita
            (e contabilizada). Os limites abaixo bloqueiam novas consultas
            (manuais e automáticas) ao serem atingidos. Alertas em 80% e 100%.
          </CardDescription>
        </CardHeader>
      </Card>

      <LimiteProvedorCard provedor="assertiva" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Histórico mensal de consumo
          </CardTitle>
          <CardDescription>
            Total de consultas e gasto por mês na SA Connect Data. O mês corrente é destacado.
          </CardDescription>
        </CardHeader>
        {grafico.length > 0 && (
          <CardContent className="h-64 pb-6">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={grafico} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="mes" fontSize={11} />
                <YAxis yAxisId="left" fontSize={11} />
                <YAxis yAxisId="right" orientation="right" fontSize={11}
                  tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  formatter={(v: any, k: string) =>
                    k === "custo"
                      ? [`R$ ${Number(v).toFixed(2).replace(".", ",")}`, "Gasto"]
                      : [Number(v).toLocaleString("pt-BR"), "Consultas"]
                  }
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="left" type="monotone" dataKey="consultas"
                  name="Consultas" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="custo"
                  name="Gasto (R$)" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        )}
        <CardContent className="p-0 overflow-auto">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : porMes.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma consulta registrada ainda.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Consultas</TableHead>
                  <TableHead className="text-right">Sucesso</TableHead>
                  <TableHead className="text-right">Erros</TableHead>
                  <TableHead className="text-right">Custo médio</TableHead>
                  <TableHead className="text-right">Gasto total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porMes.map((row) => {
                  const atual = row.ym === mesAtualYm;
                  const medio = row.consultas > 0 ? row.custo / row.consultas : 0;
                  return (
                    <TableRow key={row.ym} className={atual ? "bg-muted/40" : ""}>
                      <TableCell className="capitalize">
                        {nomeMes(row.ym)}{" "}
                        {atual && <Badge variant="secondary" className="ml-1 text-[10px]">atual</Badge>}
                      </TableCell>
                      <TableCell className="text-right">{row.consultas.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right text-xs">{row.sucesso.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right text-xs">{row.erros.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right text-xs">{fmtBRL(medio)}</TableCell>
                      <TableCell className="text-right font-medium">{fmtBRL(row.custo)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}