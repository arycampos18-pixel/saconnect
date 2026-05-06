import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { gamificacaoService, type Badge } from "../services/gamificacaoService";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  badges: Badge[];
  onSaved: () => void;
}

const METRICAS = [
  { value: "eleitores_cadastrados", label: "Eleitores cadastrados" },
  { value: "eventos_criados", label: "Eventos criados" },
  { value: "mensagens_enviadas", label: "Mensagens enviadas" },
  { value: "pesquisas_respondidas", label: "Pesquisas respondidas" },
];

export function DesafioFormDialog({ open, onOpenChange, badges, onSaved }: Props) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [meta, setMeta] = useState(10);
  const [metrica, setMetrica] = useState("eleitores_cadastrados");
  const [recompensa, setRecompensa] = useState(50);
  const [badgeId, setBadgeId] = useState<string>("none");
  const [dataFim, setDataFim] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitulo("");
    setDescricao("");
    setMeta(10);
    setMetrica("eleitores_cadastrados");
    setRecompensa(50);
    setBadgeId("none");
    setDataFim("");
  };

  const submit = async () => {
    if (!titulo.trim()) {
      toast.error("Informe um título");
      return;
    }
    setSaving(true);
    try {
      await gamificacaoService.criarDesafio({
        titulo,
        descricao: descricao || null,
        meta,
        metrica,
        recompensa_pontos: recompensa,
        badge_id: badgeId === "none" ? null : badgeId,
        data_fim: dataFim ? new Date(dataFim).toISOString() : null,
        ativo: true,
      });
      toast.success("Desafio criado");
      reset();
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error("Erro ao criar desafio", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo desafio</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Métrica</Label>
              <Select value={metrica} onValueChange={setMetrica}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METRICAS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Meta</Label>
              <Input type="number" value={meta} onChange={(e) => setMeta(Number(e.target.value))} />
            </div>
            <div>
              <Label>Recompensa (pts)</Label>
              <Input type="number" value={recompensa} onChange={(e) => setRecompensa(Number(e.target.value))} />
            </div>
            <div>
              <Label>Data fim</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Badge ao concluir</Label>
            <Select value={badgeId} onValueChange={setBadgeId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {badges.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                ))}
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