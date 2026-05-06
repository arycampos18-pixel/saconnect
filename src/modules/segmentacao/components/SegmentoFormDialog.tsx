import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { segmentacaoService, type Segmento, type SegmentoFiltros } from "../services/segmentacaoService";
import { Users, X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  segmento?: Segmento | null;
  onSaved: () => void;
}

function MultiChip({ label, value, onChange, options }: { label: string; value: string[]; onChange: (v: string[]) => void; options: { id: string; label: string }[] }) {
  const [sel, setSel] = useState<string>("");
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1 mb-2 mt-1">
        {value.map((v) => {
          const opt = options.find((o) => o.id === v);
          return (
            <Badge key={v} variant="secondary" className="gap-1">
              {opt?.label ?? v}
              <button onClick={() => onChange(value.filter((x) => x !== v))}><X className="h-3 w-3" /></button>
            </Badge>
          );
        })}
      </div>
      <Select value={sel} onValueChange={(v) => { if (v && !value.includes(v)) onChange([...value, v]); setSel(""); }}>
        <SelectTrigger><SelectValue placeholder={`Adicionar ${label.toLowerCase()}...`} /></SelectTrigger>
        <SelectContent>
          {options.filter((o) => !value.includes(o.id)).map((o) => (
            <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function SegmentoFormDialog({ open, onOpenChange, segmento, onSaved }: Props) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [cor, setCor] = useState("#2563EB");
  const [filtros, setFiltros] = useState<SegmentoFiltros>({});
  const [opcoes, setOpcoes] = useState<any>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      segmentacaoService.opcoesDisponiveis().then(setOpcoes);
      if (segmento) {
        setNome(segmento.nome);
        setDescricao(segmento.descricao ?? "");
        setCor(segmento.cor);
        setFiltros(segmento.filtros ?? {});
      } else {
        setNome(""); setDescricao(""); setCor("#2563EB"); setFiltros({});
      }
      setPreviewCount(null);
    }
  }, [open, segmento]);

  const calcularPreview = async () => {
    try {
      const res = await segmentacaoService.preview(filtros);
      setPreviewCount(res.length);
    } catch (e: any) {
      toast.error("Erro no preview", { description: e.message });
    }
  };

  const submit = async () => {
    if (!nome.trim()) { toast.error("Informe um nome"); return; }
    setSaving(true);
    try {
      if (segmento) {
        await segmentacaoService.atualizar(segmento.id, { nome, descricao: descricao || null, cor, filtros });
        await segmentacaoService.atualizarTotal(segmento.id, filtros);
      } else {
        const novo = await segmentacaoService.criar({ nome, descricao: descricao || null, cor, filtros });
        if (novo) await segmentacaoService.atualizarTotal((novo as any).id, filtros);
      }
      toast.success("Segmento salvo");
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error("Erro ao salvar", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (!opcoes) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{segmento ? "Editar segmento" : "Novo segmento"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
            <div><Label>Cor</Label><Input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="h-10" /></div>
          </div>
          <div><Label>Descrição</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} /></div>

          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <p className="text-sm font-semibold">Filtros</p>

            <MultiChip label="Bairros" value={filtros.bairros ?? []} onChange={(v) => setFiltros({ ...filtros, bairros: v })} options={opcoes.bairros.map((b: string) => ({ id: b, label: b }))} />
            <MultiChip label="Cidades" value={filtros.cidades ?? []} onChange={(v) => setFiltros({ ...filtros, cidades: v })} options={opcoes.cidades.map((c: string) => ({ id: c, label: c }))} />
            <MultiChip label="Tags" value={filtros.tags ?? []} onChange={(v) => setFiltros({ ...filtros, tags: v })} options={opcoes.tags.map((t: any) => ({ id: t.id, label: t.nome }))} />
            <MultiChip label="Origens" value={filtros.origens ?? []} onChange={(v) => setFiltros({ ...filtros, origens: v })} options={opcoes.origens.map((o: string) => ({ id: o, label: o }))} />
            <MultiChip label="Gêneros" value={filtros.generos ?? []} onChange={(v) => setFiltros({ ...filtros, generos: v })} options={opcoes.generos.map((g: string) => ({ id: g, label: g }))} />
            <MultiChip label="Lideranças" value={filtros.liderancaIds ?? []} onChange={(v) => setFiltros({ ...filtros, liderancaIds: v })} options={opcoes.liderancas.map((l: any) => ({ id: l.id, label: l.nome }))} />
            <MultiChip label="Cabos" value={filtros.caboIds ?? []} onChange={(v) => setFiltros({ ...filtros, caboIds: v })} options={opcoes.cabos.map((c: any) => ({ id: c.id, label: c.nome }))} />

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Idade mín</Label><Input type="number" value={filtros.idadeMin ?? ""} onChange={(e) => setFiltros({ ...filtros, idadeMin: e.target.value ? Number(e.target.value) : null })} /></div>
              <div><Label>Idade máx</Label><Input type="number" value={filtros.idadeMax ?? ""} onChange={(e) => setFiltros({ ...filtros, idadeMax: e.target.value ? Number(e.target.value) : null })} /></div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Telefone</Label>
                <Select value={filtros.comTelefone == null ? "any" : String(filtros.comTelefone)} onValueChange={(v) => setFiltros({ ...filtros, comTelefone: v === "any" ? null : v === "true" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="any">Qualquer</SelectItem><SelectItem value="true">Com</SelectItem><SelectItem value="false">Sem</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label>Email</Label>
                <Select value={filtros.comEmail == null ? "any" : String(filtros.comEmail)} onValueChange={(v) => setFiltros({ ...filtros, comEmail: v === "any" ? null : v === "true" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="any">Qualquer</SelectItem><SelectItem value="true">Com</SelectItem><SelectItem value="false">Sem</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label>LGPD</Label>
                <Select value={filtros.consentimentoLgpd == null ? "any" : String(filtros.consentimentoLgpd)} onValueChange={(v) => setFiltros({ ...filtros, consentimentoLgpd: v === "any" ? null : v === "true" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="any">Qualquer</SelectItem><SelectItem value="true">Sim</SelectItem><SelectItem value="false">Não</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-primary/5 p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm">
                {previewCount != null ? <><strong>{previewCount}</strong> eleitores no segmento</> : "Calcule o tamanho do segmento"}
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={calcularPreview}>Calcular preview</Button>
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