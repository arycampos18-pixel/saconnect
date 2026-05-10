import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Pencil, Plus, MessageSquare, Trash2, Search,
  Phone, Mail, MapPin, Calendar, Building2, Users2, Activity, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { depStore, useDepStore } from "../store";
import { DepartamentoFormDialog } from "../components/DepartamentoFormDialog";
import { AdicionarMembroDialog } from "../components/AdicionarMembroDialog";
import { EnviarMensagemDialog } from "../components/EnviarMensagemDialog";
import type { FuncaoMembro, MembroDep } from "../data/mock";

const FUNCOES: FuncaoMembro[] = ["Membro", "Coordenador", "Voluntário"];

export default function DepartamentoDetalhe() {
  const { id = "" } = useParams();
  const departamentos = useDepStore((s) => s.departamentos);
  const membrosAll = useDepStore((s) => s.membros);
  const interacoesAll = useDepStore((s) => s.interacoes);
  const loaded = useDepStore((s) => s.loaded);

  const departamento = useMemo(
    () => departamentos.find((d) => d.id === id),
    [departamentos, id],
  );
  const membros = useMemo(
    () => membrosAll.filter((m) => m.departamentoId === id),
    [membrosAll, id],
  );
  const interacoes = useMemo(
    () => interacoesAll.filter((i) => i.departamentoId === id),
    [interacoesAll, id],
  );

  const [openEdit, setOpenEdit] = useState(false);
  const [openMembro, setOpenMembro] = useState(false);
  const [openMsg, setOpenMsg] = useState(false);
  const [msgMembro, setMsgMembro] = useState<MembroDep | null>(null);

  // filtros membros
  const [bMembro, setBMembro] = useState("");
  const [funcaoF, setFuncaoF] = useState<"Todas" | FuncaoMembro>("Todas");
  const [statusF, setStatusF] = useState<"Todos" | "Ativo" | "Inativo">("Todos");

  // filtros interações
  const [tipoF, setTipoF] = useState<string>("Todos");

  const membrosFiltrados = useMemo(() => {
    const q = bMembro.trim().toLowerCase();
    return membros.filter((m) => {
      if (funcaoF !== "Todas" && m.funcao !== funcaoF) return false;
      if (statusF !== "Todos" && m.status !== statusF) return false;
      if (!q) return true;
      return m.nome.toLowerCase().includes(q) || m.telefone.includes(q);
    });
  }, [membros, bMembro, funcaoF, statusF]);

  const interacoesFiltradas = useMemo(
    () => interacoes.filter((i) => tipoF === "Todos" || i.tipo === tipoF),
    [interacoes, tipoF],
  );

  if (!loaded) {
    return <div className="container max-w-7xl p-6 text-sm text-muted-foreground">Carregando...</div>;
  }
  if (!departamento) return <Navigate to="/app/analise-de-eleitores/departamentos" replace />;

  const totalMembros = depStore.totalMembros(departamento.id);
  const ativos = membros.filter((m) => m.status === "Ativo").length;
  const interacoesMes = interacoes.filter(
    (i) => new Date(i.dataHora).getMonth() === new Date().getMonth(),
  ).length;
  const engaj = totalMembros > 0 ? Math.round((ativos / Math.max(totalMembros, ativos || 1)) * 1000) / 10 : 0;

  // gráfico evolução real: acumulado de membros nos últimos 6 meses
  const evolucao = (() => {
    const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    const hoje = new Date();
    const pontos: { mes: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const ref = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const limite = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
      const total = membros.filter((m) => new Date(m.entradaEm) < limite).length;
      pontos.push({ mes: meses[ref.getMonth()], total });
    }
    return pontos;
  })();
  const tipos = ["Contato", "Atendimento", "Evento", "Doação"];
  const cores = ["hsl(var(--primary))", "hsl(var(--accent-foreground))", "hsl(var(--muted-foreground))", "hsl(var(--destructive))"];
  const pizza = tipos.map((t) => ({ name: t, value: interacoes.filter((i) => i.tipo === t).length || 1 }));

  return (
    <div className="container max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild size="icon" variant="ghost">
            <Link to="/app/analise-de-eleitores/departamentos"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                {departamento.nome}
                <Badge variant="outline"
                  className={
                    departamento.status === "Ativo"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "border-muted-foreground/20 bg-muted text-muted-foreground"
                  }>
                  {departamento.status}
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground">{departamento.descricao}</p>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => setOpenEdit(true)}>
          <Pencil className="mr-2 h-4 w-4" /> Editar
        </Button>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info"><Building2 className="mr-2 h-4 w-4" />Informações</TabsTrigger>
          <TabsTrigger value="membros"><Users2 className="mr-2 h-4 w-4" />Membros ({totalMembros})</TabsTrigger>
          <TabsTrigger value="historico"><Activity className="mr-2 h-4 w-4" />Histórico</TabsTrigger>
          <TabsTrigger value="estatisticas"><BarChart3 className="mr-2 h-4 w-4" />Estatísticas</TabsTrigger>
        </TabsList>

        {/* Informações */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados gerais</CardTitle>
              <CardDescription>Informações cadastrais do departamento.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <InfoLine icon={Users2} label="Responsável" value={departamento.responsavel} />
              <InfoLine icon={Calendar} label="Criado em" value={new Date(departamento.criadoEm).toLocaleDateString("pt-BR")} />
              <InfoLine icon={MapPin} label="Área de atuação" value={departamento.area || "—"} />
              <InfoLine icon={Phone} label="Telefone" value={departamento.telefone || "—"} />
              <InfoLine icon={Mail} label="E-mail" value={departamento.email || "—"} />
              <InfoLine icon={Activity} label="Objetivo" value={departamento.objetivo || "—"} className="sm:col-span-2" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Membros */}
        <TabsContent value="membros" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Membros do departamento</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={bMembro} onChange={(e) => setBMembro(e.target.value)} placeholder="Buscar…" className="w-48 pl-9" />
                  </div>
                  <Select value={funcaoF} onValueChange={(v) => setFuncaoF(v as any)}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todas">Todas funções</SelectItem>
                      {FUNCOES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={statusF} onValueChange={(v) => setStatusF(v as any)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todos">Todos</SelectItem>
                      <SelectItem value="Ativo">Ativos</SelectItem>
                      <SelectItem value="Inativo">Inativos</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => { setMsgMembro(null); setOpenMsg(true); }}>
                    <MessageSquare className="mr-2 h-4 w-4" /> Mensagem
                  </Button>
                  <Button onClick={() => setOpenMembro(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Adicionar membro
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {membrosFiltrados.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.nome}</TableCell>
                      <TableCell>{m.telefone}</TableCell>
                      <TableCell className="text-muted-foreground">{m.email || "—"}</TableCell>
                      <TableCell>
                        <Select
                          value={m.funcao}
                          onValueChange={(v) => depStore.atualizarMembro(m.id, { funcao: v as FuncaoMembro })}
                        >
                          <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FUNCOES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{new Date(m.entradaEm).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>
                        <Badge variant="outline"
                          className={
                            m.status === "Ativo"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : "border-muted-foreground/20 bg-muted text-muted-foreground"
                          }>
                          {m.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" title="Enviar mensagem"
                            onClick={() => { setMsgMembro(m); setOpenMsg(true); }}>
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Inativar / reativar"
                            onClick={() => depStore.atualizarMembro(m.id, { status: m.status === "Ativo" ? "Inativo" : "Ativo" })}>
                            <Activity className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Remover"
                            onClick={() => { depStore.removerMembro(m.id); toast.success("Membro removido"); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {membrosFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        Nenhum membro encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Histórico */}
        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Histórico de interações</CardTitle>
                <Select value={tipoF} onValueChange={setTipoF}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos os tipos</SelectItem>
                    {tipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {interacoesFiltradas.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Sem interações registradas.</p>
              ) : (
                <ol className="relative space-y-4 border-l border-border pl-6">
                  {interacoesFiltradas.map((i) => (
                    <li key={i.id} className="relative">
                      <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{i.tipo}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(i.dataHora).toLocaleString("pt-BR")}
                        </span>
                        <Badge variant="outline" className="text-xs">{i.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm">{i.descricao}</p>
                      <p className="text-xs text-muted-foreground">por {i.responsavel}</p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Estatísticas */}
        <TabsContent value="estatisticas" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <MiniStat title="Total de membros" value={totalMembros} />
            <MiniStat title="Membros ativos" value={ativos} />
            <MiniStat title="Interações no mês" value={interacoesMes} />
            <MiniStat title="Engajamento" value={`${engaj}%`} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evolução de membros (6 meses)</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolucao}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                    <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tipos de interação</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pizza} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                      {pizza.map((_, idx) => <Cell key={idx} fill={cores[idx % cores.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <DepartamentoFormDialog open={openEdit} onOpenChange={setOpenEdit} editing={departamento} />
      <AdicionarMembroDialog open={openMembro} onOpenChange={setOpenMembro} departamentoId={departamento.id} />
      {openMsg && (
        <EnviarMensagemDialog
          open={openMsg}
          onOpenChange={setOpenMsg}
          departamento={departamento}
          membros={membros}
          membroPreSelecionado={msgMembro}
        />
      )}
    </div>
  );
}

function InfoLine({
  icon: Icon, label, value, className,
}: { icon: any; label: string; value: string; className?: string }) {
  return (
    <div className={"flex items-start gap-3 rounded-lg border bg-card p-3 " + (className ?? "")}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function MiniStat({ title, value }: { title: string; value: number | string }) {
  return (
    <Card>
      <CardHeader className="pb-1"><CardDescription>{title}</CardDescription></CardHeader>
      <CardContent><span className="text-2xl font-semibold tabular-nums">{value}</span></CardContent>
    </Card>
  );
}