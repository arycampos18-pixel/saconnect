import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronLeft, ChevronRight, Calendar, AlertCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import { crmService, type Etapa, type Oportunidade, type Tarefa } from "../services/crmService";
import { OportunidadeFormDialog } from "../components/OportunidadeFormDialog";
import { TarefaFormDialog } from "../components/TarefaFormDialog";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip, Cell } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { liderancasCabosService, type Lideranca, type Cabo } from "@/modules/political/services/liderancasCabosService";

export default function CRM() {
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [openOp, setOpenOp] = useState(false);
  const [openTar, setOpenTar] = useState(false);
  const [etapaInicial, setEtapaInicial] = useState<string | undefined>();
  const [liderancas, setLiderancas] = useState<Lideranca[]>([]);
  const [cabos, setCabos] = useState<Cabo[]>([]);
  const [filtroLid, setFiltroLid] = useState("todas");
  const [filtroCabo, setFiltroCabo] = useState("todos");

  const carregar = async () => {
    setLoading(true);
    try {
      const [e, o, t] = await Promise.all([
        crmService.listarEtapas(),
        crmService.listarOportunidades(),
        crmService.listarTarefas(),
      ]);
      setEtapas(e); setOportunidades(o); setTarefas(t);
      const [lids, cbs] = await Promise.all([
        liderancasCabosService.listarLiderancas().catch(() => []),
        liderancasCabosService.listarCabos().catch(() => []),
      ]);
      setLiderancas(lids); setCabos(cbs);
    } catch (err: any) {
      toast.error("Erro ao carregar CRM", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const oportunidadesFiltradas = useMemo(() => {
    return oportunidades.filter((o) => {
      if (filtroLid !== "todas" && o.eleitor?.lideranca_id !== filtroLid) return false;
      if (filtroCabo !== "todos" && o.eleitor?.cabo_eleitoral_id !== filtroCabo) return false;
      return true;
    });
  }, [oportunidades, filtroLid, filtroCabo]);

  const mover = async (op: Oportunidade, dir: -1 | 1) => {
    const idx = etapas.findIndex((e) => e.id === op.etapa_id);
    const novo = etapas[idx + dir];
    if (!novo) return;
    await crmService.moverOportunidade(op.id, novo.id);
    carregar();
  };

  const removerOp = async (id: string) => {
    if (!confirm("Remover oportunidade?")) return;
    await crmService.removerOportunidade(id);
    toast.success("Removido");
    carregar();
  };

  const toggleTarefa = async (t: Tarefa) => {
    await crmService.toggleTarefa(t.id, !t.concluida);
    carregar();
  };

  const removerTarefa = async (id: string) => {
    if (!confirm("Remover tarefa?")) return;
    await crmService.removerTarefa(id);
    carregar();
  };

  const funilData = useMemo(() =>
    etapas.filter(e => !e.is_perdido).map((e) => {
      const ops = oportunidadesFiltradas.filter((o) => o.etapa_id === e.id);
      return {
        nome: e.nome,
        cor: e.cor,
        qtd: ops.length,
        votos: ops.reduce((acc, o) => acc + (o.valor_estimado ?? 0), 0),
      };
    }), [etapas, oportunidadesFiltradas]);

  const totalVotos = funilData.filter(f => f.nome !== "Perdido").reduce((acc, f) => acc + f.votos, 0);
  const ganhoEtapa = etapas.find(e => e.is_ganho);
  const votosGanhos = oportunidadesFiltradas.filter(o => o.etapa_id === ganhoEtapa?.id).reduce((acc, o) => acc + o.valor_estimado, 0);
  const taxaConv = totalVotos > 0 ? Math.round((votosGanhos / totalVotos) * 100) : 0;

  const tarefasPendentes = tarefas.filter(t => !t.concluida);
  const tarefasAtrasadas = tarefasPendentes.filter(t => t.vencimento && new Date(t.vencimento) < new Date());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CRM Avançado</h1>
        <p className="text-sm text-muted-foreground">Pipeline de relacionamento, tarefas e funil de conversão.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Oportunidades</p><p className="text-2xl font-bold">{oportunidadesFiltradas.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Votos no funil</p><p className="text-2xl font-bold text-primary">{totalVotos}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Conversão</p><p className="text-2xl font-bold">{taxaConv}%</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Tarefas atrasadas</p><p className="text-2xl font-bold text-destructive">{tarefasAtrasadas.length}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={filtroLid} onValueChange={(v) => { setFiltroLid(v); setFiltroCabo("todos"); }}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Liderança" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as lideranças</SelectItem>
            {liderancas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroCabo} onValueChange={setFiltroCabo}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Cabo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os cabos</SelectItem>
            {cabos.filter((c) => filtroLid === "todas" || c.lideranca_id === filtroLid)
              .map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
          <TabsTrigger value="funil">Funil</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => { setEtapaInicial(undefined); setOpenOp(true); }} size="sm">
              <Plus className="mr-2 h-4 w-4" /> Nova oportunidade
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <div className="grid gap-3 overflow-x-auto" style={{ gridTemplateColumns: `repeat(${etapas.length}, minmax(240px, 1fr))` }}>
              {etapas.map((e) => {
                const ops = oportunidadesFiltradas.filter((o) => o.etapa_id === e.id);
                return (
                  <div key={e.id} className="rounded-lg border bg-card">
                    <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderTopColor: e.cor, borderTopWidth: 3 }}>
                      <div>
                        <p className="text-sm font-semibold">{e.nome}</p>
                        <p className="text-xs text-muted-foreground">{ops.length} · {ops.reduce((a, o) => a + o.valor_estimado, 0)} votos</p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEtapaInicial(e.id); setOpenOp(true); }}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2 p-2 min-h-[200px]">
                      {ops.map((op) => (
                        <div key={op.id} className="rounded-md border bg-background p-3 text-sm shadow-sm">
                          <p className="font-medium">{op.titulo}</p>
                          {op.eleitor && <p className="text-xs text-muted-foreground">{op.eleitor.nome}</p>}
                          <div className="mt-2 flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">{op.valor_estimado} votos</Badge>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => mover(op, -1)}><ChevronLeft className="h-3 w-3" /></Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => mover(op, 1)}><ChevronRight className="h-3 w-3" /></Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removerOp(op.id)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tarefas" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tarefas e Follow-ups</CardTitle>
                <CardDescription>Lembretes ordenados por vencimento.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setOpenTar(true)}><Plus className="mr-2 h-4 w-4" /> Nova tarefa</Button>
            </CardHeader>
            <CardContent>
              {tarefas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma tarefa.</p>
              ) : (
                <div className="space-y-2">
                  {tarefas.map((t) => {
                    const atrasada = !t.concluida && t.vencimento && new Date(t.vencimento) < new Date();
                    return (
                      <div key={t.id} className="flex items-start gap-3 rounded-lg border bg-card p-3">
                        <Checkbox checked={t.concluida} onCheckedChange={() => toggleTarefa(t)} />
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${t.concluida ? "line-through text-muted-foreground" : ""}`}>{t.titulo}</p>
                          {t.descricao && <p className="text-xs text-muted-foreground">{t.descricao}</p>}
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                            <Badge variant={t.prioridade === "Alta" ? "destructive" : t.prioridade === "Média" ? "default" : "secondary"}>
                              {t.prioridade}
                            </Badge>
                            {t.vencimento && (
                              <span className={`flex items-center gap-1 ${atrasada ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                                {atrasada ? <AlertCircle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                                {format(new Date(t.vencimento), "dd/MM HH:mm", { locale: ptBR })}
                              </span>
                            )}
                            {t.eleitor && <span className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" /> {t.eleitor.nome}</span>}
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => removerTarefa(t.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funil" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Funil de Conversão</CardTitle>
              <CardDescription>Distribuição de votos estimados por etapa.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funilData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="nome" type="category" width={120} />
                    <Tooltip />
                    <Bar dataKey="votos" radius={[0, 4, 4, 0]}>
                      {funilData.map((d, i) => <Cell key={i} fill={d.cor} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {funilData.map((f) => (
                  <div key={f.nome} className="rounded-lg border p-3" style={{ borderLeft: `4px solid ${f.cor}` }}>
                    <p className="text-xs text-muted-foreground">{f.nome}</p>
                    <p className="text-lg font-bold">{f.qtd} oportunidades</p>
                    <p className="text-sm">{f.votos} votos</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <OportunidadeFormDialog open={openOp} onOpenChange={setOpenOp} etapas={etapas} etapaInicialId={etapaInicial} onSaved={carregar} />
      <TarefaFormDialog open={openTar} onOpenChange={setOpenTar} onSaved={carregar} />
    </div>
  );
}