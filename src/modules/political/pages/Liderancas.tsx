import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { liderancasCabosService, type Lideranca } from "../services/liderancasCabosService";
import { useCompany } from "@/modules/settings/contexts/CompanyContext";

export default function Liderancas() {
  const qc = useQueryClient();
  const { currentCompany } = useCompany();
  const { data = [], isLoading } = useQuery({
    queryKey: ["liderancas"],
    queryFn: () => liderancasCabosService.listarLiderancas(),
  });

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Lideranca | null>(null);
  const [form, setForm] = useState<Partial<Lideranca>>({});

  function openNew() { setEdit(null); setForm({ status: "ativo" }); setOpen(true); }
  function openEdit(l: Lideranca) { setEdit(l); setForm(l); setOpen(true); }

  async function save() {
    if (!form.nome) return toast.error("Informe o nome");
    try {
      if (edit) {
        await liderancasCabosService.atualizarLideranca(edit.id, form);
        toast.success("Liderança atualizada");
      } else {
        await liderancasCabosService.criarLideranca({ ...form, company_id: currentCompany?.id });
        toast.success("Liderança criada");
      }
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["liderancas"] });
    } catch (e: any) { toast.error(e.message); }
  }

  async function remove(id: string) {
    if (!confirm("Remover esta liderança?")) return;
    try {
      await liderancasCabosService.removerLideranca(id);
      qc.invalidateQueries({ queryKey: ["liderancas"] });
      toast.success("Removida");
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Star className="h-6 w-6 text-primary" />Lideranças</h1>
          <p className="text-sm text-muted-foreground">Gestão de lideranças e suas regiões.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nova Liderança</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Lideranças cadastradas ({data.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma liderança ainda.</p>
          ) : (
            <div className="space-y-2">
              {data.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {l.nome}
                      <Badge variant={l.status === "ativo" ? "default" : "secondary"}>{l.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {l.regiao || "—"} · {l.telefone || "sem telefone"} · {l.email || "sem email"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(l)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(l.id)}><Trash2 className="h-4 w-4" /></Button>
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
            <DialogTitle>{edit ? "Editar liderança" : "Nova liderança"}</DialogTitle>
            <DialogDescription>Preencha os dados da liderança.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Email</Label><Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
            </div>
            <div><Label>Região</Label><Input value={form.regiao ?? ""} onChange={(e) => setForm({ ...form, regiao: e.target.value })} placeholder="Ex: Zona Norte" /></div>
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