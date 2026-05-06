import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  concorrenciaService,
  type AtividadeTipo,
  type Concorrente,
  type Sentimento,
} from "../services/concorrenciaService";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  concorrentes: Concorrente[];
  defaultConcorrenteId?: string;
};

const TIPOS: AtividadeTipo[] = ["Evento", "Post", "Campanha", "Menção", "Outro"];
const SENTIMENTOS: Sentimento[] = ["Positivo", "Neutro", "Negativo"];

export default function AtividadeFormDialog({
  open,
  onOpenChange,
  onSaved,
  concorrentes,
  defaultConcorrenteId,
}: Props) {
  const [form, setForm] = useState({
    concorrente_id: defaultConcorrenteId ?? "",
    tipo: "Evento" as AtividadeTipo,
    titulo: "",
    descricao: "",
    data_atividade: new Date().toISOString().slice(0, 16),
    bairro: "",
    link: "",
    sentimento: "" as "" | Sentimento,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (defaultConcorrenteId) setForm((f) => ({ ...f, concorrente_id: defaultConcorrenteId }));
  }, [defaultConcorrenteId]);

  async function salvar() {
    if (!form.concorrente_id || !form.titulo.trim()) {
      toast.error("Informe concorrente e título.");
      return;
    }
    setSaving(true);
    try {
      await concorrenciaService.criarAtividade({
        concorrente_id: form.concorrente_id,
        tipo: form.tipo,
        titulo: form.titulo,
        descricao: form.descricao,
        data_atividade: new Date(form.data_atividade).toISOString(),
        bairro: form.bairro,
        link: form.link,
        sentimento: form.sentimento === "" ? null : form.sentimento,
      });
      toast.success("Atividade registrada.");
      onSaved();
      onOpenChange(false);
      setForm((f) => ({ ...f, titulo: "", descricao: "", bairro: "", link: "" }));
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
          <DialogTitle>Registrar atividade de concorrente</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Concorrente *</Label>
              <Select
                value={form.concorrente_id}
                onValueChange={(v) => setForm({ ...form, concorrente_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {concorrentes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as AtividadeTipo })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Título *</Label>
            <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              rows={2}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data/hora</Label>
              <Input
                type="datetime-local"
                value={form.data_atividade}
                onChange={(e) => setForm({ ...form, data_atividade: e.target.value })}
              />
            </div>
            <div>
              <Label>Bairro</Label>
              <Input value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Link</Label>
              <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
            </div>
            <div>
              <Label>Sentimento</Label>
              <Select
                value={form.sentimento}
                onValueChange={(v) => setForm({ ...form, sentimento: v as Sentimento })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Auto (IA)" />
                </SelectTrigger>
                <SelectContent>
                  {SENTIMENTOS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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