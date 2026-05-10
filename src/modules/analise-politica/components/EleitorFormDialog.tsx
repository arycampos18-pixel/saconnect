import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { eleitorSchema } from "../schemas/eleitorSchema";
import { analiseService } from "../services/analiseService";
import { CPFInput } from "./CPFInput";
import { isValidCPF, onlyDigits } from "../utils/cpf";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2 } from "lucide-react";

const initial = {
  nome: "", cpf: "", telefone_original: "", data_nascimento: "",
  nome_mae: "", titulo_eleitoral: "", zona_eleitoral: "", secao_eleitoral: "",
  local_votacao: "", municipio_eleitoral: "", uf_eleitoral: "",
  aceite_lgpd: false, lideranca_id: "",
};

export function EleitorFormDialog({ onCreated }: { onCreated?: (eleitor: any) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: async (values: any) => analiseService.criarEleitor(values),
    onSuccess: async (eleitor: any) => {
      toast.success("Eleitor cadastrado");
      qc.invalidateQueries({ queryKey: ["analise-eleitores"] });
      qc.invalidateQueries({ queryKey: ["analise-metricas"] });
      setForm(initial); setErrors({}); setOpen(false);
      onCreated?.(eleitor);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao cadastrar"),
  });

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const cpfDigits = onlyDigits(form.cpf);
  const cpfBlocking = cpfDigits.length > 0 && !isValidCPF(cpfDigits);

  const [enriquecendo, setEnriquecendo] = useState(false);
  const podeEnriquecer =
    !!form.nome && !!form.telefone_original &&
    (cpfDigits.length === 0 || isValidCPF(cpfDigits));

  const enriquecer = async () => {
    if (!podeEnriquecer || enriquecendo) return;
    setEnriquecendo(true);
    try {
      const { data, error } = await supabase.functions.invoke("analise-enriquecimento", {
        body: {
          cpf: cpfDigits || undefined,
          telefone: onlyDigits(form.telefone_original) || undefined,
        },
      });
      if (error) throw error;
      const d = (data as any)?.dados ?? {};
      const end = d.endereco ?? {};

      // Normalização para comparar primeiro nome
      const normalize = (s: string) =>
        (s ?? "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9 ]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      const nomeApi: string = String(d.nome_completo ?? d.nome ?? "").trim();
      const nomeBase = normalize(form.nome);
      const primeiroBase = nomeBase.split(" ")[0] ?? "";
      const primeiroApi = normalize(nomeApi).split(" ")[0] ?? "";

      // Validação obrigatória: o primeiro nome digitado precisa bater com o
      // retornado pela SA Connect Data. Caso contrário, NENHUM dado é aplicado.
      if (nomeApi) {
        if (!primeiroBase || !primeiroApi || primeiroBase !== primeiroApi) {
          toast.error(
            `Primeiro nome não confere com a SA Connect Data (retornado: "${nomeApi}"). Nenhum dado foi aplicado ao cadastro.`,
            { duration: 6000 },
          );
          return;
        }
      } else if (Object.keys(d).length > 0) {
        // Provedor retornou dados mas sem nome — não dá para validar.
        toast.error(
          "Não foi possível validar o nome com a SA Connect Data. Nenhum dado foi aplicado.",
          { duration: 6000 },
        );
        return;
      }

      const next = { ...form };
      const aplicar = (k: keyof typeof initial, v: any) => {
        if (v == null || v === "") return false;
        if ((next as any)[k] && String((next as any)[k]).trim() !== "") return false;
        (next as any)[k] = String(v);
        return true;
      };
      const aplicados: string[] = [];

      // Substituir nome curto (só primeiro nome) pelo nome completo da API,
      // desde que o primeiro nome bata.
      if (
        nomeApi &&
        primeiroApi &&
        primeiroBase === primeiroApi &&
        nomeBase.split(" ").length < 2 &&
        nomeApi.split(/\s+/).length >= 2
      ) {
        next.nome = nomeApi;
        aplicados.push("nome completo");
      }

      if (aplicar("cpf", d.cpf)) aplicados.push("CPF");
      if (aplicar("data_nascimento", d.data_nascimento)) aplicados.push("nascimento");
      if (aplicar("nome_mae", d.nome_mae)) aplicados.push("nome da mãe");
      if (aplicar("titulo_eleitoral", d.titulo_eleitoral)) aplicados.push("título");
      if (aplicar("municipio_eleitoral", d.municipio_eleitoral)) aplicados.push("município");
      if (aplicar("uf_eleitoral", end.uf)) aplicados.push("UF");
      setForm(next);
      if ((data as any)?.dados && Object.keys((data as any).dados).length > 0) {
        toast.success(
          aplicados.length > 0
            ? `Enriquecido (${aplicados.length} campo(s) preenchido(s)): ${aplicados.join(", ")}.`
            : "Consulta concluída — nenhum campo vazio para preencher."
        );
      } else {
        toast.info("Provedor não retornou dados para esta busca.");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao enriquecer");
    } finally {
      setEnriquecendo(false);
    }
  };

  const submit = () => {
    const cpfDigits = onlyDigits(form.cpf);
    if (cpfDigits.length > 0 && !isValidCPF(cpfDigits)) {
      setErrors({ cpf: "CPF inválido. Corrija para continuar." });
      toast.error("CPF inválido. Corrija para continuar.");
      return;
    }
    const parsed = eleitorSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
      setErrors(errs);
      return;
    }
    setErrors({});
    const v = parsed.data as any;
    const lid = v.lideranca_id && v.lideranca_id.length ? v.lideranca_id : null;
    mut.mutate({
      ...v,
      lideranca_id: lid,
      data_nascimento: v.data_nascimento || null,
    });
  };

  const field = (key: keyof typeof initial, label: string, type: string = "text", placeholder?: string) => (
    <div className="space-y-1">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key} type={type} placeholder={placeholder}
        value={(form as any)[key]} onChange={(e) => set(key, e.target.value)}
      />
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Novo Eleitor</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Eleitor</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {field("nome", "Nome completo *")}
          <div className="space-y-1">
            <CPFInput
              value={form.cpf}
              onChange={(v) => set("cpf", v)}
              error={errors.cpf}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full mt-1"
              onClick={enriquecer}
              disabled={!podeEnriquecer || enriquecendo}
              title={
                podeEnriquecer
                  ? "Buscar dados na base externa (SA Connect Data)"
                  : "Informe nome e telefone para enriquecer"
              }
            >
              {enriquecendo ? (
                <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Enriquecendo…</>
              ) : (
                <><Sparkles className="h-3 w-3 mr-1" /> Enriquecer dados</>
              )}
            </Button>
          </div>
          {field("telefone_original", "Telefone (oficial) *", "text", "(11) 99999-9999")}
          {field("data_nascimento", "Data de nascimento", "date")}
          {field("nome_mae", "Nome da mãe")}
          {field("titulo_eleitoral", "Número do Título de Eleitor", "text", "000000000000")}
          {field("zona_eleitoral", "Zona")}
          {field("secao_eleitoral", "Seção")}
          {field("local_votacao", "Local de votação")}
          {field("municipio_eleitoral", "Município")}
          {field("uf_eleitoral", "UF", "text", "SP")}
          {field("lideranca_id", "Liderança (UUID)")}
        </div>

        <p className="text-xs text-muted-foreground">
          O telefone informado aqui é o telefone <strong>oficial</strong> do cadastro.
          Nenhuma consulta de API poderá substituí-lo.
        </p>

        <div className="flex items-start gap-2 pt-2">
          <Checkbox
            id="aceite_lgpd"
            checked={form.aceite_lgpd}
            onCheckedChange={(v) => set("aceite_lgpd", !!v)}
          />
          <Label htmlFor="aceite_lgpd" className="text-sm leading-snug">
            Declaro que possuo consentimento do titular para tratamento dos dados (LGPD).
          </Label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={mut.isPending || cpfBlocking}>
            {mut.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
