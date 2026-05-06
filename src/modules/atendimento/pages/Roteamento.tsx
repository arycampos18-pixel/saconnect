import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, Loader2, Route, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { roteamentoService, type RegraRoteamento } from "../services/roteamentoService";
import { departamentoService } from "../services/departamentoService";

type Form = { id?: string; nome: string; palavras: string; departamento_id: string; prioridade: number; ativo: boolean };
const VAZIO: Form = { nome: "", palavras: "", departamento_id: "", prioridade: 0, ativo: true };

export default function Roteamento() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState<Form>(VAZIO);

  const { data: regras = [], isLoading } = useQuery({
    queryKey: ["roteamento-regras"], queryFn: () => roteamentoService.listar(),
  });
  const { data: departamentos = [] } = useQuery({
    queryKey: ["departamentos-list"], queryFn: () => departamentoService.listarTodos(),
  });

  const editar = (r: RegraRoteamento) => {
    setForm({
      id: r.id, nome: r.nome,
      palavras: (r.palavras_chave ?? []).join(", "),
      departamento_id: r.departamento_id, prioridade: r.prioridade, ativo: r.ativo,
    });
    setOpen(true);
  };

  const novo = () => { setForm(VAZIO); setOpen(true); };

  const salvar = async () => {
    const palavras = form.palavras.split(",").map((s) => s.trim()).filter(Boolean);
    if (!form.nome.trim() || !form.departamento_id || palavras.length === 0) {
      toast.error("Preencha nome, departamento e ao menos uma palavra-chave");
      return;
    }
    setSalvando(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        palavras_chave: palavras,
        departamento_id: form.departamento_id,
        prioridade: form.prioridade,
        ativo: form.ativo,
      };
      if (form.id) await roteamentoService.atualizar(form.id, payload);
      else await roteamentoService.criar(payload);
      toast.success("Regra salva");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["roteamento-regras"] });
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao salvar");
    } finally { setSalvando(false); }
  };

  const remover = async (id: string) => {
    if (!confirm("Remover esta regra?")) return;
    try {
      await roteamentoService.remover(id);
      toast.success("Removida");
      qc.invalidateQueries({ queryKey: ["roteamento-regras"] });
    } catch (e: any) { toast.error(e.message ?? "Erro"); }
  };

  const toggleAtivo = async (r: RegraRoteamento) => {
    try {
      await roteamentoService.atualizar(r.id, { ativo: !r.ativo });
      qc.invalidateQueries({ queryKey: ["roteamento-regras"] });
    } catch (e: any) { toast.error(e.message ?? "Erro"); }
  };

  const nomeDep = (id: string) => departamentos.find((d) => d.id === id)?.nome ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Route className="h-6 w-6" /> Auto-roteamento</h1>
          <p className="text-sm text-muted-foreground">
            Encaminha automaticamente conversas pendentes ao departamento certo com base em palavras-chave.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={novo}><Plus className="mr-2 h-4 w-4" /> Nova regra</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Editar regra" : "Nova regra"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Saúde" />
              </div>
              <div>
                <Label>Palavras-chave (separadas por vírgula)</Label>
                <Input
                  value={form.palavras}
                  onChange={(e) => setForm({ ...form, palavras: e.target.value })}
                  placeholder="saúde, posto, médico, remédio, hospital"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Comparação sem acento/maiúscula. Basta uma palavra dar match.
                </p>
              </div>
              <div>
                <Label>Departamento de destino</Label>
                <Select value={form.departamento_id} onValueChange={(v) => setForm({ ...form, departamento_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {departamentos.filter((d) => d.ativo).map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Prioridade</Label>
                  <Input type="number" value={form.prioridade}
                    onChange={(e) => setForm({ ...form, prioridade: Number(e.target.value) })} />
                  <p className="mt-1 text-xs text-muted-foreground">Maior = avaliada primeiro.</p>
                </div>
                <div className="flex items-end gap-2 pb-2">
                  <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
                  <Label>Ativa</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={salvar} disabled={salvando}>
                {salvando && <Loader2 className="mr-2 h-3 w-3 animate-spin" />} Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Regras configuradas</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : regras.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma regra criada ainda. Crie uma para começar a rotear conversas automaticamente.
            </p>
          ) : (
            <ul className="space-y-2">
              {regras.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.nome}</span>
                      <Badge variant="outline">prio {r.prioridade}</Badge>
                      <Badge variant={r.ativo ? "default" : "secondary"}>{r.ativo ? "Ativa" : "Inativa"}</Badge>
                      <span className="text-xs text-muted-foreground">→ {nomeDep(r.departamento_id)}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {r.palavras_chave.map((k) => (
                        <Badge key={k} variant="secondary" className="text-[10px]">{k}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch checked={r.ativo} onCheckedChange={() => toggleAtivo(r)} />
                    <Button size="icon" variant="ghost" onClick={() => editar(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remover(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
