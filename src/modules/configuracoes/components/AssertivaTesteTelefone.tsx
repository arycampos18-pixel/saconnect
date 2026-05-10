import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Phone, CheckCircle2, AlertCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ResultState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: any; raw: any }
  | { status: "empty"; raw: any }
  | { status: "error"; message: string; details?: any };

const onlyDigits = (v: string) => v.replace(/\D+/g, "");

function maskTelefone(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function Field({ label, value }: { label: string; value: any }) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm ${empty ? "text-muted-foreground italic" : "font-medium"}`}>
        {empty ? "—" : String(value)}
      </div>
    </div>
  );
}

export default function SAConnectDataTesteTelefone() {
  const [telefone, setTelefone] = useState("");
  const [result, setResult] = useState<ResultState>({ status: "idle" });

  const consultar = async () => {
    const digits = onlyDigits(telefone);
    if (digits.length < 10 || digits.length > 11) {
      toast.error("Informe um telefone válido com DDD (10 ou 11 dígitos).");
      return;
    }
    setResult({ status: "loading" });
    try {
      const { data, error } = await supabase.functions.invoke("analise-enriquecimento", {
        body: { telefone: digits },
      });
      if (error) {
        const ctx: any = (error as any).context;
        let details: any = null;
        try {
          const txt = await ctx?.text?.();
          details = txt ? JSON.parse(txt) : null;
        } catch { /* noop */ }
        setResult({
          status: "error",
          message: details?.error || error.message || "Falha ao consultar SA Connect Data",
          details: details ?? undefined,
        });
        return;
      }
      const dados = data?.dados ?? {};
      const temDados = !!(dados.nome_completo || dados.cpf || dados.data_nascimento || dados.nome_mae);
      if (!temDados) {
        setResult({ status: "empty", raw: data });
      } else {
        setResult({ status: "ok", data: dados, raw: data });
      }
    } catch (e: any) {
      setResult({ status: "error", message: e?.message ?? "Erro inesperado" });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-elegant-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Teste de Integração — SA Connect Data por Telefone</CardTitle>
              <CardDescription>
                Consulta o provedor em tempo real. Nenhum eleitor é atualizado nesta tela — apenas exibimos os dados retornados.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tel">Telefone (com DDD)</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="tel"
                placeholder="(62) 98152-3091"
                value={telefone}
                onChange={(e) => setTelefone(maskTelefone(e.target.value))}
                onKeyDown={(e) => { if (e.key === "Enter") consultar(); }}
                inputMode="numeric"
                className="sm:max-w-xs"
              />
              <Button onClick={consultar} disabled={result.status === "loading"} className="gap-2">
                {result.status === "loading"
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Search className="h-4 w-4" />}
                Consultar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {result.status === "loading" && (
        <Card><CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Consultando SA Connect Data…
        </CardContent></Card>
      )}

      {result.status === "error" && (
        <Card className="border-destructive/40">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <CardTitle className="text-base">Falha na consulta</CardTitle>
            </div>
            <CardDescription>{result.message}</CardDescription>
          </CardHeader>
          {result.details && (
            <CardContent>
              <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(result.details, null, 2)}
              </pre>
            </CardContent>
          )}
        </Card>
      )}

      {result.status === "empty" && (
        <Card className="border-amber-500/40">
          <CardHeader>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
              <CardTitle className="text-base">Sem dados para esse telefone</CardTitle>
            </div>
            <CardDescription>
              A SA Connect Data respondeu, mas não retornou nenhum vínculo de pessoa física para o número informado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(result.raw, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {result.status === "ok" && (
        <Card className="border-emerald-500/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <CardTitle className="text-base">Dados encontrados</CardTitle>
              </div>
              <Badge variant="secondary">{result.raw?.provedor ?? "sa-connect-data"}</Badge>
            </div>
            <CardDescription>Resposta normalizada do provedor.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Field label="Nome completo" value={result.data.nome_completo} />
              <Field label="CPF" value={result.data.cpf} />
              <Field label="Data de nascimento" value={result.data.data_nascimento} />
              <Field label="Nome da mãe" value={result.data.nome_mae} />
              <Field label="E-mail" value={result.data.email} />
              <Field label="Título eleitoral" value={result.data.titulo_eleitoral} />
            </div>

            {(() => {
              const end = result.data.endereco ?? {};
              const camposEnd = ["logradouro", "numero", "bairro", "cidade", "uf"] as const;
              const algum = camposEnd.some((k) => end?.[k]);
              return (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Endereço mapeado
                    </span>
                    {algum ? (
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        Encontrado
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        Vazio — provedor não retornou endereço
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Field label="Logradouro" value={end.logradouro} />
                    <Field label="Número" value={end.numero} />
                    <Field label="Bairro" value={end.bairro} />
                    <Field label="Cidade" value={end.cidade} />
                    <Field label="UF" value={end.uf} />
                    <Field label="CEP" value={end.cep} />
                  </div>
                </div>
              );
            })()}

            <details className="rounded-md border bg-muted/30 p-3">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                Resposta completa (JSON)
              </summary>
              <pre className="mt-2 max-h-80 overflow-auto rounded bg-background p-3 text-xs">
                {JSON.stringify(result.raw, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}
    </div>
  );
}