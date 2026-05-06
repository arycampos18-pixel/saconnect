import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { concorrenciaService } from "../services/concorrenciaService";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
};

export default function ConcorrenteFormDialog({ open, onOpenChange, onSaved }: Props) {
  const [form, setForm] = useState({
    nome: "",
    partido: "",
    regiao: "",
    seguidores: 0,
    engajamento_pct: 0,
    observacoes: "",
  });
  const [saving, setSaving] = useState(false);

  async function salvar() {
    if (!form.nome.trim()) {
      toast.error("Informe o nome do concorrente.");
      return;
    }
    setSaving(true);
    try {
      await concorrenciaService.criarConcorrente(form);
      toast.success("Concorrente adicionado.");
      onSaved();
      onOpenChange(false);
      setForm({ nome: "", partido: "", regiao: "", seguidores: 0, engajamento_pct: 0, observacoes: "" });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar concorrente</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Nome *</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Partido</Label>
              <Input value={form.partido} onChange={(e) => setForm({ ...form, partido: e.target.value })} />
            </div>
            <div>
              <Label>Região</Label>
              <Input value={form.regiao} onChange={(e) => setForm({ ...form, regiao: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Seguidores</Label>
              <Input
                type="number"
                value={form.seguidores}
                onChange={(e) => setForm({ ...form, seguidores: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Engajamento (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={form.engajamento_pct}
                onChange={(e) => setForm({ ...form, engajamento_pct: Number(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea
              rows={2}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={saving}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}