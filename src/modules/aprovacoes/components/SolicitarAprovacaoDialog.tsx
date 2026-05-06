import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { aprovacoesService, type AprovacaoTipo } from "../services/aprovacoesService";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

export function SolicitarAprovacaoDialog({ open, onOpenChange, onSaved }: Props) {
  const [tipo, setTipo] = useState<AprovacaoTipo>("Outro");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!titulo.trim()) { toast.error("Informe um título"); return; }
    setSaving(true);
    try {
      await aprovacoesService.solicitar({ tipo, titulo, descricao });
      toast.success("Solicitação enviada");
      setTitulo(""); setDescricao(""); setTipo("Outro");
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
        <DialogHeader><DialogTitle>Nova solicitação</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Campanha">Campanha</SelectItem>
                <SelectItem value="Evento">Evento</SelectItem>
                <SelectItem value="ExclusaoEmMassa">Exclusão em massa</SelectItem>
                <SelectItem value="EdicaoLideranca">Edição de liderança</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Título</Label><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="O que precisa ser aprovado?" /></div>
          <div><Label>Detalhes</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={5} placeholder="Justificativa, contexto, etc." /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>Solicitar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}