import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { eventosService, type Evento, type EventoInput, type EventoStatus } from "../services/eventosService";
import { catalogosService, type Lideranca } from "@/modules/eleitores/services/catalogosService";
import { Loader2 } from "lucide-react";
import { DropdownComNovoCadastro } from "@/shared/components/forms/DropdownComNovoCadastro";
import { supabase } from "@/integrations/supabase/client";
import { useCatalogoCustomizado } from "@/shared/hooks/useCatalogoCustomizado";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  evento?: Evento | null;
  onSaved: () => void;
};

export function EventoFormDialog({ open, onOpenChange, evento, onSaved }: Props) {
  const [liderancas, setLiderancas] = useState<Lideranca[]>([]);
  const [tipos, setTipos] = useState<{ id: string; nome: string }[]>([]);
  const statusCat = useCatalogoCustomizado("evento_status");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EventoInput>({
    nome: "",
    tipo: "Saúde",
    data_hora: "",
    local: "",
    descricao: "",
    responsavel_id: null,
    limite_inscritos: null,
    status: "Planejado",
  });

  useEffect(() => {
    if (!open) return;
    catalogosService.liderancas().then(setLiderancas).catch(() => {});
    supabase
      .from("evento_tipos" as any)
      .select("id, nome")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => setTipos(((data as any[]) ?? []).map((t) => ({ id: t.id, nome: t.nome }))));
    if (evento) {
      setForm({
        nome: evento.nome,
        tipo: evento.tipo,
        data_hora: evento.data_hora.slice(0, 16),
        local: evento.local,
        descricao: evento.descricao ?? "",
        responsavel_id: evento.responsavel_id,
        limite_inscritos: evento.limite_inscritos,
        status: evento.status,
      });
    } else {
      setForm({
        nome: "", tipo: "Saúde", data_hora: "", local: "",
        descricao: "", responsavel_id: null, limite_inscritos: null, status: "Planejado",
      });
    }
  }, [open, evento]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.data_hora || !form.local.trim()) {
      toast.error("Preencha nome, data e local.");
      return;
    }
    setSaving(true);
    try {
      const payload: EventoInput = {
        ...form,
        data_hora: new Date(form.data_hora).toISOString(),
        descricao: form.descricao || null,
        limite_inscritos: form.limite_inscritos || null,
        responsavel_id: form.responsavel_id || null,
      };
      if (evento) {
        await eventosService.update(evento.id, payload);
        toast.success("Evento atualizado.");
      } else {
        await eventosService.create(payload);
        toast.success("Evento criado.");
      }
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{evento ? "Editar Evento" : "Novo Evento"}</DialogTitle>
          <DialogDescription>Preencha os dados do evento social.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome do evento *</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} maxLength={120} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Tipo *</Label>
              <DropdownComNovoCadastro
                campo="tipos_evento"
                label="tipo"
                opcoes={tipos}
                value={tipos.find((t) => t.nome === form.tipo)?.id ?? null}
                onChange={(id) => {
                  const t = tipos.find((x) => x.id === id);
                  if (t) setForm((f) => ({ ...f, tipo: t.nome }));
                }}
                placeholder="Selecionar tipo..."
                onCreated={(item) => {
                  setTipos((prev) => [...prev, { id: item.id, nome: item.nome }]);
                  setForm((f) => ({ ...f, tipo: item.nome }));
                }}
              />
            </div>
            <div>
              <Label>Status</Label>
              <DropdownComNovoCadastro
                campo="cat_evento_status"
                label="status"
                opcoes={statusCat.items}
                value={statusCat.items.find((s) => s.nome === form.status)?.id ?? null}
                onChange={(id) => {
                  const s = statusCat.items.find((x) => x.id === id);
                  if (s) setForm((f) => ({ ...f, status: s.nome as EventoStatus }));
                }}
                placeholder="Selecionar status..."
                onCreated={(item) => {
                  statusCat.addLocal({ id: item.id, nome: item.nome });
                  setForm((f) => ({ ...f, status: item.nome as EventoStatus }));
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Data e hora *</Label>
              <Input type="datetime-local" value={form.data_hora} onChange={(e) => setForm({ ...form, data_hora: e.target.value })} />
            </div>
            <div>
              <Label>Limite de inscritos</Label>
              <Input type="number" min={1} value={form.limite_inscritos ?? ""} onChange={(e) => setForm({ ...form, limite_inscritos: e.target.value ? Number(e.target.value) : null })} />
            </div>
          </div>
          <div>
            <Label>Local *</Label>
            <Input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} maxLength={200} />
          </div>
          <div>
            <Label>Responsável (Liderança)</Label>
            <DropdownComNovoCadastro
              campo="liderancas"
              label="Liderança"
              opcoes={liderancas.map((l) => ({ id: l.id, nome: l.nome }))}
              value={form.responsavel_id}
              onChange={(id) => setForm({ ...form, responsavel_id: id })}
              emptyOptionLabel="— Sem responsável —"
              placeholder="Selecionar..."
              onCreated={(item) => {
                setLiderancas((prev) => [...prev, { id: item.id, nome: item.nome } as Lideranca]);
              }}
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} maxLength={500} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {evento ? "Salvar" : "Criar evento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
