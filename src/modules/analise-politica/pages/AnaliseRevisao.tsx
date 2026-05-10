import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageShell } from "../components/PageShell";
import { analiseService } from "../services/analiseService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, AlertCircle, ArrowLeft, FileEdit } from "lucide-react";

const CAMPOS_APROVAVEIS = [
  { key: "nome", label: "Nome" },
  { key: "cpf", label: "CPF" },
  { key: "data_nascimento", label: "Data nascimento" },
  { key: "nome_mae_extra", label: "Nome da mãe", apiKey: "nome_mae" },
  { key: "email", label: "E-mail" },
  { key: "titulo_eleitoral", label: "Título eleitoral" },
  { key: "municipio_eleitoral", label: "Município eleitoral" },
] as const;

function statusBadge(status: string | undefined) {
  if (status === "compatível") return <Badge className="bg-green-600 hover:bg-green-600 text-white">Compatível</Badge>;
  if (status === "divergente") return <Badge variant="destructive">Divergente</Badge>;
  return <Badge variant="outline">Ausente</Badge>;
}

function getApiValue(dados: any, key: string, apiKey?: string): any {
  if (!dados) return null;
  const k = apiKey ?? key;
  return dados[k] ?? dados.endereco?.[k] ?? null;
}

export default function AnaliseRevisao() {
  const qc = useQueryClient();
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [aplicar, setAplicar] = useState<Record<string, boolean>>({});

  const { data: lista = [], isLoading } = useQuery({
    queryKey: ["analise-revisoes"],
    queryFn: () => analiseService.listarRevisoesPendentes(),
  });

  const ctx = useQuery({
    queryKey: ["analise-revisao-ctx", selecionado],
    queryFn: () => analiseService.obterContextoRevisao(selecionado!),
    enabled: !!selecionado,
  });

  const decidir = useMutation({
    mutationFn: (decisao: "aprovado" | "rejeitado" | "correcao") => {
      if (!selecionado) throw new Error("Nenhum eleitor selecionado");
      if ((decisao === "rejeitado" || decisao === "correcao") && motivo.trim().length < 3) {
        throw new Error("Informe o motivo (mín. 3 caracteres).");
      }
      let aplicar_dados: Record<string, any> | null = null;
      if (decisao === "aprovado") {
        const dados = ctx.data?.consulta?.resposta ?? {};
        aplicar_dados = {};
        for (const c of CAMPOS_APROVAVEIS) {
          if (aplicar[c.key]) {
            const v = getApiValue(dados, c.key, (c as any).apiKey);
            if (v) aplicar_dados[c.key] = v;
          }
        }
      }
      return analiseService.decidirRevisao({
        eleitor_id: selecionado,
        decisao,
        motivo: motivo.trim() || (decisao === "aprovado" ? "Aprovação após revisão manual" : ""),
        aplicar_dados,
      });
    },
    onSuccess: (_d, decisao) => {
      toast.success(`Decisão registrada: ${decisao}`);
      qc.invalidateQueries({ queryKey: ["analise-revisoes"] });
      qc.invalidateQueries({ queryKey: ["analise-eleitores"] });
      setSelecionado(null);
      setMotivo("");
      setAplicar({});
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao registrar decisão"),
  });

  // ---------- LISTA ----------
  if (!selecionado) {
    return (
      <PageShell
        title="Revisão Manual"
        description="Cadastros com divergência forte aguardando decisão humana."
      >
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Carregando…</div>
            ) : lista.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nenhum cadastro pendente de revisão. 🎉
              </div>
            ) : (
              <ul className="divide-y">
                {lista.map((e: any) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{e.nome}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        Score: <strong>{e.score_confianca ?? 0}/100</strong> ·{" "}
                        {e.motivo_divergencia ?? "Pendente revisão"}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => setSelecionado(e.id)}>
                      <FileEdit className="h-3 w-3 mr-1" /> Revisar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  // ---------- DETALHE ----------
  const eleitor = ctx.data?.eleitor;
  const dadosApi = ctx.data?.consulta?.resposta ?? {};
  const divergencia = ctx.data?.divergencia;

  return (
    <PageShell
      title="Revisar cadastro"
      description={eleitor?.nome ?? "Detalhes do registro em análise"}
      actions={
        <Button variant="outline" size="sm" onClick={() => setSelecionado(null)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar à fila
        </Button>
      }
    >
      {ctx.isLoading || !eleitor ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Carregando…</CardContent></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Score + divergências */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Score de confiança</span>
                <Badge className="text-base px-3 py-1" variant={(eleitor.score_confianca ?? 0) >= 70 ? "default" : "secondary"}>
                  {eleitor.score_confianca ?? 0} / 100
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {divergencia?.divergencias_fortes?.length > 0 ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <strong className="text-destructive">Divergências fortes:</strong>{" "}
                  {divergencia.divergencias_fortes.join(", ")}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem divergências fortes registradas.</p>
              )}
              {divergencia?.campos && (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 pt-2">
                  {Object.entries(divergencia.campos).map(([k, v]: any) => (
                    <div key={k} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                      <span className="capitalize">{k.replace("_", " ")}</span>
                      {statusBadge(v)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comparativo */}
          <Card className="lg:col-span-3">
            <CardHeader><CardTitle className="text-base">Comparativo: cadastro × API</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr className="border-b">
                    <th className="text-left py-2 pr-2">Campo</th>
                    <th className="text-left py-2 pr-2">Atual (formulário)</th>
                    <th className="text-left py-2 pr-2">Retorno da API</th>
                    <th className="text-center py-2 px-2">Aplicar</th>
                  </tr>
                </thead>
                <tbody>
                  {CAMPOS_APROVAVEIS.map((c) => {
                    const atual = (eleitor as any)[c.key];
                    const apiVal = getApiValue(dadosApi, c.key, (c as any).apiKey);
                    const diferente = apiVal && String(atual ?? "").trim() !== String(apiVal).trim();
                    return (
                      <tr key={c.key} className="border-b last:border-0">
                        <td className="py-2 pr-2 font-medium">{c.label}</td>
                        <td className="py-2 pr-2 text-muted-foreground">{atual || <span className="italic">—</span>}</td>
                        <td className={`py-2 pr-2 ${diferente ? "text-amber-700 font-medium" : "text-muted-foreground"}`}>
                          {apiVal || <span className="italic">—</span>}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <Checkbox
                            checked={!!aplicar[c.key]}
                            disabled={!apiVal}
                            onCheckedChange={(v) => setAplicar((p) => ({ ...p, [c.key]: !!v }))}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground pt-3">
                Telefone oficial nunca é alterado, mesmo se aprovado.
              </p>
            </CardContent>
          </Card>

          {/* Decisão */}
          <Card className="lg:col-span-3">
            <CardHeader><CardTitle className="text-base">Decisão</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="motivo">Motivo / observação</Label>
                <Textarea
                  id="motivo"
                  rows={3}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Obrigatório para rejeição e solicitação de correção."
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => decidir.mutate("aprovado")}
                  disabled={decidir.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar atualização
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => decidir.mutate("rejeitado")}
                  disabled={decidir.isPending}
                >
                  <XCircle className="h-4 w-4 mr-1" /> Rejeitar atualização
                </Button>
                <Button
                  variant="outline"
                  onClick={() => decidir.mutate("correcao")}
                  disabled={decidir.isPending}
                >
                  <AlertCircle className="h-4 w-4 mr-1" /> Solicitar correção
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  );
}