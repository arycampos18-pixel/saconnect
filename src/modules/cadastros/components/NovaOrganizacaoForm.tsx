import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cadastrosService } from "../services/cadastrosService";
import { auditoriaService } from "@/modules/auditoria/services/auditoriaService";

const TIPOS = ["Gabinete", "Comitê", "Partido", "Grupo"];

export function NovaOrganizacaoForm({ onCreated }: { onCreated?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    tipo: "Gabinete",
    cidade: "",
    uf: "",
    observacoes: "",
    ativo: true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error("Informe o nome");
    setLoading(true);
    try {
      const o = await cadastrosService.criarOrganizacao(form);
      await auditoriaService.registrar({
        acao: "Criar", entidade: "organizacao", entidade_id: (o as any).id,
        descricao: `Nova organização: ${form.nome}`, modulo: "Cadastros",
      });
      toast.success("Organização cadastrada");
      setForm({ nome: "", tipo: "Gabinete", cidade: "", uf: "", observacoes: "", ativo: true });
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
        <Label>Nome *</Label>
        <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required />
      </div>
      <div>
        <Label>Tipo</Label>
        <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>UF</Label>
        <Input maxLength={2} value={form.uf} onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value.toUpperCase() }))} />
      </div>
      <div className="md:col-span-2">
        <Label>Cidade</Label>
        <Input value={form.cidade} onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))} />
      </div>
      <div className="md:col-span-2">
        <Label>Observações</Label>
        <Textarea value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} rows={3} />
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={form.ativo} onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))} />
        <Label className="!m-0">Ativo</Label>
      </div>
      <div className="md:col-span-2 flex justify-end pt-2">
        <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar Organização"}</Button>
      </div>
    </form>
  );
}