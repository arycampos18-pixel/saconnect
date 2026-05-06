import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { BarChart2, Plus, Loader2, Eye, Trash2, Power, PowerOff, Share2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { pesquisaService, type Pesquisa, type PesquisaStatus } from "../services/pesquisaService";
import { CompartilharDialog } from "../components/CompartilharDialog";

const statusBadge: Record<PesquisaStatus, string> = {
  Rascunho: "bg-muted text-muted-foreground hover:bg-muted",
  Ativa: "bg-primary text-primary-foreground hover:bg-primary",
  Finalizada: "bg-blue-100 text-blue-800 hover:bg-blue-100",
};

export default function Pesquisas() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Pesquisa[]>([]);
  const [loading, setLoading] = useState(true);
  const [share, setShare] = useState<Pesquisa | null>(null);

  async function reload() {
    setLoading(true);
    try { setItems(await pesquisaService.list()); }
    catch (e: any) { toast.error(e.message ?? "Erro"); }
    finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, []);

  async function toggleStatus(p: Pesquisa) {
    const novo: PesquisaStatus = p.status === "Ativa" ? "Finalizada" : "Ativa";
    try { await pesquisaService.setStatus(p.id, novo); toast.success(`Pesquisa ${novo.toLowerCase()}.`); reload(); }
    catch (e: any) { toast.error(e.message ?? "Erro"); }
  }

  async function deletar(p: Pesquisa) {
    if (!confirm(`Deletar "${p.titulo}"?`)) return;
    try { await pesquisaService.remove(p.id); toast.success("Removida."); reload(); }
    catch (e: any) { toast.error(e.message ?? "Erro"); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            <BarChart2 className="h-7 w-7 text-primary" /> Pesquisa Eleitoral
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie e distribua pesquisas rápidas para sua base.
          </p>
        </div>
        <Button onClick={() => navigate("/app/pesquisas/nova")}><Plus className="mr-2 h-4 w-4" />Nova pesquisa</Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-elegant-sm">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <BarChart2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhuma pesquisa criada.</p>
            <Button className="mt-4" onClick={() => navigate("/app/pesquisas/nova")}><Plus className="mr-2 h-4 w-4" />Criar primeira</Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-accent/40 hover:bg-accent/40">
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="text-center">Respostas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id} className="hover:bg-accent/30">
                  <TableCell className="font-medium">{p.titulo}</TableCell>
                  <TableCell><Badge variant="outline">{p.tipo}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="text-center">{p.sessoes_count ?? 0}</TableCell>
                  <TableCell><Badge className={statusBadge[p.status]}>{p.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/app/pesquisas/${p.id}`)} title="Resultados"><Eye className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/app/pesquisas/${p.id}/editar`)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setShare(p)} title="Compartilhar" disabled={p.status !== "Ativa"}><Share2 className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleStatus(p)} title={p.status === "Ativa" ? "Finalizar" : "Ativar"}>
                      {p.status === "Ativa" ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deletar(p)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <CompartilharDialog pesquisa={share} open={!!share} onOpenChange={(v) => !v && setShare(null)} />
    </div>
  );
}
