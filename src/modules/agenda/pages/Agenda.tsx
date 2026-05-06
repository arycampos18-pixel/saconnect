import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Loader2, MapPin,
  Pencil, Plus, Trash2, X,
} from "lucide-react";
import { toast } from "sonner";
import {
  agendaService, type Compromisso, type CompromissoStatus,
} from "../services/agendaService";
import { CompromissoFormDialog } from "../components/CompromissoFormDialog";

const PRIORIDADE_COR: Record<string, string> = {
  Alta: "bg-destructive/15 text-destructive border-destructive/30",
  Média: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  Baixa: "bg-muted text-muted-foreground",
};
const STATUS_COR: Record<string, string> = {
  Agendado: "bg-primary/10 text-primary",
  Concluído: "bg-emerald-500/15 text-emerald-700",
  Cancelado: "bg-muted text-muted-foreground line-through",
};

export default function Agenda() {
  const [mes, setMes] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; });
  const [statusFiltro, setStatusFiltro] = useState<CompromissoStatus | "todos">("todos");
  const [compromissos, setCompromissos] = useState<Compromisso[]>([]);
  const [loading, setLoading] = useState(true);
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Compromisso | null>(null);
  const [removendo, setRemovendo] = useState<Compromisso | null>(null);

  async function carregar() {
    setLoading(true);
    try {
      const fim = new Date(mes); fim.setMonth(fim.getMonth() + 1);
      const dados = await agendaService.list({
        from: mes.toISOString(),
        to: fim.toISOString(),
        status: statusFiltro,
      });
      setCompromissos(dados);
    } catch (e: any) { toast.error(e.message ?? "Erro ao carregar."); }
    finally { setLoading(false); }
  }

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [mes, statusFiltro]);

  const porDia = useMemo(() => {
    const map = new Map<string, Compromisso[]>();
    compromissos.forEach((c) => {
      const k = new Date(c.data_hora).toISOString().slice(0, 10);
      const arr = map.get(k) ?? []; arr.push(c); map.set(k, arr);
    });
    return map;
  }, [compromissos]);

  const dias = useMemo(() => {
    const ini = new Date(mes);
    const offset = ini.getDay();
    const start = new Date(ini); start.setDate(start.getDate() - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i); return d;
    });
  }, [mes]);

  const compromissosDoDia = diaSelecionado
    ? compromissos.filter((c) => new Date(c.data_hora).toDateString() === diaSelecionado.toDateString())
    : [];

  async function alterarStatus(c: Compromisso, status: CompromissoStatus) {
    try { await agendaService.setStatus(c.id, status); toast.success("Status atualizado."); carregar(); }
    catch (e: any) { toast.error(e.message ?? "Erro."); }
  }

  async function confirmarRemover() {
    if (!removendo) return;
    try { await agendaService.remove(removendo.id); toast.success("Compromisso removido."); carregar(); }
    catch (e: any) { toast.error(e.message ?? "Erro."); }
    finally { setRemovendo(null); }
  }

  const hoje = new Date(); hoje.setHours(0,0,0,0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            <CalendarDays className="h-7 w-7 text-primary" /> Agenda do Gabinete
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Compromissos, reuniões e visitas do mandato.</p>
        </div>
        <Button onClick={() => { setEditando(null); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Novo compromisso
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon"
            onClick={() => { const d = new Date(mes); d.setMonth(d.getMonth() - 1); setMes(d); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[160px] text-center text-lg font-semibold capitalize text-foreground">
            {mes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </span>
          <Button variant="outline" size="icon"
            onClick={() => { const d = new Date(mes); d.setMonth(d.getMonth() + 1); setMes(d); }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm"
            onClick={() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); setMes(d); }}>
            Hoje
          </Button>
        </div>
        <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as any)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="Agendado">Agendado</SelectItem>
            <SelectItem value="Concluído">Concluído</SelectItem>
            <SelectItem value="Cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-elegant-sm">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {dias.map((d) => {
              const noMes = d.getMonth() === mes.getMonth();
              const ehHoje = d.getTime() === hoje.getTime();
              const k = d.toISOString().slice(0, 10);
              const itens = porDia.get(k) ?? [];
              const selecionado = diaSelecionado?.toDateString() === d.toDateString();
              return (
                <button
                  key={k}
                  onClick={() => setDiaSelecionado(d)}
                  className={[
                    "min-h-[80px] rounded-md border p-1 text-left transition-colors",
                    noMes ? "bg-background" : "bg-muted/30 text-muted-foreground",
                    ehHoje ? "border-primary" : "border-border",
                    selecionado ? "ring-2 ring-primary" : "hover:bg-accent/40",
                  ].join(" ")}
                >
                  <div className={`text-xs font-semibold ${ehHoje ? "text-primary" : ""}`}>{d.getDate()}</div>
                  <div className="mt-1 space-y-0.5">
                    {itens.slice(0, 2).map((c) => (
                      <div key={c.id} className="truncate rounded bg-primary/10 px-1 py-0.5 text-[10px] text-primary">
                        {new Date(c.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} {c.titulo}
                      </div>
                    ))}
                    {itens.length > 2 && (
                      <div className="text-[10px] text-muted-foreground">+{itens.length - 2}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {diaSelecionado && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-elegant-sm">
          <h3 className="mb-3 font-semibold text-foreground">
            {diaSelecionado.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </h3>
          {compromissosDoDia.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum compromisso neste dia.</p>
          ) : (
            <ul className="space-y-3">
              {compromissosDoDia.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{c.titulo}</p>
                      <Badge variant="outline">{c.categoria}</Badge>
                      <Badge className={PRIORIDADE_COR[c.prioridade]} variant="outline">{c.prioridade}</Badge>
                      <Badge className={STATUS_COR[c.status]} variant="outline">{c.status}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />
                        {new Date(c.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {c.duracao_min}min
                      </span>
                      {c.local && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.local}</span>}
                    </div>
                    {c.descricao && <p className="mt-2 text-sm text-muted-foreground">{c.descricao}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {c.status !== "Concluído" && (
                      <Button size="icon" variant="ghost" title="Concluir" onClick={() => alterarStatus(c, "Concluído")}>
                        <Check className="h-4 w-4 text-emerald-600" />
                      </Button>
                    )}
                    {c.status !== "Cancelado" && (
                      <Button size="icon" variant="ghost" title="Cancelar" onClick={() => alterarStatus(c, "Cancelado")}>
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" title="Editar" onClick={() => { setEditando(c); setFormOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Remover" onClick={() => setRemovendo(c)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <CompromissoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        compromisso={editando}
        onSaved={carregar}
      />

      <AlertDialog open={!!removendo} onOpenChange={(o) => !o && setRemovendo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover compromisso?</AlertDialogTitle>
            <AlertDialogDescription>
              {removendo?.titulo} — esta ação não pode ser desfeita.
            </AlertDialogDescription>
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