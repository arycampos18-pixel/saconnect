import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cadastrosService, type Lideranca, type Organizacao } from "../services/cadastrosService";
import { auditoriaService } from "@/modules/auditoria/services/auditoriaService";
import { formatPhoneBR, isValidPhoneBR } from "@/shared/utils/phone";

const NENHUM = "__none__";

export function NovaLiderancaForm({ onCreated }: { onCreated?: () => void }) {
  const [superiores, setSuperiores] = useState<Lideranca[]>([]);
  const [organizacoes, setOrganizacoes] = useState<Organizacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    cidade: "",
    meta: 100,
    ativo: true,
    superior_id: NENHUM as string,
    organizacao_id: NENHUM as string,
  });

  useEffect(() => {
    cadastrosService.listarLiderancas().then(setSuperiores).catch(() => {});
    cadastrosService.listarOrganizacoes().then(setOrganizacoes).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error("Informe o nome");
    if (form.telefone && !isValidPhoneBR(form.telefone)) return toast.error("Telefone inválido");
    setLoading(true);
    try {
      const l = await cadastrosService.criarLideranca({
        ...form,
        superior_id: form.superior_id === NENHUM ? null : form.superior_id,
        organizacao_id: form.organizacao_id === NENHUM ? null : form.organizacao_id,
      });
      await auditoriaService.registrar({
        acao: "Criar", entidade: "lideranca", entidade_id: (l as any).id,
        descricao: `Nova liderança: ${form.nome}`, modulo: "Cadastros",
      });
      toast.success("Liderança cadastrada");
      setForm({ nome: "", telefone: "", cidade: "", meta: 100, ativo: true, superior_id: NENHUM, organizacao_id: NENHUM });
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
        <Label>Cidade / Região</Label>
        <Input value={form.cidade} onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))} />
      </div>
      <div>
        <Label>Meta de eleitores</Label>
        <Input type="number" min={1} value={form.meta} onChange={(e) => setForm((f) => ({ ...f, meta: Number(e.target.value) || 0 }))} />
      </div>
      <div>
        <Label>Liderança superior (hierarquia)</Label>
        <Select value={form.superior_id} onValueChange={(v) => setForm((f) => ({ ...f, superior_id: v }))}>
          <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NENHUM}>Nenhuma (topo)</SelectItem>
            {superiores.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Organização / Gabinete</Label>
        <Select value={form.organizacao_id} onValueChange={(v) => setForm((f) => ({ ...f, organizacao_id: v }))}>
          <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NENHUM}>Nenhuma</SelectItem>
            {organizacoes.map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={form.ativo} onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))} />
        <Label className="!m-0">Ativo</Label>
      </div>
      <div className="md:col-span-2 flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar Liderança"}</Button>
      </div>
    </form>
  );
}