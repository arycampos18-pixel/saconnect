import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Calendar, MapPin, User2, CheckCircle2, Loader2, Search, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  eventosService, type Evento, type Inscricao,
} from "../services/eventosService";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  evento: Evento | null;
  onEdit: () => void;
  onDeleted: () => void;
};

export function EventoDetailDialog({ open, onOpenChange, evento, onEdit, onDeleted }: Props) {
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<{ id: string; nome: string; telefone: string }[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (open && evento) {
      reload();
    } else {
      setInscricoes([]); setBusca(""); setResultados([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, evento?.id]);

  async function reload() {
    if (!evento) return;
    setLoading(true);
    try { setInscricoes(await eventosService.inscricoes(evento.id)); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!busca.trim()) { setResultados([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await eventosService.buscarEleitores(busca);
        const inscritos = new Set(inscricoes.map((i) => i.eleitor_id));
        setResultados(r.filter((e) => !inscritos.has(e.id)));
      } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [busca, inscricoes]);

  async function inscrever(eleitorId: string) {
    if (!evento) return;
    try {
      await eventosService.inscrever(evento.id, eleitorId);
      toast.success("Inscrito com sucesso.");
      setBusca(""); setResultados([]);
      reload();
    } catch (e: any) { toast.error(e.message ?? "Erro."); }
  }

  async function togglePresenca(insc: Inscricao) {
    try {
      await eventosService.setPresenca(insc.id, !insc.presente);
      reload();
    } catch (e: any) { toast.error(e.message ?? "Erro."); }
  }

  async function removerInsc(id: string) {
    try {
      await eventosService.removerInscricao(id);
      toast.success("Inscrição removida.");
      reload();
    } catch (e: any) { toast.error(e.message ?? "Erro."); }
  }

  async function deletarEvento() {
    if (!evento) return;
    if (!confirm("Tem certeza que deseja deletar este evento?")) return;
    try {
      await eventosService.remove(evento.id);
      toast.success("Evento removido.");
      onOpenChange(false);
      onDeleted();
    } catch (e: any) { toast.error(e.message ?? "Erro."); }
  }

  if (!evento) return null;
  const presentes = inscricoes.filter((i) => i.presente).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{evento.nome}</DialogTitle>
              <DialogDescription>{evento.tipo} • {evento.status}</DialogDescription>
            </div>
            <Badge variant="secondary">{inscricoes.length} inscritos</Badge>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
            <Calendar className="h-4 w-4 text-primary" />
            <span>{new Date(evento.data_hora).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="truncate">{evento.local}</span>
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
            <User2 className="h-4 w-4 text-primary" />
            <span className="truncate">{evento.responsavel?.nome ?? "Sem responsável"}</span>
          </div>
        </div>

        {evento.descricao && <p className="text-sm text-muted-foreground">{evento.descricao}</p>}

        <div className="rounded-md border p-3">
          <Label className="mb-2 block text-sm font-medium">Check-in / inscrever eleitor</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nome ou telefone..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          {searching && <p className="mt-2 text-xs text-muted-foreground">Buscando...</p>}
          {resultados.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded border">
              {resultados.map((r) => (
                <button key={r.id} type="button" onClick={() => inscrever(r.id)}
                  className="flex w-full items-center justify-between border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-accent">
                  <span><span className="font-medium">{r.nome}</span> <span className="text-muted-foreground">• {r.telefone}</span></span>
                  <span className="text-xs text-primary">+ Inscrever</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Inscritos</h3>
            <span className="text-xs text-muted-foreground">{presentes}/{inscricoes.length} presentes</span>
          </div>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : inscricoes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum inscrito ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-center">Presente</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inscricoes.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.eleitor?.nome}</TableCell>
                    <TableCell>{i.eleitor?.telefone}</TableCell>
                    <TableCell className="text-center">
                      {i.presente ? <Badge className="bg-primary text-primary-foreground"><CheckCircle2 className="mr-1 h-3 w-3" />Presente</Badge> : <Badge variant="outline">Pendente</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant={i.presente ? "outline" : "default"} onClick={() => togglePresenca(i)}>
                        {i.presente ? "Desfazer" : "Check-in"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removerInsc(i.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={deletarEvento}><Trash2 className="mr-2 h-4 w-4" />Deletar</Button>
          <Button onClick={onEdit}><Pencil className="mr-2 h-4 w-4" />Editar evento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}
