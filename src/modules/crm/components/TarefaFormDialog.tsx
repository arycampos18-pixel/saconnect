import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { crmService } from "../services/crmService";
import { supabase } from "@/integrations/supabase/client";
import { DropdownComNovoCadastro } from "@/shared/components/forms/DropdownComNovoCadastro";
import { useCatalogoCustomizado } from "@/shared/hooks/useCatalogoCustomizado";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

export function TarefaFormDialog({ open, onOpenChange, onSaved }: Props) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState<"Baixa" | "Média" | "Alta">("Média");
  const [vencimento, setVencimento] = useState("");
  const [eleitorId, setEleitorId] = useState<string>("none");
  const [eleitores, setEleitores] = useState<{ id: string; nome: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const catPrioridade = useCatalogoCustomizado("crm_prioridade");

  useEffect(() => {
    if (open) {
      supabase.from("eleitores").select("id, nome").order("nome").limit(500).then(({ data }) => {
        setEleitores((data as any) ?? []);
      });
    }
  }, [open]);

  const submit = async () => {
    if (!titulo.trim()) { toast.error("Informe o título"); return; }
    setSaving(true);
    try {
      await crmService.criarTarefa({
        titulo,
        descricao: descricao || null,
        prioridade,
        vencimento: vencimento ? new Date(vencimento).toISOString() : null,
        eleitor_id: eleitorId === "none" ? null : eleitorId,
      });
      toast.success("Tarefa criada");
      setTitulo(""); setDescricao(""); setVencimento(""); setEleitorId("none");
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error("Erro", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova tarefa</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Título</Label><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
          <div><Label>Descrição</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Prioridade</Label>
              <DropdownComNovoCadastro
                campo="cat_crm_prioridade"
                label="prioridade"
                opcoes={catPrioridade.items}
                value={catPrioridade.items.find((s) => s.nome === prioridade)?.id ?? null}
                onChange={(id) => { const s = catPrioridade.items.find((x) => x.id === id); if (s) setPrioridade(s.nome as any); }}
                onCreated={(item) => { catPrioridade.addLocal({ id: item.id, nome: item.nome }); setPrioridade(item.nome as any); }}
              />
            </div>
            <div>
              <Label>Vencimento</Label>
              <Input type="datetime-local" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Eleitor relacionado</Label>
            <Select value={eleitorId} onValueChange={setEleitorId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {eleitores.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}