import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { analiseService } from "../services/analiseService";
import { CPFInput } from "./CPFInput";
import { isValidCPF, onlyDigits } from "../utils/cpf";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EleitorHistorico } from "./EleitorHistorico";

type Eleitor = any;

const FIELDS: { key: string; label: string; type?: string; placeholder?: string }[] = [
  { key: "nome", label: "Nome completo *" },
  { key: "telefone_original", label: "Telefone (oficial) *", placeholder: "(11) 99999-9999" },
  { key: "data_nascimento", label: "Data de nascimento", type: "date" },
  { key: "nome_mae", label: "Nome da mãe" },
  { key: "email", label: "E-mail", type: "email" },
  { key: "titulo_eleitoral", label: "Título de eleitor" },
  { key: "zona_eleitoral", label: "Zona" },
  { key: "secao_eleitoral", label: "Seção" },
  { key: "local_votacao", label: "Local de votação" },
  { key: "municipio_eleitoral", label: "Município eleitoral" },
  { key: "uf_eleitoral", label: "UF", placeholder: "SP" },
  { key: "rua", label: "Logradouro / Rua" },
  { key: "numero", label: "Número" },
  { key: "complemento", label: "Complemento" },
  { key: "bairro", label: "Bairro" },
  { key: "cidade", label: "Cidade" },
  { key: "uf", label: "UF (endereço)", placeholder: "SP" },
  { key: "cep", label: "CEP" },
];

export function EleitorEditDialog({
  eleitor,
  open,
  onOpenChange,
}: {
  eleitor: Eleitor | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [form, setForm] = useState<Record<string, any>>({});
  const [cpf, setCpf] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  useEffect(() => {
    if (eleitor) {
      const init: Record<string, any> = {};
      FIELDS.forEach((f) => { init[f.key] = (eleitor as any)[f.key] ?? ""; });
      // data_nascimento: garantir YYYY-MM-DD
      if (init.data_nascimento) init.data_nascimento = String(init.data_nascimento).slice(0, 10);
      setForm(init);
      setCpf(eleitor.cpf ?? "");
      setErrors({});
    }
  }, [eleitor]);

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const cpfDigits = onlyDigits(cpf);
  const cpfBlocking = cpfDigits.length > 0 && !isValidCPF(cpfDigits);

  const mut = useMutation({
    mutationFn: async () => {
      if (cpfBlocking) throw new Error("CPF inválido. Corrija para continuar.");
      const patch: Record<string, any> = { ...form };
      // saneamentos
      if (!patch.nome || String(patch.nome).trim().length < 3) {
        throw new Error("Nome obrigatório.");
      }
      patch.cpf = cpfDigits || null;
      patch.data_nascimento = patch.data_nascimento || null;
      // remove vazios -> null
      Object.keys(patch).forEach((k) => {
        if (patch[k] === "") patch[k] = null;
      });
      // telefone_original NÃO pode ser alterado (regra do service); removemos se igual ao atual
      if (patch.telefone_original === eleitor?.telefone_original) {
        delete patch.telefone_original;
      }
      await analiseService.atualizarEleitor(eleitor.id, patch);
      return patch;
    },
    onSuccess: async () => {
      toast.success("Cadastro atualizado");
      qc.invalidateQueries({ queryKey: ["analise-eleitores"] });
      qc.invalidateQueries({ queryKey: ["analise-metricas"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao atualizar"),
  });

  if (!eleitor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar cadastro · {eleitor.nome}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="historico">Histórico de enriquecimento</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="mt-4">
            <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <CPFInput value={cpf} onChange={setCpf} error={cpfBlocking ? "CPF inválido" : undefined} />
          </div>
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input
                id={f.key}
                type={f.type ?? "text"}
                placeholder={f.placeholder}
                value={form[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                disabled={f.key === "telefone_original"}
              />
              {errors[f.key] && <p className="text-xs text-destructive">{errors[f.key]}</p>}
            </div>
          ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              O telefone oficial não pode ser alterado por aqui — é o telefone original do cadastro.
            </p>
          </TabsContent>

          <TabsContent value="historico" className="mt-4">
            <EleitorHistorico eleitorId={eleitor.id} />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || cpfBlocking}>
            {mut.isPending ? "Salvando…" : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}