import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Calendar, Plus, Loader2, Eye, Pencil, Trash2, Search, X, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { eventosService, type Evento, type EventoStatus } from "../services/eventosService";
import { EventoFormDialog } from "../components/EventoFormDialog";
import { EventoDetailDialog } from "../components/EventoDetailDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusBadge: Record<EventoStatus, string> = {
  "Planejado": "bg-blue-100 text-blue-800 hover:bg-blue-100",
  "Em Andamento": "bg-primary text-primary-foreground hover:bg-primary",
  "Finalizado": "bg-muted text-muted-foreground hover:bg-muted",
};

export default function Eventos() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Evento | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Evento | null>(null);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<"todos" | EventoStatus>("todos");
  const [dataDe, setDataDe] = useState<Date | undefined>();
  const [dataAte, setDataAte] = useState<Date | undefined>();

  async function reload() {
    setLoading(true);
    try { setEventos(await eventosService.list()); }
    catch (e: any) { toast.error(e.message ?? "Erro ao carregar."); }
    finally { setLoading(false); }
  }

  useEffect(() => { reload(); }, []);

  const eventosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const de = dataDe ? new Date(dataDe.getFullYear(), dataDe.getMonth(), dataDe.getDate(), 0, 0, 0).getTime() : null;
    const ate = dataAte ? new Date(dataAte.getFullYear(), dataAte.getMonth(), dataAte.getDate(), 23, 59, 59).getTime() : null;
    return eventos.filter((ev) => {
      if (termo && !(ev.nome ?? "").toLowerCase().includes(termo)) return false;
      if (statusFiltro !== "todos" && ev.status !== statusFiltro) return false;
      const ts = new Date(ev.data_hora).getTime();
      if (de !== null && ts < de) return false;
      if (ate !== null && ts > ate) return false;
      return true;
    });
  }, [eventos, busca, statusFiltro, dataDe, dataAte]);

  const filtrosAtivos = busca.trim() !== "" || statusFiltro !== "todos" || !!dataDe || !!dataAte;
  function limparFiltros() {
    setBusca(""); setStatusFiltro("todos"); setDataDe(undefined); setDataAte(undefined);
  }

  function abrirNovo() { setEditing(null); setFormOpen(true); }
  function abrirEdicao(ev: Evento) { setEditing(ev); setDetailOpen(false); setFormOpen(true); }
  function abrirDetalhes(ev: Evento) { setSelected(ev); setDetailOpen(true); }

  async function deletar(ev: Evento) {
    if (!confirm(`Deletar "${ev.nome}"?`)) return;
    try { await eventosService.remove(ev.id); toast.success("Evento removido."); reload(); }
    catch (e: any) { toast.error(e.message ?? "Erro."); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            <Calendar className="h-7 w-7 text-primary" /> Eventos Sociais
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie eventos de saúde, educação, assistência e mais.
          </p>
        </div>
        <Button onClick={abrirNovo}><Plus className="mr-2 h-4 w-4" />Novo evento</Button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-elegant-sm sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título..."
            className="pl-9"
          />
        </div>
        <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as typeof statusFiltro)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="Planejado">Planejado</SelectItem>
            <SelectItem value="Em Andamento">Em Andamento</SelectItem>
            <SelectItem value="Finalizado">Finalizado</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-start text-left font-normal sm:w-[170px]", !dataDe && "text-muted-foreground")}>
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
            <Button variant="outline" className={cn("w-full justify-start text-left font-normal sm:w-[170px]", !dataAte && "text-muted-foreground")}>
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
        ) : eventos.length === 0 ? (
          <div className="py-16 text-center">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhum evento cadastrado.</p>
            <Button className="mt-4" onClick={abrirNovo}><Plus className="mr-2 h-4 w-4" />Criar primeiro evento</Button>
          </div>
        ) : eventosFiltrados.length === 0 ? (
          <div className="py-16 text-center">
            <Search className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhum evento corresponde aos filtros.</p>
            <Button className="mt-4" variant="outline" onClick={limparFiltros}>Limpar filtros</Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-accent/40 hover:bg-accent/40">
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="text-center">Inscritos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eventosFiltrados.map((ev) => (
                <TableRow key={ev.id} className="hover:bg-accent/30">
                  <TableCell className="font-medium">{ev.nome}</TableCell>
                  <TableCell><Badge variant="outline">{ev.tipo}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(ev.data_hora).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">{ev.local}</TableCell>
                  <TableCell className="text-sm">{ev.responsavel?.nome ?? "—"}</TableCell>
                  <TableCell className="text-center">{ev.inscritos_count ?? 0}{ev.limite_inscritos ? `/${ev.limite_inscritos}` : ""}</TableCell>
                  <TableCell><Badge className={statusBadge[ev.status]}>{ev.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => abrirDetalhes(ev)}><Eye className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => abrirEdicao(ev)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => deletar(ev)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <EventoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        evento={editing}
        onSaved={reload}
      />
      <EventoDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        evento={selected}
        onEdit={() => selected && abrirEdicao(selected)}
        onDeleted={reload}
      />
    </div>
  );
}
