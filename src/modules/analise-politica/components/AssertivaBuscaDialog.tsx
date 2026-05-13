import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Loader2, CheckCircle2, AlertTriangle, Phone, CreditCard } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { CPFInput } from "./CPFInput";
import { isValidCPF, onlyDigits } from "../utils/cpf";

type BuscaResultado = {
  ok: boolean;
  dados?: Record<string, any>;
  campos_aplicados?: string[];
  erro?: string;
  errorMsg?: string;
  skipped?: boolean;
  motivo?: string;
};

function InfoRow({ label, value }: { label: string; value: any }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex gap-2 py-1 text-sm border-b border-border/40">
      <span className="text-muted-foreground shrink-0 w-36">{label}</span>
      <span className="break-words">{String(value)}</span>
    </div>
  );
}

function TelefonesRow({ telefones }: { telefones: any[] }) {
  if (!telefones?.length) return null;
  return (
    <div className="py-1 text-sm border-b border-border/40">
      <span className="text-muted-foreground">Telefones da API</span>
      <div className="mt-1 flex flex-wrap gap-1">
        {telefones.map((t: any, i: number) => (
          <Badge key={i} variant="outline" className="font-mono text-xs">
            {t.numero}{t.tipo ? ` · ${t.tipo}` : ""}{t.operadora ? ` · ${t.operadora}` : ""}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function EnderecosRow({ enderecos }: { enderecos: any[] }) {
  if (!enderecos?.length) return null;
  return (
    <div className="py-1 text-sm border-b border-border/40">
      <span className="text-muted-foreground">Endereços da API</span>
      <div className="mt-1 space-y-1">
        {enderecos.map((e: any, i: number) => (
          <div key={i} className="text-xs bg-muted/30 rounded px-2 py-1">
            {[e.logradouro, e.numero, e.complemento, e.bairro, e.cidade, e.estado, e.cep]
              .filter(Boolean).join(", ")}
            {e.tipo && <Badge variant="secondary" className="ml-1 text-[10px]">{e.tipo}</Badge>}
            {e.principal && <Badge className="ml-1 text-[10px] bg-primary">Principal</Badge>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AssertivaBuscaDialog({
  eleitorId,
  eleitorNome,
  open,
  onOpenChange,
  onSuccess,
  initialCpf,
  initialTelefone,
}: {
  eleitorId: string;
  eleitorNome: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: () => void;
  initialCpf?: string | null;
  initialTelefone?: string | null;
}) {
  const cpfLimpo = (initialCpf ?? "").replace(/\D/g, "");
  const telLimpo = (initialTelefone ?? "").replace(/\D/g, "");
  // Aba padrão: CPF se tiver, senão telefone
  const abaInicial: "cpf" | "telefone" = cpfLimpo.length === 11 ? "cpf" : "telefone";

  const [cpf, setCpf] = useState(cpfLimpo.length === 11 ? initialCpf ?? "" : "");
  const [telefone, setTelefone] = useState(telLimpo.length >= 10 ? telLimpo : "");
  const [resultado, setResultado] = useState<BuscaResultado | null>(null);
  const qc = useQueryClient();

  const cpfDigits = onlyDigits(cpf);
  const telDigits = telefone.replace(/\D/g, "");
  const cpfValido = cpfDigits.length === 11 && isValidCPF(cpfDigits);
  const telValido = telDigits.length >= 10;

  const buscarMut = useMutation({
    mutationFn: async (tipo: "cpf" | "telefone") => {
      // Chama SEM eleitor_id — igual ao "Testar com CPF/Telefone" que funciona.
      // A atualização do eleitor é feita separadamente pelo cliente Supabase.
      const body: Record<string, any> = {};
      if (tipo === "cpf") {
        if (!cpfValido) throw new Error("CPF inválido. Informe os 11 dígitos.");
        body.cpf = cpfDigits;
      } else {
        if (!telValido) throw new Error("Telefone inválido. Informe ao menos 10 dígitos.");
        body.telefone = telDigits;
      }

      const { data, error } = await supabase.functions.invoke<any>(
        "analise-enriquecimento",
        { body },
      );

      // Extrai erro da Edge Function (mesmo padrão dos botões Testar)
      const ctx = (error as any)?.context;
      if (ctx) {
        let parsed: any = null;
        try { parsed = await ctx.json(); } catch {
          try { parsed = { error: await ctx.text() }; } catch { /* ignore */ }
        }
        return {
          ok: false,
          errorMsg: parsed?.error ?? parsed?.erro ?? (error as any)?.message ?? "Falha na consulta",
          dados: parsed,
        } as BuscaResultado;
      }
      if (error) throw new Error((error as any).message ?? "Erro na consulta");
      if (data?.error || data?.erro) {
        return { ok: false, errorMsg: data.error ?? data.erro, dados: data } as BuscaResultado;
      }

      // Consulta OK — aplica dados no eleitor direto pelo cliente Supabase
      const d = data?.dados ?? {};
      if (data?.success && eleitorId) {
        const end = d.endereco ?? (d.enderecos_api?.[0]) ?? {};
        const patch: Record<string, any> = {};
        const set = (k: string, v: any) => { if (v != null && v !== "") patch[k] = v; };

        set("nome", d.nome_completo);
        set("cpf", (d.cpf ?? "").replace(/\D/g, "") || undefined);
        set("data_nascimento", d.data_nascimento);
        set("nome_mae", d.nome_mae);
        set("email", d.email);
        set("genero", d.genero);
        set("estado_civil", d.estado_civil);
        set("nacionalidade", d.nacionalidade);
        set("profissao", d.profissao);
        set("rua", end.logradouro);
        set("numero", end.numero);
        set("complemento", end.complemento);
        set("bairro", end.bairro);
        set("cidade", end.cidade);
        set("uf", end.uf ?? end.estado);
        set("cep", end.cep);
        set("titulo_eleitoral", d.titulo_eleitoral);
        set("municipio_eleitoral", d.municipio_eleitoral);
        if ((d.telefones_api ?? []).length > 0) patch.telefones_api = d.telefones_api;
        if ((d.enderecos_api ?? []).length > 0) patch.enderecos_api = d.enderecos_api;
        patch.data_ultimo_enriquecimento = new Date().toISOString();
        patch.status_enriquecimento = "SUCESSO";

        const camposAplicados = Object.keys(patch).filter(
          k => !["data_ultimo_enriquecimento", "status_enriquecimento"].includes(k)
        );

        if (camposAplicados.length > 0) {
          await (supabase as any).from("eleitores").update(patch).eq("id", eleitorId);
        }

        return {
          ok: true,
          dados: { ...d, _raw_debug: data?._raw_debug },
          campos_aplicados: camposAplicados,
        } as BuscaResultado;
      }

      // Sem dados (nenhuma pessoa encontrada ou skipped)
      return {
        ok: true,
        skipped: true,
        motivo: data?.motivo ?? "Nenhuma pessoa encontrada com esses dados na SA Connect Data.",
        dados: d,
        campos_aplicados: [],
      } as BuscaResultado;
    },
    onSuccess: (data) => {
      if (data?.errorMsg && !data.erro) data.erro = data.errorMsg;
      setResultado(data);
      if (data?.ok && !data?.skipped) {
        const qtd = data.campos_aplicados?.length ?? 0;
        toast.success(
          qtd > 0
            ? `${qtd} campo(s) preenchido(s) com dados da SA Connect Data.`
            : "Consulta concluída — nenhum campo vazio para preencher.",
        );
        qc.invalidateQueries({ queryKey: ["analise-eleitores"] });
        qc.invalidateQueries({ queryKey: ["eleitor-detalhe", eleitorId] });
        onSuccess?.();
      } else if (data?.skipped) {
        toast.info(data.motivo ?? "Nenhum dado encontrado.");
      }
    },
    onError: (e: any) => {
      toast.error(e.message ?? "Erro ao consultar");
      setResultado({ ok: false, erro: e.message });
    },
  });

  const fechar = () => {
    onOpenChange(false);
    setResultado(null);
    setCpf("");
    setTelefone("");
  };

  const d = resultado?.dados ?? {};

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Buscar dados na SA Connect Data
          </DialogTitle>
          <DialogDescription>
            Consulta por CPF ou Telefone — os campos em branco do eleitor serão preenchidos automaticamente.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={abaInicial}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cpf">
              <CreditCard className="h-4 w-4 mr-1.5" /> Buscar por CPF
            </TabsTrigger>
            <TabsTrigger value="telefone">
              <Phone className="h-4 w-4 mr-1.5" /> Buscar por Telefone
            </TabsTrigger>
          </TabsList>

          {/* ── Tab CPF ── */}
          <TabsContent value="cpf" className="mt-4 space-y-3">
            <div className="space-y-1">
              <Label>CPF do eleitor</Label>
              <CPFInput value={cpf} onChange={setCpf} error={cpf && !cpfValido ? "CPF inválido" : undefined} />
            </div>
            <Button
              className="w-full"
              disabled={!cpfValido || buscarMut.isPending}
              onClick={() => { setResultado(null); buscarMut.mutate("cpf"); }}
            >
              {buscarMut.isPending
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Consultando…</>
                : <><Search className="h-4 w-4 mr-2" /> Consultar</>}
            </Button>
          </TabsContent>

          {/* ── Tab Telefone ── */}
          <TabsContent value="telefone" className="mt-4 space-y-3">
            <div className="space-y-1">
              <Label>Telefone (com DDD)</Label>
              <Input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                placeholder="11999998888"
                inputMode="numeric"
                maxLength={11}
              />
              {telefone && !telValido && (
                <p className="text-xs text-destructive">Informe DDD + número (mínimo 10 dígitos)</p>
              )}
            </div>
            <Button
              className="w-full"
              disabled={!telValido || buscarMut.isPending}
              onClick={() => { setResultado(null); buscarMut.mutate("telefone"); }}
            >
              {buscarMut.isPending
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Consultando…</>
                : <><Search className="h-4 w-4 mr-2" /> Consultar</>}
            </Button>
          </TabsContent>
        </Tabs>

        {/* ── Resultado ── */}
        {resultado && (
          <div className={`rounded-lg border p-3 mt-1 ${
            resultado.ok && !resultado.skipped
              ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20"
              : resultado.skipped
                ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20"
                : "border-destructive/40 bg-destructive/10"
          }`}>
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              {resultado.ok && !resultado.skipped
                ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                : <AlertTriangle className="h-4 w-4 text-amber-600" />}
            {resultado.ok && !resultado.skipped
              ? `${resultado.campos_aplicados?.length ?? 0} campo(s) aplicado(s) ao cadastro de ${eleitorNome}`
              : resultado.skipped
                ? resultado.motivo ?? "Nenhuma pessoa encontrada."
                : resultado.erro ?? resultado.errorMsg ?? "Erro na consulta"}
            </div>

            {resultado.ok && !resultado.skipped && Object.keys(d).length > 0 && (
              <ScrollArea className="max-h-72">
                <div className="space-y-0.5">
                  <InfoRow label="Nome" value={d.nome_completo} />
                  <InfoRow label="CPF" value={d.cpf} />
                  <InfoRow label="Nascimento" value={d.data_nascimento} />
                  <InfoRow label="Nome da mãe" value={d.nome_mae} />
                  <InfoRow label="E-mail" value={d.email} />
                  <InfoRow label="Gênero" value={d.genero} />
                  <InfoRow label="Estado civil" value={d.estado_civil} />
                  <InfoRow label="Nacionalidade" value={d.nacionalidade} />
                  <InfoRow label="Profissão" value={d.profissao} />
                  <InfoRow label="Título eleitoral" value={d.titulo_eleitoral} />
                  <InfoRow label="Município eleitoral" value={d.municipio_eleitoral} />
                  {d.endereco && (
                    <InfoRow
                      label="Endereço (principal)"
                      value={[d.endereco.logradouro, d.endereco.numero, d.endereco.bairro, d.endereco.cidade, d.endereco.uf]
                        .filter(Boolean).join(", ")}
                    />
                  )}
                  <TelefonesRow telefones={d.telefones_api ?? []} />
                  <EnderecosRow enderecos={d.enderecos_api ?? []} />
                </div>
              </ScrollArea>
            )}

            {(resultado.campos_aplicados?.length ?? 0) > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {resultado.campos_aplicados!.map((c) => (
                  <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                ))}
              </div>
            )}

            {/* Detalhes do erro ou resposta bruta para diagnóstico */}
            {(!resultado.ok || (resultado.ok && (resultado.campos_aplicados?.length ?? 0) === 0)) && resultado.dados && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
                  {resultado.ok ? "Ver resposta bruta da API (diagnóstico)" : "Ver detalhe do erro"}
                </summary>
                <pre className="mt-1 max-h-52 overflow-auto rounded bg-muted/40 p-2 whitespace-pre-wrap">
                  {JSON.stringify(resultado.dados, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button variant="outline" onClick={fechar}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
