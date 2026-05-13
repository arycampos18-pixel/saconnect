import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";
import { cadastrosService, type Lideranca, type Organizacao } from "../services/cadastrosService";
import { auditoriaService } from "@/modules/auditoria/services/auditoriaService";
import { formatPhoneBR, isValidPhoneBR } from "@/shared/utils/phone";

const NENHUM = "__none__";

export function NovaLiderancaForm({ onCreated }: { onCreated?: () => void }) {
  const [superiores, setSuperiores] = useState<Lideranca[]>([]);
  const [organizacoes, setOrganizacoes] = useState<Organizacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [telDuplicado, setTelDuplicado] = useState(false);
  const [checandoTel, setChecandoTel] = useState(false);
  const checkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  function handleTelefoneChange(value: string) {
    const formatted = formatPhoneBR(value);
    setForm((f) => ({ ...f, telefone: formatted }));
    setTelDuplicado(false);

    if (checkTimeout.current) clearTimeout(checkTimeout.current);
    const tel = formatted.replace(/\D/g, "");
    if (tel.length < 10) return;

    setChecandoTel(true);
    checkTimeout.current = setTimeout(async () => {
      try {
        const dup = await cadastrosService.verificarTelefoneLiderancaDuplicado(tel);
        setTelDuplicado(dup);
      } catch {
        /* silencioso */
      } finally {
        setChecandoTel(false);
      }
    }, 600);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error("Informe o nome");
    if (!form.telefone.trim()) return toast.error("Telefone é obrigatório");
    if (!isValidPhoneBR(form.telefone)) return toast.error("Telefone inválido");
    if (telDuplicado) return toast.error("Este telefone já está cadastrado em outra liderança.");
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
      setTelDuplicado(false);
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
        <Label>Telefone *</Label>
        <div className="relative">
          <Input
            value={form.telefone}
            onChange={(e) => handleTelefoneChange(e.target.value)}
            placeholder="(11) 99999-9999"
            className={telDuplicado ? "border-destructive pr-9 focus-visible:ring-destructive" : checandoTel ? "pr-9" : ""}
            required
          />
          {checandoTel && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {telDuplicado && !checandoTel && (
            <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
          )}
        </div>
        {telDuplicado && (
          <p className="mt-1 text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Este telefone já está cadastrado em outra liderança.
          </p>
        )}
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
        <Button type="submit" disabled={loading || telDuplicado || checandoTel}>
          {loading ? "Salvando..." : "Salvar Liderança"}
        </Button>
      </div>
    </form>
  );
}