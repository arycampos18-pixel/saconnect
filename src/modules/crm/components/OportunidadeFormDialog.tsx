import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { crmService, type Etapa } from "../services/crmService";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  etapas: Etapa[];
  etapaInicialId?: string;
  onSaved: () => void;
}

export function OportunidadeFormDialog({ open, onOpenChange, etapas, etapaInicialId, onSaved }: Props) {
  const [titulo, setTitulo] = useState("");
  const [eleitorId, setEleitorId] = useState<string>("none");
  const [etapaId, setEtapaId] = useState<string>(etapaInicialId ?? "");
  const [valor, setValor] = useState(1);
  const [observacoes, setObservacoes] = useState("");
  const [eleitores, setEleitores] = useState<{ id: string; nome: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setEtapaId(etapaInicialId ?? etapas[0]?.id ?? "");
      supabase.from("eleitores").select("id, nome").order("nome").limit(500).then(({ data }) => {
        setEleitores((data as any) ?? []);
      });
    }
  }, [open, etapaInicialId, etapas]);

  const submit = async () => {
    if (!titulo.trim() || !etapaId) {
      toast.error("Preencha título e etapa");
      return;
    }
    setSaving(true);
    try {
      await crmService.criarOportunidade({
        titulo,
        etapa_id: etapaId,
        eleitor_id: eleitorId === "none" ? null : eleitorId,
        valor_estimado: valor,
        observacoes: observacoes || null,
      });
      toast.success("Oportunidade criada");
      setTitulo(""); setEleitorId("none"); setValor(1); setObservacoes("");
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
        <DialogHeader><DialogTitle>Nova oportunidade</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Título</Label><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
          <div>
            <Label>Eleitor</Label>
            <Select value={eleitorId} onValueChange={setEleitorId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {eleitores.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Etapa</Label>
              <Select value={etapaId} onValueChange={setEtapaId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {etapas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Votos estimados</Label>
              <Input type="number" value={valor} onChange={(e) => setValor(Number(e.target.value))} />
            </div>
          </div>
          <div><Label>Observações</Label><Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}