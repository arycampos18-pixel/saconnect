import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Calendar, Plus, Loader2, Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { eventosService, type Evento, type EventoStatus } from "../services/eventosService";
import { EventoFormDialog } from "../components/EventoFormDialog";
import { EventoDetailDialog } from "../components/EventoDetailDialog";

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

  async function reload() {
    setLoading(true);
    try { setEventos(await eventosService.list()); }
    catch (e: any) { toast.error(e.message ?? "Erro ao carregar."); }
    finally { setLoading(false); }
  }

  useEffect(() => { reload(); }, []);

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

      <div className="rounded-xl border border-border bg-card shadow-elegant-sm">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : eventos.length === 0 ? (
          <div className="py-16 text-center">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhum evento cadastrado.</p>
            <Button className="mt-4" onClick={abrirNovo}><Plus className="mr-2 h-4 w-4" />Criar primeiro evento</Button>
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
              {eventos.map((ev) => (
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
