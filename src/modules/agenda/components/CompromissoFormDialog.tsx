import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  agendaService, type Compromisso, type CompromissoCategoria,
  type CompromissoPrioridade, type CompromissoStatus,
} from "../services/agendaService";

const CATEGORIAS: CompromissoCategoria[] = ["Reunião", "Visita", "Evento", "Audiência", "Outro"];
const PRIORIDADES: CompromissoPrioridade[] = ["Baixa", "Média", "Alta"];
const STATUS: CompromissoStatus[] = ["Agendado", "Concluído", "Cancelado"];

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

export function CompromissoFormDialog({
  open, onOpenChange, compromisso, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  compromisso?: Compromisso | null;
  onSaved: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [local, setLocal] = useState("");
  const [dataHora, setDataHora] = useState("");
  const [duracao, setDuracao] = useState(60);
  const [categoria, setCategoria] = useState<CompromissoCategoria>("Reunião");
  const [prioridade, setPrioridade] = useState<CompromissoPrioridade>("Média");
  const [status, setStatus] = useState<CompromissoStatus>("Agendado");
  const [lembrete, setLembrete] = useState(30);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (compromisso) {
      setTitulo(compromisso.titulo);
      setDescricao(compromisso.descricao ?? "");
      setLocal(compromisso.local ?? "");
      setDataHora(toLocalInput(compromisso.data_hora));
      setDuracao(compromisso.duracao_min);
      setCategoria(compromisso.categoria);
      setPrioridade(compromisso.prioridade);
      setStatus(compromisso.status);
      setLembrete(compromisso.lembrete_min);
    } else {
      setTitulo(""); setDescricao(""); setLocal("");
      const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1);
      setDataHora(toLocalInput(d.toISOString()));
      setDuracao(60); setCategoria("Reunião"); setPrioridade("Média"); setStatus("Agendado"); setLembrete(30);
    }
  }, [open, compromisso]);

  async function salvar() {
    if (!titulo.trim()) { toast.error("Informe o título."); return; }
    if (!dataHora) { toast.error("Informe a data e hora."); return; }
    setSaving(true);
    try {
      const payload = {
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        local: local.trim() || null,
        data_hora: new Date(dataHora).toISOString(),
        duracao_min: duracao,
        categoria, prioridade, status,
        lembrete_min: lembrete,
      };
      if (compromisso) await agendaService.update(compromisso.id, payload);
      else await agendaService.create(payload);
      toast.success(compromisso ? "Compromisso atualizado." : "Compromisso criado.");
      onSaved();
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message ?? "Erro ao salvar."); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{compromisso ? "Editar compromisso" : "Novo compromisso"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Título *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} />
          </div>
          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} maxLength={500} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Data e hora *</Label>
              <Input type="datetime-local" value={dataHora} onChange={(e) => setDataHora(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Duração (min)</Label>
              <Input type="number" min={15} step={15} value={duracao} onChange={(e) => setDuracao(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Local</Label>
            <Input value={local} onChange={(e) => setLocal(e.target.value)} maxLength={200} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Categoria</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v as CompromissoCategoria)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Prioridade</Label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as CompromissoPrioridade)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORIDADES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CompromissoStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Lembrete (minutos antes)</Label>
            <Input type="number" min={0} step={5} value={lembrete} onChange={(e) => setLembrete(Number(e.target.value))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}