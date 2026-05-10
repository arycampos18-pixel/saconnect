import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { liderancasCabosService, type Cabo } from "../services/liderancasCabosService";
import { useCompany } from "@/modules/settings/contexts/CompanyContext";

export default function CabosEleitorais() {
  const qc = useQueryClient();
  const { currentCompany } = useCompany();
  const { data = [], isLoading } = useQuery({ queryKey: ["cabos"], queryFn: () => liderancasCabosService.listarCabos() });
  const { data: liderancas = [] } = useQuery({ queryKey: ["liderancas"], queryFn: () => liderancasCabosService.listarLiderancas() });

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Cabo | null>(null);
  const [form, setForm] = useState<Partial<Cabo>>({});

  function openNew() { setEdit(null); setForm({ status: "ativo" }); setOpen(true); }
  function openEdit(c: Cabo) { setEdit(c); setForm(c); setOpen(true); }

  async function save() {
    if (!form.nome) return toast.error("Informe o nome");
    try {
      if (edit) {
        await liderancasCabosService.atualizarCabo(edit.id, form);
        toast.success("Cabo atualizado");
      } else {
        await liderancasCabosService.criarCabo({ ...form, company_id: currentCompany?.id });
        toast.success("Cabo criado");
      }
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["cabos"] });
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(id: string) {
    if (!confirm("Remover este cabo?")) return;
    await liderancasCabosService.removerCabo(id);
    qc.invalidateQueries({ queryKey: ["cabos"] });
    toast.success("Removido");
  }

  const liderancaNome = (id?: string | null) => liderancas.find((l) => l.id === id)?.nome ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Megaphone className="h-6 w-6 text-primary" />Cabos Eleitorais</h1>
          <p className="text-sm text-muted-foreground">Gestão dos cabos vinculados às lideranças.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Cabo</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Cabos cadastrados ({data.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cabo cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {data.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {c.nome}
                      <Badge variant={c.status === "ativo" ? "default" : "secondary"}>{c.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Liderança: {liderancaNome(c.lideranca_id)} · Zona: {c.zona || "—"} · {c.telefone || "sem telefone"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit ? "Editar cabo" : "Novo cabo eleitoral"}</DialogTitle>
            <DialogDescription>Vincule o cabo a uma liderança.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Email</Label><Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
            </div>
            <div>
              <Label>Liderança</Label>
              <Select value={form.lideranca_id ?? ""} onValueChange={(v) => setForm({ ...form, lideranca_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {liderancas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Zona</Label><Input value={form.zona ?? ""} onChange={(e) => setForm({ ...form, zona: e.target.value })} /></div>
              <div><Label>Rua</Label><Input value={form.rua ?? ""} onChange={(e) => setForm({ ...form, rua: e.target.value })} /></div>
            </div>
            <div><Label>Observações</Label><Textarea value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}