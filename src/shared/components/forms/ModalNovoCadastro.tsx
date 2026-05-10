import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  catalogosCriacaoService, DuplicateItemError, type ItemCriado,
} from "@/shared/services/catalogosCriacaoService";
import type { CampoCadastro } from "@/shared/hooks/usePermissoes";

const TITULOS: Record<CampoCadastro, { titulo: string; campoLabel: string; comDescricao: boolean }> = {
  liderancas:    { titulo: "Nova Liderança",            campoLabel: "Nome da liderança",  comDescricao: false },
  cabos:         { titulo: "Novo Cabo Eleitoral",       campoLabel: "Nome do cabo",        comDescricao: false },
  departamentos: { titulo: "Novo Departamento",         campoLabel: "Nome do departamento", comDescricao: true  },
  categorias:    { titulo: "Nova Categoria",            campoLabel: "Nome da categoria",   comDescricao: true  },
  tags:          { titulo: "Nova Tag",                  campoLabel: "Nome da tag",          comDescricao: false },
  tipos_evento:  { titulo: "Novo Tipo de Evento",       campoLabel: "Nome do tipo",         comDescricao: false },
  cat_evento_status:         { titulo: "Novo Status de Evento",        campoLabel: "Nome do status",     comDescricao: false },
  cat_compromisso_categoria: { titulo: "Nova Categoria de Compromisso",campoLabel: "Nome da categoria",  comDescricao: false },
  cat_compromisso_prioridade:{ titulo: "Nova Prioridade",               campoLabel: "Nome da prioridade", comDescricao: false },
  cat_compromisso_status:    { titulo: "Novo Status de Compromisso",    campoLabel: "Nome do status",     comDescricao: false },
  cat_crm_interacao_tipo:    { titulo: "Novo Tipo de Interação",        campoLabel: "Nome do tipo",       comDescricao: false },
  cat_crm_prioridade:        { titulo: "Nova Prioridade",               campoLabel: "Nome da prioridade", comDescricao: false },
  cat_pesquisa_tipo:         { titulo: "Novo Tipo de Pesquisa",         campoLabel: "Nome do tipo",       comDescricao: false },
  cat_post_status:           { titulo: "Novo Status de Post",           campoLabel: "Nome do status",     comDescricao: false },
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  campo: CampoCadastro;
  /** Para `cabos`, é obrigatório informar a liderança superior. */
  liderancaIdParaCabo?: string | null;
  onCreated?: (item: ItemCriado) => void;
};

export function ModalNovoCadastro({ open, onOpenChange, campo, liderancaIdParaCabo, onCreated }: Props) {
  const cfg = TITULOS[campo];
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setNome(""); setDescricao(""); }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nome.trim().length < 2) { toast.error("Informe um nome com ao menos 2 caracteres."); return; }
    if (campo === "cabos" && !liderancaIdParaCabo) { toast.error("Selecione antes uma liderança."); return; }
    setSaving(true);
    try {
      const item = await catalogosCriacaoService.criar(campo, {
        nome,
        descricao: cfg.comDescricao ? (descricao || null) : null,
        lideranca_id: campo === "cabos" ? liderancaIdParaCabo ?? null : null,
      });
      toast.success(`${cfg.titulo.replace(/^Nov[oa] /, "")} criado(a).`);
      onCreated?.(item);
      onOpenChange(false);
    } catch (err: any) {
      if (err instanceof DuplicateItemError) {
        toast.warning(err.message, {
          description: "Use o item já existente em vez de criar um duplicado.",
        });
      } else {
        toast.error(err?.message ?? "Falha ao criar.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{cfg.titulo}</DialogTitle>
          <DialogDescription>Cria um novo item e o seleciona automaticamente no formulário.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>{cfg.campoLabel} *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} autoFocus />
          </div>
          {cfg.comDescricao && (
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={300} rows={3} />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}