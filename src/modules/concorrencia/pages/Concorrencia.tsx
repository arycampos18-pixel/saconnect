import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  concorrenciaService,
  type AnaliseConcorrencia,
  type Concorrente,
} from "../services/concorrenciaService";
import ConcorrenteFormDialog from "../components/ConcorrenteFormDialog";
import AtividadeFormDialog from "../components/AtividadeFormDialog";

const SENT_COLORS = { Positivo: "#0EA5E9", Neutro: "#60A5FA", Negativo: "#1E3A8A" };

export default function Concorrencia() {
  const [periodo, setPeriodo] = useState<"7" | "30" | "90">("30");
  const [data, setData] = useState<AnaliseConcorrencia | null>(null);
  const [loading, setLoading] = useState(true);
  const [openConcorrente, setOpenConcorrente] = useState(false);
  const [openAtividade, setOpenAtividade] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      setData(await concorrenciaService.carregarAnalise(Number(periodo)));
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao carregar análise.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo]);

  async function remover(c: Concorrente) {
    if (!confirm(`Remover "${c.nome}" do monitoramento?`)) return;
    await concorrenciaService.removerConcorrente(c.id);
    toast.success("Removido.");
    carregar();
  }

  const sentData = useMemo(
    () =>
      data
        ? [
            { name: "Positivo", value: data.sentimento.positivo },
            { name: "Neutro", value: data.sentimento.neutro },
            { name: "Negativo", value: data.sentimento.negativo },
          ]
        : [],
    [data],
  );

  const comparativo = useMemo(() => {
    if (!data) return [];
    return data.concorrentes.map((c) => ({
      nome: c.nome.split(" ")[0],
      seguidores: c.seguidores,
      engajamento: c.engajamento_pct,
      atividades: data.atividades.filter((a) => a.concorrente_id === c.id).length,
    }));
  }, [data]);

  const nomeDe = (id: string) => data?.concorrentes.find((c) => c.id === id)?.nome ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
            <BarChart3 className="h-7 w-7 text-primary" /> Análise de Concorrência
            <Badge className="ml-1 gap-1 bg-sky-500 text-white hover:bg-sky-500">
              <Sparkles className="h-3.5 w-3.5" /> IA
            </Badge>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitore atividades dos concorrentes e veja sentimento e insights gerados por IA.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as any)}>
            <TabsList>
              <TabsTrigger value="7">7 dias</TabsTrigger>
              <TabsTrigger value="30">30 dias</TabsTrigger>
              <TabsTrigger value="90">90 dias</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" onClick={carregar} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar
          </Button>
          <Button variant="outline" onClick={() => setOpenAtividade(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Nova atividade
          </Button>
          <Button onClick={() => setOpenConcorrente(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Novo concorrente
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando análise...
        </div>
      ) : data ? (
        <>
          {data.insights.length > 0 && (
            <Card className="border-sky-200 bg-sky-50/60">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-sky-500" /> Insights estratégicos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm">
                  {data.insights.map((i, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="text-sky-500">•</span>
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Comparativo</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Seguidores, engajamento e atividades no período
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparativo}>
                      <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="atividades" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Análise de Sentimento</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {data.sentimento.total} atividades nos últimos {data.periodoDias} dias
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sentData} dataKey="value" nameKey="name" outerRadius={90} label>
                        {sentData.map((s) => (
                          <Cell
                            key={s.name}
                            fill={SENT_COLORS[s.name as keyof typeof SENT_COLORS]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {data.palavras.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Palavras mais mencionadas
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.palavras.map((p) => (
                        <span
                          key={p.palavra}
                          className="rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700 ring-1 ring-sky-200"
                          style={{ fontSize: `${Math.min(14, 10 + p.total)}px` }}
                        >
                          {p.palavra}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Concorrentes monitorados</CardTitle>
              <span className="text-xs text-muted-foreground">{data.concorrentes.length} cadastrados</span>
            </CardHeader>
            <CardContent className="p-0">
              {data.concorrentes.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum concorrente cadastrado ainda.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Partido</TableHead>
                      <TableHead>Região</TableHead>
                      <TableHead className="text-right">Seguidores</TableHead>
                      <TableHead className="text-right">Engajamento</TableHead>
                      <TableHead className="text-right">Atividades</TableHead>
                      <TableHead className="text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.concorrentes.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.nome}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.partido ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.regiao ?? "—"}</TableCell>
                        <TableCell className="text-right">{c.seguidores.toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-right">{c.engajamento_pct}%</TableCell>
                        <TableCell className="text-right">
                          {data.atividades.filter((a) => a.concorrente_id === c.id).length}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={() => remover(c)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Atividades recentes</CardTitle>
              <p className="text-xs text-muted-foreground">Timeline dos últimos {data.periodoDias} dias</p>
            </CardHeader>
            <CardContent>
              {data.atividades.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma atividade registrada no período. Use "Nova atividade".
                </p>
              ) : (
                <ol className="relative space-y-4 border-l border-border pl-4">
                  {data.atividades.map((a) => (
                    <li key={a.id} className="relative">
                      <span className="absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{a.tipo}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(a.data_atividade).toLocaleString("pt-BR")}
                        </span>
                        {a.sentimento && (
                          <Badge
                            className="text-white"
                            style={{ background: SENT_COLORS[a.sentimento] }}
                          >
                            {a.sentimento}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-semibold">{a.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {nomeDe(a.concorrente_id)} {a.bairro ? `· ${a.bairro}` : ""}
                      </p>
                      {a.descricao && <p className="mt-1 text-xs">{a.descricao}</p>}
                      {a.link && (
                        <a
                          href={a.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary underline"
                        >
                          Abrir link
                        </a>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      <ConcorrenteFormDialog
        open={openConcorrente}
        onOpenChange={setOpenConcorrente}
        onSaved={carregar}
      />
      <AtividadeFormDialog
        open={openAtividade}
        onOpenChange={setOpenAtividade}
        onSaved={carregar}
        concorrentes={data?.concorrentes ?? []}
      />
    </div>
  );
}