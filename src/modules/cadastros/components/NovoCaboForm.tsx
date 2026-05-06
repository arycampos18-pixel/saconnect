import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cadastrosService, type Lideranca } from "../services/cadastrosService";
import { auditoriaService } from "@/modules/auditoria/services/auditoriaService";
import { formatPhoneBR, isValidPhoneBR } from "@/shared/utils/phone";

export function NovoCaboForm({ onCreated }: { onCreated?: () => void }) {
  const [liderancas, setLiderancas] = useState<Lideranca[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    lideranca_id: "",
    meta: 50,
    ativo: true,
  });

  useEffect(() => {
    cadastrosService.listarLiderancas().then(setLiderancas).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error("Informe o nome");
    if (!form.lideranca_id) return toast.error("Selecione a liderança responsável");
    if (form.telefone && !isValidPhoneBR(form.telefone)) return toast.error("Telefone inválido");
    setLoading(true);
    try {
      const c = await cadastrosService.criarCabo(form);
      await auditoriaService.registrar({
        acao: "Criar", entidade: "cabo_eleitoral", entidade_id: (c as any).id,
        descricao: `Novo cabo: ${form.nome}`, modulo: "Cadastros",
      });
      toast.success("Cabo eleitoral cadastrado");
      setForm({ nome: "", telefone: "", lideranca_id: "", meta: 50, ativo: true });
      onCreated?.();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <Label>Nome completo *</Label>
        <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required />
      </div>
      <div>
        <Label>Telefone</Label>
        <Input value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: formatPhoneBR(e.target.value) }))} placeholder="(11) 99999-9999" />
      </div>
      <div>
        <Label>Meta de eleitores</Label>
        <Input type="number" min={1} value={form.meta} onChange={(e) => setForm((f) => ({ ...f, meta: Number(e.target.value) || 0 }))} />
      </div>
      <div className="md:col-span-2">
        <Label>Liderança responsável *</Label>
        <Select value={form.lideranca_id} onValueChange={(v) => setForm((f) => ({ ...f, lideranca_id: v }))}>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            {liderancas.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={form.ativo} onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))} />
        <Label className="!m-0">Ativo</Label>
      </div>
      <div className="md:col-span-2 flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar Cabo"}</Button>
      </div>
    </form>
  );
}