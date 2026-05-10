import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Sparkles, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type Item = {
  id: string;
  kind: "consulta" | "log";
  created_at: string;
  titulo: string;
  status: "sucesso" | "erro" | "info";
  http_status?: number | null;
  custo_centavos?: number | null;
  duracao_ms?: number | null;
  detalhes?: any;
};

function formatBRDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });
  } catch {
    return iso;
  }
}

function brl(centavos?: number | null) {
  if (centavos == null) return null;
  return `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;
}

export function EleitorHistorico({ eleitorId }: { eleitorId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["eleitor-historico-enriquecimento", eleitorId],
    queryFn: async (): Promise<Item[]> => {
      const [consultasRes, logsRes] = await Promise.all([
        supabase
          .from("analise_api_consultas")
          .select("id, created_at, provedor, endpoint, status, http_status, custo_centavos, duracao_ms, payload, resposta")
          .eq("eleitor_id", eleitorId)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("analise_logs")
          .select("id, created_at, acao, detalhes")
          .eq("eleitor_id", eleitorId)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      if (consultasRes.error) throw consultasRes.error;
      if (logsRes.error) throw logsRes.error;

      const consultas: Item[] = (consultasRes.data ?? []).map((c: any) => ({
        id: `c-${c.id}`,
        kind: "consulta",
        created_at: c.created_at,
        titulo: `Consulta · ${
          (c.provedor ?? "").toLowerCase() === "assertiva" ? "SA Connect Data" : (c.provedor ?? "?")
        } · ${c.endpoint ?? "—"}`,
        status: c.status === "sucesso" ? "sucesso" : "erro",
        http_status: c.http_status,
        custo_centavos: c.custo_centavos,
        duracao_ms: c.duracao_ms,
        detalhes: { payload: c.payload, resposta: c.resposta },
      }));
      const logs: Item[] = (logsRes.data ?? []).map((l: any) => ({
        id: `l-${l.id}`,
        kind: "log",
        created_at: l.created_at,
        titulo: `Evento · ${l.acao}`,
        status: String(l.acao).includes("erro") || String(l.acao).includes("bloqueado") ? "erro" : "info",
        detalhes: l.detalhes,
      }));
      return [...consultas, ...logs].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando histórico…
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        Não foi possível carregar o histórico: {(error as Error).message}
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        <Sparkles className="mx-auto mb-2 h-5 w-5 opacity-60" />
        Nenhum enriquecimento registrado para este eleitor ainda.
        <p className="mt-1 text-xs">Use o botão <strong>Enriquecer</strong> para preencher os dados via SA Connect Data.</p>
      </div>
    );
  }

  const totalConsultas = data.filter((d) => d.kind === "consulta").length;
  const totalCusto = data
    .filter((d) => d.kind === "consulta" && d.custo_centavos)
    .reduce((acc, d) => acc + (d.custo_centavos ?? 0), 0);
  const ultima = data[0]?.created_at;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-md border border-border bg-secondary/40 p-2">
          <p className="text-muted-foreground">Consultas</p>
          <p className="text-base font-semibold text-foreground">{totalConsultas}</p>
        </div>
        <div className="rounded-md border border-border bg-secondary/40 p-2">
          <p className="text-muted-foreground">Custo total</p>
          <p className="text-base font-semibold text-foreground">{brl(totalCusto) ?? "—"}</p>
        </div>
        <div className="rounded-md border border-border bg-secondary/40 p-2">
          <p className="text-muted-foreground">Última atividade</p>
          <p className="text-[11px] font-medium text-foreground">
            {ultima ? formatBRDateTime(ultima) : "—"}
          </p>
        </div>
      </div>

      <ScrollArea className="h-[320px] pr-3">
        <ol className="relative space-y-2 border-l border-border pl-4">
          {data.map((item) => {
            const Icon =
              item.status === "sucesso" ? CheckCircle2 : item.status === "erro" ? XCircle : FileText;
            const colorClass =
              item.status === "sucesso"
                ? "text-emerald-600 bg-emerald-500/10"
                : item.status === "erro"
                ? "text-destructive bg-destructive/10"
                : "text-primary bg-primary/10";
            return (
              <li key={item.id} className="relative">
                <span
                  className={`absolute -left-[26px] top-2 flex h-5 w-5 items-center justify-center rounded-full ${colorClass}`}
                >
                  <Icon className="h-3 w-3" />
                </span>
                <div className="rounded-md border border-border bg-card p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{item.titulo}</p>
                    <span className="text-[11px] text-muted-foreground">
                      {formatBRDateTime(item.created_at)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge
                      variant="outline"
                      className={
                        item.status === "sucesso"
                          ? "border-emerald-500/40 text-emerald-700"
                          : item.status === "erro"
                          ? "border-destructive/40 text-destructive"
                          : "border-primary/40 text-primary"
                      }
                    >
                      {item.status}
                    </Badge>
                    {item.http_status != null && (
                      <Badge variant="outline">HTTP {item.http_status}</Badge>
                    )}
                    {item.custo_centavos != null && item.custo_centavos > 0 && (
                      <Badge variant="outline">{brl(item.custo_centavos)}</Badge>
                    )}
                    {item.duracao_ms != null && (
                      <Badge variant="outline">{item.duracao_ms} ms</Badge>
                    )}
                  </div>
                  {item.detalhes && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
                        Ver detalhes técnicos
                      </summary>
                      <pre className="mt-1 max-h-48 overflow-auto rounded bg-muted p-2 text-[10px] leading-tight">
                        {JSON.stringify(item.detalhes, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </ScrollArea>
    </div>
  );
}