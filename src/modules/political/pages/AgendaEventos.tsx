import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, List, Plus, Search, X, Loader2, Pencil, Trash2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { format, isSameDay, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "agendaEventosView";
type ViewType = "calendar" | "list";

type AgendaEvento = {
  id: string;
  titulo: string;
  descricao: string | null;
  local: string | null;
  data_inicio: string;
  data_fim: string | null;
  tipo: string;
  categoria: string | null;
  prioridade: string;
  status: string;
  origem: string;
  origem_id: string | null;
  created_by: string | null;
};

const TIPOS = ["Reunião", "Visita", "Evento", "Audiência", "Outro"] as const;
const PRIORIDADES = ["Baixa", "Normal", "Alta", "Urgente"] as const;
const STATUSES = ["Planejado", "Confirmado", "Em Andamento", "Concluído", "Cancelado", "Finalizado", "Agendado"] as const;

const statusBadgeClass: Record<string, string> = {
  "Planejado": "bg-blue-100 text-blue-800 hover:bg-blue-100",
  "Agendado": "bg-blue-100 text-blue-800 hover:bg-blue-100",
  "Confirmado": "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  "Em Andamento": "bg-primary text-primary-foreground hover:bg-primary",
  "Concluído": "bg-muted text-muted-foreground hover:bg-muted",
  "Finalizado": "bg-muted text-muted-foreground hover:bg-muted",
  "Cancelado": "bg-rose-100 text-rose-800 hover:bg-rose-100",
};

const prioridadeBadge: Record<string, string> = {
  "Baixa": "bg-slate-100 text-slate-700",
  "Normal": "bg-sky-100 text-sky-800",
  "Alta": "bg-amber-100 text-amber-900",
  "Urgente": "bg-red-100 text-red-800",
};

type FormState = {
  titulo: string;
  descricao: string;
  local: string;
  data_inicio: string;
  data_fim: string;
  tipo: string;
  prioridade: string;
  status: string;
};

const emptyForm: FormState = {
  titulo: "",
  descricao: "",
  local: "",
  data_inicio: "",
  data_fim: "",
  tipo: "Evento",
  prioridade: "Normal",
  status: "Planejado",
};

export default function AgendaEventos() {
  const [view, setView] = useState<ViewType>(() => {
    if (typeof window === "undefined") return "calendar";
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "list" ? "list" : "calendar";
  });
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, view); } catch { /* ignore */ }
  }, [view]);

  const [eventos, setEventos] = useState<AgendaEvento[]>([]);
  const [loading, setLoading] = useState(true);

  // filtros (lista)
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [prioridadeFiltro, setPrioridadeFiltro] = useState<string>("todas");
  const [dataDe, setDataDe] = useState<Date | undefined>();
  const [dataAte, setDataAte] = useState<Date | undefined>();

  // calendário
  const [mesAtual, setMesAtual] = useState<Date>(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState<Date | undefined>(new Date());

  // dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AgendaEvento | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("agenda_eventos" as any)
        .select("*")
        .order("data_inicio", { ascending: true })
        .limit(2000);
      if (error) throw error;
      setEventos(((data ?? []) as unknown) as AgendaEvento[]);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, []);

  const eventosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const de = dataDe ? new Date(dataDe.getFullYear(), dataDe.getMonth(), dataDe.getDate(), 0, 0, 0).getTime() : null;
    const ate = dataAte ? new Date(dataAte.getFullYear(), dataAte.getMonth(), dataAte.getDate(), 23, 59, 59).getTime() : null;
    return eventos.filter((ev) => {
      if (termo && !(ev.titulo ?? "").toLowerCase().includes(termo)) return false;
      if (tipoFiltro !== "todos" && ev.tipo !== tipoFiltro) return false;
      if (statusFiltro !== "todos" && ev.status !== statusFiltro) return false;
      if (prioridadeFiltro !== "todas" && ev.prioridade !== prioridadeFiltro) return false;
      const ts = new Date(ev.data_inicio).getTime();
      if (de !== null && ts < de) return false;
      if (ate !== null && ts > ate) return false;
      return true;
    });
  }, [eventos, busca, tipoFiltro, statusFiltro, prioridadeFiltro, dataDe, dataAte]);

  const filtrosAtivos =
    busca.trim() !== "" || tipoFiltro !== "todos" || statusFiltro !== "todos" ||
    prioridadeFiltro !== "todas" || !!dataDe || !!dataAte;
  function limparFiltros() {
    setBusca(""); setTipoFiltro("todos"); setStatusFiltro("todos");
    setPrioridadeFiltro("todas"); setDataDe(undefined); setDataAte(undefined);
  }

  // calendário: dias com eventos no mês
  const eventosDoMes = useMemo(() => {
    const ini = startOfMonth(mesAtual).getTime();
    const fim = endOfMonth(mesAtual).getTime();
    return eventos.filter((e) => {
      const t = new Date(e.data_inicio).getTime();
      return t >= ini && t <= fim;
    });
  }, [eventos, mesAtual]);

  const diasComEventos = useMemo(
    () => eventosDoMes.map((e) => new Date(e.data_inicio)),
    [eventosDoMes]
  );

  const eventosDoDia = useMemo(() => {
    if (!diaSelecionado) return [];
    return eventos
      .filter((e) => isSameDay(new Date(e.data_inicio), diaSelecionado))
      .sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime());
  }, [eventos, diaSelecionado]);

  // Quando o dia selecionado não tem nada (ou foi limpo), listamos os itens
  // do MÊS visível agrupados por dia, para que o Calendário "case" com a Lista.
  const itensVisiveisCalendario = useMemo(() => {
    if (eventosDoDia.length > 0) {
      return [{ dia: diaSelecionado!, itens: eventosDoDia }];
    }
    const porDia = new Map<string, AgendaEvento[]>();
    [...eventosDoMes]
      .sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime())
      .forEach((ev) => {
        const d = new Date(ev.data_inicio);
        const key = format(d, "yyyy-MM-dd");
        if (!porDia.has(key)) porDia.set(key, []);
        porDia.get(key)!.push(ev);
      });
    return Array.from(porDia.entries()).map(([key, itens]) => ({
      dia: new Date(key + "T00:00:00"),
      itens,
    }));
  }, [eventosDoDia, eventosDoMes, diaSelecionado]);

  // contagens por dia (para mostrar badge no calendário)
  const contagemPorDia = useMemo(() => {
    const m = new Map<string, number>();
    eventosDoMes.forEach((e) => {
      const k = format(new Date(e.data_inicio), "yyyy-MM-dd");
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return m;
  }, [eventosDoMes]);

  function abrirNovo(dataBase?: Date) {
    setEditing(null);
    const base = dataBase ?? new Date();
    base.setSeconds(0, 0);
    setForm({
      ...emptyForm,
      data_inicio: format(base, "yyyy-MM-dd'T'HH:mm"),
    });
    setDialogOpen(true);
  }

  function abrirEdicao(ev: AgendaEvento) {
    if (ev.origem !== "manual" && ev.origem !== "agenda") {
      toast.info(`Este registro vem do módulo "${ev.origem}". Edite-o no módulo original para refletir aqui.`);
      return;
    }
    setEditing(ev);
    setForm({
      titulo: ev.titulo,
      descricao: ev.descricao ?? "",
      local: ev.local ?? "",
      data_inicio: ev.data_inicio ? format(new Date(ev.data_inicio), "yyyy-MM-dd'T'HH:mm") : "",
      data_fim: ev.data_fim ? format(new Date(ev.data_fim), "yyyy-MM-dd'T'HH:mm") : "",
      tipo: ev.tipo,
      prioridade: ev.prioridade,
      status: ev.status,
    });
    setDialogOpen(true);
  }

  async function salvar() {
    if (!form.titulo.trim() || !form.data_inicio) {
      toast.error("Informe título e data inicial.");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        titulo: form.titulo.trim(),
        descricao: form.descricao || null,
        local: form.local || null,
        data_inicio: new Date(form.data_inicio).toISOString(),
        data_fim: form.data_fim ? new Date(form.data_fim).toISOString() : null,
        tipo: form.tipo,
        prioridade: form.prioridade,
        status: form.status,
      };
      if (editing) {
        const { error } = await supabase.from("agenda_eventos" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Atualizado.");
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("agenda_eventos" as any).insert({
          ...payload, origem: "manual", created_by: u.user?.id,
        });
        if (error) throw error;
        toast.success("Criado.");
      }
      setDialogOpen(false);
      reload();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function deletar(ev: AgendaEvento) {
    if (ev.origem !== "manual" && ev.origem !== "agenda") {
      toast.info(`Este registro vem do módulo "${ev.origem}". Remova-o no módulo original.`);
      return;
    }
    if (!confirm(`Excluir "${ev.titulo}"?`)) return;
    try {
      const { error } = await supabase.from("agenda_eventos" as any).delete().eq("id", ev.id);
      if (error) throw error;
      toast.success("Removido.");
      reload();
    } catch (e: any) {
      toast.error(e.message ?? "Erro.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Agenda / Eventos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fonte única de dados em duas visualizações: calendário ou lista.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as ViewType)}>
            <TabsList>
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarIcon className="h-4 w-4" /> Calendário
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" /> Lista
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => abrirNovo(diaSelecionado)}>
            <Plus className="mr-2 h-4 w-4" /> Novo
          </Button>
        </div>
      </div>

      {view === "list" ? (
        <>
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-elegant-sm sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por título..." className="pl-9" />
            </div>
            <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
              <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="w-full sm:w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={prioridadeFiltro} onValueChange={setPrioridadeFiltro}>
              <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas prioridades</SelectItem>
                {PRIORIDADES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal sm:w-[160px]", !dataDe && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataDe ? format(dataDe, "dd/MM/yyyy", { locale: ptBR }) : "Data inicial"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker mode="single" selected={dataDe} onSelect={setDataDe} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal sm:w-[160px]", !dataAte && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataAte ? format(dataAte, "dd/MM/yyyy", { locale: ptBR }) : "Data final"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker mode="single" selected={dataAte} onSelect={setDataAte} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            {filtrosAtivos && (
              <Button variant="ghost" size="sm" onClick={limparFiltros}>
                <X className="mr-1 h-4 w-4" /> Limpar
              </Button>
            )}
            <div className="ml-auto text-sm text-muted-foreground">
              {eventosFiltrados.length} de {eventos.length}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-elegant-sm">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : eventosFiltrados.length === 0 ? (
              <div className="py-16 text-center">
                <Search className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  {filtrosAtivos ? "Nenhum item corresponde aos filtros." : "Nenhum item cadastrado."}
                </p>
                {filtrosAtivos
                  ? <Button className="mt-4" variant="outline" onClick={limparFiltros}>Limpar filtros</Button>
                  : <Button className="mt-4" onClick={() => abrirNovo()}><Plus className="mr-2 h-4 w-4" />Criar primeiro</Button>}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-accent/40 hover:bg-accent/40">
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventosFiltrados.map((ev) => (
                    <TableRow key={ev.id} className="hover:bg-accent/30">
                      <TableCell className="font-medium">{ev.titulo}</TableCell>
                      <TableCell><Badge variant="outline">{ev.tipo}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(ev.data_inicio), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">{ev.local ?? "—"}</TableCell>
                      <TableCell><Badge className={prioridadeBadge[ev.prioridade] ?? ""}>{ev.prioridade}</Badge></TableCell>
                      <TableCell><Badge className={statusBadgeClass[ev.status] ?? ""}>{ev.status}</Badge></TableCell>
                      <TableCell className="text-xs uppercase text-muted-foreground">{ev.origem}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => abrirEdicao(ev)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => deletar(ev)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[auto,1fr]">
          <div className="rounded-xl border border-border bg-card p-3 shadow-elegant-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={() => setMesAtual(subMonths(mesAtual, 1))}>‹</Button>
              <div className="text-sm font-medium capitalize">
                {format(mesAtual, "MMMM 'de' yyyy", { locale: ptBR })}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setMesAtual(addMonths(mesAtual, 1))}>›</Button>
            </div>
            <CalendarPicker
              mode="single"
              month={mesAtual}
              onMonthChange={setMesAtual}
              selected={diaSelecionado}
              onSelect={setDiaSelecionado}
              modifiers={{ comEventos: diasComEventos }}
              modifiersClassNames={{ comEventos: "bg-primary/15 font-semibold text-primary" }}
              locale={ptBR}
              className={cn("p-3 pointer-events-auto")}
            />
          </div>

          <div className="rounded-xl border border-border bg-card shadow-elegant-sm">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <div className="text-sm font-semibold">
                  {eventosDoDia.length > 0 && diaSelecionado
                    ? format(diaSelecionado, "EEEE, dd 'de' MMMM", { locale: ptBR })
                    : `Itens de ${format(mesAtual, "MMMM 'de' yyyy", { locale: ptBR })}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {(eventosDoDia.length > 0
                    ? eventosDoDia.length
                    : eventosDoMes.length)}{" "}
                  {(eventosDoDia.length > 0 ? eventosDoDia.length : eventosDoMes.length) === 1 ? "item" : "itens"}
                  {eventosDoDia.length === 0 && diaSelecionado && (
                    <span className="ml-1">· nada em {format(diaSelecionado, "dd/MM")}</span>
                  )}
                </div>
              </div>
              <Button size="sm" onClick={() => abrirNovo(diaSelecionado)}>
                <Plus className="mr-1 h-4 w-4" /> Adicionar
              </Button>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : itensVisiveisCalendario.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Nada agendado neste mês.
                </div>
              ) : (
                itensVisiveisCalendario.map((grupo) => (
                  <div key={grupo.dia.toISOString()}>
                    <div className="bg-accent/20 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {format(grupo.dia, "EEE, dd 'de' MMM", { locale: ptBR })} · {grupo.itens.length}
                    </div>
                    {grupo.itens.map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => abrirEdicao(ev)}
                        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-accent/30"
                      >
                        <div className="w-16 shrink-0 text-xs font-mono text-muted-foreground">
                          {format(new Date(ev.data_inicio), "HH:mm")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{ev.titulo}</span>
                            <Badge variant="outline" className="text-[10px]">{ev.tipo}</Badge>
                            <Badge className={cn("text-[10px]", statusBadgeClass[ev.status])}>{ev.status}</Badge>
                            <span className="text-[10px] uppercase text-muted-foreground">{ev.origem}</span>
                          </div>
                          {ev.local && <div className="mt-0.5 text-xs text-muted-foreground truncate">{ev.local}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar item" : "Novo item"}</DialogTitle>
            <DialogDescription>Agenda / Evento — fonte única de dados.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} maxLength={200} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Data e hora inicial *</Label>
                <Input type="datetime-local" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
              </div>
              <div>
                <Label>Data e hora final</Label>
                <Input type="datetime-local" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select value={form.prioridade} onValueChange={(v) => setForm({ ...form, prioridade: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORIDADES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Local</Label>
              <Input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} maxLength={200} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} maxLength={1000} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
