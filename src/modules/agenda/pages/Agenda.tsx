import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Loader2, MapPin,
  Pencil, Plus, Search, Trash2, X, Users, Phone, Briefcase, Mic, Car, FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  agendaService, type Compromisso, type CompromissoCategoria,
  type CompromissoPrioridade, type CompromissoStatus,
} from "../services/agendaService";
import { CompromissoFormDialog } from "../components/CompromissoFormDialog";

type ViewMode = "mes" | "semana" | "dia" | "lista";

const CATEGORIA_META: Record<CompromissoCategoria, { color: string; bg: string; border: string; icon: any }> = {
  "Reunião":   { color: "text-blue-700",   bg: "bg-blue-500",   border: "border-l-blue-500",   icon: Users },
  "Visita":    { color: "text-sky-700",    bg: "bg-sky-400",    border: "border-l-sky-400",    icon: Car },
  "Evento":    { color: "text-indigo-800", bg: "bg-indigo-700", border: "border-l-indigo-700", icon: Mic },
  "Audiência": { color: "text-blue-900",   bg: "bg-blue-700",   border: "border-l-blue-700",   icon: Briefcase },
  "Outro":     { color: "text-slate-700",  bg: "bg-slate-500",  border: "border-l-slate-500",  icon: FileText },
};

const PRIORIDADE_BORDER: Record<CompromissoPrioridade, string> = {
  Alta:  "border-l-4 border-l-destructive",
  Média: "border-l-4 border-l-amber-500",
  Baixa: "border-l-4 border-l-muted-foreground/40",
};

const STATUS_BADGE: Record<CompromissoStatus, string> = {
  Agendado:  "bg-primary/10 text-primary border-primary/20",
  Concluído: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  Cancelado: "bg-muted text-muted-foreground line-through border-border",
};

function fmtTime(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function sameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString(); }
function startOfWeek(d: Date) { const x = new Date(d); x.setDate(d.getDate() - d.getDay()); x.setHours(0,0,0,0); return x; }

export default function Agenda() {
  const [view, setView] = useState<ViewMode>("mes");
  const [cursor, setCursor] = useState<Date>(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [statusFiltro, setStatusFiltro] = useState<CompromissoStatus | "todos">("todos");
  const [categoriaFiltro, setCategoriaFiltro] = useState<CompromissoCategoria | "todos">("todos");
  const [prioridadeFiltro, setPrioridadeFiltro] = useState<CompromissoPrioridade | "todos">("todos");
  const [busca, setBusca] = useState("");

  const [compromissos, setCompromissos] = useState<Compromisso[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Compromisso | null>(null);
  const [removendo, setRemovendo] = useState<Compromisso | null>(null);
  const [detalhe, setDetalhe] = useState<Compromisso | null>(null);

  const range = useMemo(() => {
    const ini = new Date(cursor); const fim = new Date(cursor);
    if (view === "mes") {
      ini.setDate(1); ini.setHours(0,0,0,0);
      fim.setMonth(fim.getMonth() + 1); fim.setDate(0); fim.setHours(23,59,59,999);
    } else if (view === "semana") {
      const s = startOfWeek(cursor);
      ini.setTime(s.getTime());
      fim.setTime(s.getTime()); fim.setDate(s.getDate() + 6); fim.setHours(23,59,59,999);
    } else if (view === "dia") {
      ini.setHours(0,0,0,0);
      fim.setHours(23,59,59,999);
    } else {
      ini.setDate(1); ini.setHours(0,0,0,0);
      fim.setMonth(fim.getMonth() + 2); fim.setDate(0); fim.setHours(23,59,59,999);
    }
    return { ini, fim };
  }, [cursor, view]);

  async function carregar() {
    setLoading(true);
    try {
      const dados = await agendaService.list({
        from: range.ini.toISOString(), to: range.fim.toISOString(), status: statusFiltro,
      });
      setCompromissos(dados);
    } catch (e: any) { toast.error(e.message ?? "Erro ao carregar."); }
    finally { setLoading(false); }
  }

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [range.ini.getTime(), range.fim.getTime(), statusFiltro]);

  const filtrados = useMemo(() => {
    return compromissos.filter((c) => {
      if (categoriaFiltro !== "todos" && c.categoria !== categoriaFiltro) return false;
      if (prioridadeFiltro !== "todos" && c.prioridade !== prioridadeFiltro) return false;
      if (busca && !c.titulo.toLowerCase().includes(busca.toLowerCase()) &&
        !(c.local ?? "").toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [compromissos, categoriaFiltro, prioridadeFiltro, busca]);

  function navegar(delta: number) {
    const d = new Date(cursor);
    if (view === "mes") d.setMonth(d.getMonth() + delta);
    else if (view === "semana") d.setDate(d.getDate() + 7 * delta);
    else if (view === "dia") d.setDate(d.getDate() + delta);
    else d.setMonth(d.getMonth() + delta);
    setCursor(d);
  }

  async function alterarStatus(c: Compromisso, status: CompromissoStatus) {
    try { await agendaService.setStatus(c.id, status); toast.success("Status atualizado."); carregar(); }
    catch (e: any) { toast.error(e.message ?? "Erro."); }
  }

  async function confirmarRemover() {
    if (!removendo) return;
    try { await agendaService.remove(removendo.id); toast.success("Compromisso removido."); carregar(); setDetalhe(null); }
    catch (e: any) { toast.error(e.message ?? "Erro."); }
    finally { setRemovendo(null); }
  }

  const tituloPeriodo = useMemo(() => {
    if (view === "dia") return cursor.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    if (view === "semana") {
      const s = startOfWeek(cursor); const e = new Date(s); e.setDate(s.getDate() + 6);
      return `${s.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${e.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`;
    }
    return cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [cursor, view]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            <CalendarDays className="h-7 w-7 text-primary" /> Agenda do Gabinete
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Compromissos, reuniões e visitas do mandato.</p>
        </div>
        <Button onClick={() => { setEditando(null); setFormOpen(true); }} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> Novo compromisso
        </Button>
      </div>

      {/* Barra de controle */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-elegant-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navegar(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => { const d = new Date(); d.setHours(0,0,0,0); setCursor(d); }}>Hoje</Button>
          <Button variant="outline" size="icon" onClick={() => navegar(1)}><ChevronRight className="h-4 w-4" /></Button>
          <span className="ml-2 min-w-[180px] text-sm font-semibold capitalize text-foreground">{tituloPeriodo}</span>
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="mes">Mês</TabsTrigger>
            <TabsTrigger value="semana">Semana</TabsTrigger>
            <TabsTrigger value="dia">Dia</TabsTrigger>
            <TabsTrigger value="lista">Lista</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar título ou local..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Select value={categoriaFiltro} onValueChange={(v) => setCategoriaFiltro(v as any)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas categorias</SelectItem>
            {(Object.keys(CATEGORIA_META) as CompromissoCategoria[]).map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={prioridadeFiltro} onValueChange={(v) => setPrioridadeFiltro(v as any)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas prioridades</SelectItem>
            <SelectItem value="Alta">Alta</SelectItem>
            <SelectItem value="Média">Média</SelectItem>
            <SelectItem value="Baixa">Baixa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as any)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            <SelectItem value="Agendado">Agendado</SelectItem>
            <SelectItem value="Concluído">Concluído</SelectItem>
            <SelectItem value="Cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {(Object.entries(CATEGORIA_META) as [CompromissoCategoria, typeof CATEGORIA_META["Reunião"]][]).map(([k, m]) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${m.bg}`} /> {k}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <>
          {view === "mes"    && <ViewMes cursor={cursor} compromissos={filtrados} onPick={setDetalhe} onDayClick={(d) => { setCursor(d); setView("dia"); }} />}
          {view === "semana" && <ViewSemana cursor={cursor} compromissos={filtrados} onPick={setDetalhe} />}
          {view === "dia"    && <ViewDia cursor={cursor} compromissos={filtrados} onPick={setDetalhe} />}
          {view === "lista"  && <ViewLista compromissos={filtrados} onPick={setDetalhe} onEdit={(c) => { setEditando(c); setFormOpen(true); }} onRemove={setRemovendo} onStatus={alterarStatus} />}
        </>
      )}

      <CompromissoFormDialog open={formOpen} onOpenChange={setFormOpen} compromisso={editando} onSaved={carregar} />

      <DetalheDialog
        compromisso={detalhe}
        onClose={() => setDetalhe(null)}
        onEdit={(c) => { setEditando(c); setFormOpen(true); setDetalhe(null); }}
        onRemove={(c) => setRemovendo(c)}
        onStatus={alterarStatus}
      />

      <AlertDialog open={!!removendo} onOpenChange={(o) => !o && setRemovendo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover compromisso?</AlertDialogTitle>
            <AlertDialogDescription>{removendo?.titulo} — esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarRemover}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------------- VIEW: MÊS ---------------- */
function ViewMes({ cursor, compromissos, onPick, onDayClick }: {
  cursor: Date; compromissos: Compromisso[]; onPick: (c: Compromisso) => void; onDayClick: (d: Date) => void;
}) {
  const ini = new Date(cursor); ini.setDate(1); ini.setHours(0,0,0,0);
  const offset = ini.getDay();
  const start = new Date(ini); start.setDate(start.getDate() - offset);
  const dias = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  const hoje = new Date(); hoje.setHours(0,0,0,0);

  const porDia = new Map<string, Compromisso[]>();
  compromissos.forEach((c) => {
    const k = new Date(c.data_hora).toDateString();
    const arr = porDia.get(k) ?? []; arr.push(c); porDia.set(k, arr);
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-elegant-sm">
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((d) => <div key={d} className="py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {dias.map((d) => {
          const noMes = d.getMonth() === ini.getMonth();
          const ehHoje = sameDay(d, hoje);
          const itens = porDia.get(d.toDateString()) ?? [];
          return (
            <div key={d.toISOString()}
              className={[
                "min-h-[110px] rounded-md border p-1.5 text-left transition-colors",
                noMes ? "bg-background" : "bg-muted/30 text-muted-foreground",
                ehHoje ? "border-primary ring-1 ring-primary/30" : "border-border",
                "hover:bg-accent/30",
              ].join(" ")}
            >
              <button onClick={() => onDayClick(d)} className="mb-1 flex w-full items-center justify-between text-xs font-semibold hover:text-primary">
                <span className={ehHoje ? "text-primary" : ""}>{d.getDate()}</span>
                {itens.length > 0 && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{itens.length}</span>}
              </button>
              <div className="space-y-1">
                {itens.slice(0, 3).map((c) => {
                  const meta = CATEGORIA_META[c.categoria] ?? CATEGORIA_META["Outro"];
                  const Icon = meta.icon;
                  return (
                    <button key={c.id} onClick={() => onPick(c)}
                      title={`${fmtTime(new Date(c.data_hora))} ${c.titulo}`}
                      className={`flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] text-white ${meta.bg} hover:opacity-90`}>
                      <Icon className="h-3 w-3 shrink-0" />
                      <span className="truncate">{fmtTime(new Date(c.data_hora))} {c.titulo}</span>
                    </button>
                  );
                })}
                {itens.length > 3 && (
                  <button onClick={() => onDayClick(d)} className="text-[10px] text-muted-foreground hover:text-primary">+{itens.length - 3} mais</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- VIEW: SEMANA ---------------- */
function ViewSemana({ cursor, compromissos, onPick }: {
  cursor: Date; compromissos: Compromisso[]; onPick: (c: Compromisso) => void;
}) {
  const s = startOfWeek(cursor);
  const dias = Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); return d; });
  const horas = Array.from({ length: 14 }, (_, i) => 7 + i); // 7h..20h
  const hoje = new Date(); hoje.setHours(0,0,0,0);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-elegant-sm">
      <div className="min-w-[800px]">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
          <div />
          {dias.map((d) => (
            <div key={d.toISOString()} className={`border-l px-2 py-2 text-center text-xs ${sameDay(d, hoje) ? "bg-primary/5" : ""}`}>
              <div className="font-semibold uppercase tracking-wide text-muted-foreground">{d.toLocaleDateString("pt-BR", { weekday: "short" })}</div>
              <div className={`text-base font-bold ${sameDay(d, hoje) ? "text-primary" : "text-foreground"}`}>{d.getDate()}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          <div>
            {horas.map((h) => (
              <div key={h} className="h-16 border-b pr-2 text-right text-[10px] text-muted-foreground">{String(h).padStart(2,"0")}:00</div>
            ))}
          </div>
          {dias.map((d) => {
            const itens = compromissos.filter((c) => sameDay(new Date(c.data_hora), d));
            return (
              <div key={d.toISOString()} className="relative border-l">
                {horas.map((h) => <div key={h} className="h-16 border-b" />)}
                {itens.map((c) => {
                  const dt = new Date(c.data_hora);
                  const top = ((dt.getHours() - 7) * 64) + (dt.getMinutes() / 60) * 64;
                  const height = Math.max(28, (c.duracao_min / 60) * 64);
                  if (top < 0 || top > horas.length * 64) return null;
                  const meta = CATEGORIA_META[c.categoria] ?? CATEGORIA_META["Outro"];
                  return (
                    <button key={c.id} onClick={() => onPick(c)}
                      style={{ top: `${top}px`, height: `${height}px` }}
                      className={`absolute left-1 right-1 overflow-hidden rounded-md ${meta.bg} px-1.5 py-1 text-left text-[11px] text-white shadow-sm hover:opacity-90`}>
                      <div className="truncate font-semibold">{fmtTime(dt)} {c.titulo}</div>
                      {c.local && <div className="truncate opacity-90">{c.local}</div>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------- VIEW: DIA ---------------- */
function ViewDia({ cursor, compromissos, onPick }: {
  cursor: Date; compromissos: Compromisso[]; onPick: (c: Compromisso) => void;
}) {
  const itens = compromissos.filter((c) => sameDay(new Date(c.data_hora), cursor)).sort((a, b) => +new Date(a.data_hora) - +new Date(b.data_hora));
  const horas = Array.from({ length: 16 }, (_, i) => 7 + i); // 7h..22h

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-elegant-sm">
        <div className="grid grid-cols-[70px_1fr]">
          <div>
            {horas.map((h) => (
              <div key={h} className="h-20 border-b pr-2 pt-1 text-right text-xs text-muted-foreground">{String(h).padStart(2,"0")}:00</div>
            ))}
          </div>
          <div className="relative border-l">
            {horas.map((h) => <div key={h} className="h-20 border-b" />)}
            {itens.map((c) => {
              const dt = new Date(c.data_hora);
              const top = ((dt.getHours() - 7) * 80) + (dt.getMinutes() / 60) * 80;
              const height = Math.max(40, (c.duracao_min / 60) * 80);
              if (top < 0 || top > horas.length * 80) return null;
              const meta = CATEGORIA_META[c.categoria] ?? CATEGORIA_META["Outro"];
              const Icon = meta.icon;
              return (
                <button key={c.id} onClick={() => onPick(c)}
                  style={{ top: `${top}px`, height: `${height}px` }}
                  className={`absolute left-2 right-2 overflow-hidden rounded-md ${meta.bg} px-3 py-2 text-left text-xs text-white shadow hover:opacity-90 ${PRIORIDADE_BORDER[c.prioridade]} border-l-4 border-l-white/40`}>
                  <div className="flex items-center gap-1.5 font-semibold"><Icon className="h-3.5 w-3.5" /> {fmtTime(dt)} · {c.titulo}</div>
                  {c.local && <div className="mt-0.5 flex items-center gap-1 opacity-90"><MapPin className="h-3 w-3" />{c.local}</div>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-elegant-sm">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Resumo do dia</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold">{itens.length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Concluídos</span><span className="font-semibold text-emerald-600">{itens.filter(i => i.status === "Concluído").length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Agendados</span><span className="font-semibold text-primary">{itens.filter(i => i.status === "Agendado").length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Cancelados</span><span className="font-semibold text-muted-foreground">{itens.filter(i => i.status === "Cancelado").length}</span></div>
        </div>
        {itens.length === 0 && <p className="mt-4 text-xs text-muted-foreground">Nenhum compromisso neste dia.</p>}
      </div>
    </div>
  );
}

/* ---------------- VIEW: LISTA ---------------- */
function ViewLista({ compromissos, onPick, onEdit, onRemove, onStatus }: {
  compromissos: Compromisso[]; onPick: (c: Compromisso) => void;
  onEdit: (c: Compromisso) => void; onRemove: (c: Compromisso) => void;
  onStatus: (c: Compromisso, s: CompromissoStatus) => void;
}) {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const ordenados = [...compromissos].sort((a, b) => +new Date(a.data_hora) - +new Date(b.data_hora));
  const total = ordenados.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const slice = ordenados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (total === 0) {
    return <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">Nenhum compromisso encontrado.</div>;
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-elegant-sm">
      <div className="hidden grid-cols-[120px_90px_140px_1fr_180px_120px_140px] gap-2 border-b bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
        <div>Data</div><div>Hora</div><div>Tipo</div><div>Título</div><div>Local</div><div>Status</div><div className="text-right">Ações</div>
      </div>
      <ul className="divide-y">
        {slice.map((c) => {
          const dt = new Date(c.data_hora);
          const meta = CATEGORIA_META[c.categoria] ?? CATEGORIA_META["Outro"];
          const Icon = meta.icon;
          return (
            <li key={c.id} className={`grid grid-cols-1 items-center gap-2 px-4 py-3 hover:bg-accent/30 md:grid-cols-[120px_90px_140px_1fr_180px_120px_140px] ${PRIORIDADE_BORDER[c.prioridade]}`}>
              <div className="text-sm font-medium">{dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</div>
              <div className="text-sm text-muted-foreground">{fmtTime(dt)}</div>
              <div className="flex items-center gap-1.5 text-sm"><span className={`inline-flex h-6 w-6 items-center justify-center rounded ${meta.bg} text-white`}><Icon className="h-3.5 w-3.5" /></span><span className={meta.color}>{c.categoria}</span></div>
              <button onClick={() => onPick(c)} className="truncate text-left text-sm font-semibold text-foreground hover:text-primary">{c.titulo}</button>
              <div className="truncate text-sm text-muted-foreground">{c.local || "—"}</div>
              <div><Badge variant="outline" className={STATUS_BADGE[c.status]}>{c.status}</Badge></div>
              <div className="flex justify-end gap-1">
                {c.status !== "Concluído" && <Button size="icon" variant="ghost" title="Concluir" onClick={() => onStatus(c, "Concluído")}><Check className="h-4 w-4 text-emerald-600" /></Button>}
                <Button size="icon" variant="ghost" title="Editar" onClick={() => onEdit(c)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" title="Remover" onClick={() => onRemove(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </li>
          );
        })}
      </ul>
      {pages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
          <span className="text-muted-foreground">{total} compromissos · página {page} de {pages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <Button size="sm" variant="outline" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- DETALHE ---------------- */
function DetalheDialog({ compromisso, onClose, onEdit, onRemove, onStatus }: {
  compromisso: Compromisso | null; onClose: () => void;
  onEdit: (c: Compromisso) => void; onRemove: (c: Compromisso) => void;
  onStatus: (c: Compromisso, s: CompromissoStatus) => void;
}) {
  if (!compromisso) return null;
  const c = compromisso;
  const dt = new Date(c.data_hora);
  const fim = new Date(dt.getTime() + c.duracao_min * 60000);
  const meta = CATEGORIA_META[c.categoria] ?? CATEGORIA_META["Outro"];
  const Icon = meta.icon;

  return (
    <Dialog open={!!compromisso} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className={`-mx-6 -mt-6 mb-2 flex items-center gap-2 px-6 py-3 ${meta.bg} text-white rounded-t-lg`}>
            <Icon className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wide">{c.categoria}</span>
          </div>
          <DialogTitle className="text-xl">{c.titulo}</DialogTitle>
          <DialogDescription className="flex flex-wrap gap-2 pt-2">
            <Badge variant="outline" className={STATUS_BADGE[c.status]}>{c.status}</Badge>
            <Badge variant="outline">Prioridade: {c.prioridade}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" />
            <span>{dt.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })} · {fmtTime(dt)} – {fmtTime(fim)} ({c.duracao_min} min)</span>
          </div>
          {c.local && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span>{c.local}</span></div>}
          {c.descricao && <div className="rounded-md bg-muted/50 p-3 text-muted-foreground">{c.descricao}</div>}
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {c.status !== "Concluído" && <Button size="sm" onClick={() => onStatus(c, "Concluído")} className="bg-emerald-600 hover:bg-emerald-700"><Check className="mr-1 h-4 w-4" />Concluir</Button>}
          {c.status !== "Cancelado" && <Button size="sm" variant="outline" onClick={() => onStatus(c, "Cancelado")}><X className="mr-1 h-4 w-4" />Cancelar</Button>}
          <Button size="sm" variant="outline" onClick={() => onEdit(c)}><Pencil className="mr-1 h-4 w-4" />Editar</Button>
          <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={() => onRemove(c)}><Trash2 className="mr-1 h-4 w-4" />Remover</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
