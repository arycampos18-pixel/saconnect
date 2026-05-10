import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "../components/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, RefreshCw, PlayCircle, Database, Loader2, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { analiseService } from "../services/analiseService";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const STATUS_BADGE: Record<string, any> = {
  pendente: "outline",
  processando: "secondary",
  sucesso: "default",
  erro: "destructive",
};

const STATUS_ICON: Record<string, any> = {
  pendente: Clock,
  processando: Loader2,
  sucesso: CheckCircle2,
  erro: AlertCircle,
};

export default function AnalisePerformance() {
  const qc = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ["jobs-stats"],
    queryFn: () => analiseService.statsJobs(),
    refetchInterval: 5000,
  });

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs-list"],
    queryFn: () => analiseService.listarJobs({ limit: 100 }),
    refetchInterval: 5000,
  });

  const { data: cache = [] } = useQuery({
    queryKey: ["cache-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("analise_cache_consultas")
        .select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const processar = useMutation({
    mutationFn: (lote: number) => analiseService.processarFila(lote),
    onSuccess: (r: any) => {
      toast.success(`Worker processou ${r?.processados ?? 0} jobs`);
      qc.invalidateQueries({ queryKey: ["jobs-stats"] });
      qc.invalidateQueries({ queryKey: ["jobs-list"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const total = (stats?.pendente || 0) + (stats?.processando || 0) + (stats?.sucesso || 0) + (stats?.erro || 0);

  return (
    <PageShell
      title="Performance & Filas"
      description="Processamento assíncrono, cache, retry automático e controle de concorrência."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => qc.invalidateQueries()}>
            <RefreshCw className="mr-2 h-4 w-4" />Atualizar
          </Button>
          <Button onClick={() => processar.mutate(10)} disabled={processar.isPending}>
            <PlayCircle className="mr-2 h-4 w-4" />Processar Fila
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-4 mb-4">
        <KpiCard label="Pendentes" value={stats?.pendente || 0} icon={Clock} tone="text-amber-600" />
        <KpiCard label="Processando" value={stats?.processando || 0} icon={Loader2} tone="text-blue-600" />
        <KpiCard label="Concluídos" value={stats?.sucesso || 0} icon={CheckCircle2} tone="text-green-600" />
        <KpiCard label="Falhas" value={stats?.erro || 0} icon={AlertCircle} tone="text-red-600" />
      </div>

      <Tabs defaultValue="fila">
        <TabsList>
          <TabsTrigger value="fila">Fila ({total})</TabsTrigger>
          <TabsTrigger value="cache">Cache ({cache.length})</TabsTrigger>
          <TabsTrigger value="info">Como funciona</TabsTrigger>
        </TabsList>

        <TabsContent value="fila">
          <Card>
            <CardContent className="p-0">
              {isLoading ? <div className="py-8 text-center">Carregando...</div> : jobs.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Nenhum job na fila.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase">
                      <tr>
                        <th className="px-3 py-2 text-left">Tipo</th>
                        <th className="px-3 py-2 text-left">Chave</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-center">Tent.</th>
                        <th className="px-3 py-2 text-left">Próximo em</th>
                        <th className="px-3 py-2 text-left">Erro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((j: any) => {
                        const Icon = STATUS_ICON[j.status] || Clock;
                        return (
                          <tr key={j.id} className="border-t hover:bg-muted/30">
                            <td className="px-3 py-2 font-medium">{j.tipo}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{j.chave || "—"}</td>
                            <td className="px-3 py-2">
                              <Badge variant={STATUS_BADGE[j.status] as any} className="gap-1">
                                <Icon className={`h-3 w-3 ${j.status === "processando" ? "animate-spin" : ""}`} />
                                {j.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-center">{j.tentativas}/{j.max_tentativas}</td>
                            <td className="px-3 py-2 text-xs">{new Date(j.proximo_em).toLocaleString("pt-BR")}</td>
                            <td className="px-3 py-2 text-xs text-red-600 max-w-xs truncate">{j.erro || ""}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache">
          <Card>
            <CardContent className="p-0">
              {cache.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  <Database className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Sem entradas em cache.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase">
                      <tr>
                        <th className="px-3 py-2 text-left">Fonte</th>
                        <th className="px-3 py-2 text-left">Chave</th>
                        <th className="px-3 py-2 text-left">Expira em</th>
                        <th className="px-3 py-2 text-left">Criado em</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cache.map((c: any) => (
                        <tr key={c.id} className="border-t">
                          <td className="px-3 py-2"><Badge variant="outline">{c.fonte}</Badge></td>
                          <td className="px-3 py-2 font-mono text-xs">{c.chave}</td>
                          <td className="px-3 py-2 text-xs">{new Date(c.expira_em).toLocaleString("pt-BR")}</td>
                          <td className="px-3 py-2 text-xs">{new Date(c.created_at).toLocaleString("pt-BR")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardHeader><CardTitle className="text-base">Arquitetura de performance</CardTitle></CardHeader>
            <CardContent className="prose prose-sm max-w-none text-sm space-y-3">
              <div><strong>📋 Fila assíncrona:</strong> consultas pesadas (enriquecimento, validação, WhatsApp) são enfileiradas em <code>analise_jobs</code> e processadas em background pelo worker, sem travar a interface.</div>
              <div><strong>🔁 Retry automático:</strong> falhas são reprocessadas com backoff exponencial (30s, 60s, 120s) até <code>max_tentativas</code>.</div>
              <div><strong>🔒 Concorrência:</strong> reserva de jobs usa <code>FOR UPDATE SKIP LOCKED</code>, permitindo múltiplos workers em paralelo sem duplicar trabalho.</div>
              <div><strong>🛡️ Anti-duplicação:</strong> índice único em (tipo + chave + status ativo) impede enfileirar a mesma tarefa duas vezes.</div>
              <div><strong>⚡ Cache:</strong> resultados de APIs externas ficam em <code>analise_cache_consultas</code> com TTL configurável (padrão 24h), evitando custos repetidos.</div>
              <div><strong>📊 Dashboards:</strong> dados isolados na schema do módulo — operações pesadas não impactam o WhatsApp/CRM principais.</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function KpiCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-2xl font-bold mt-1">{value}</div>
          </div>
          <Icon className={`h-8 w-8 ${tone} opacity-60`} />
        </div>
      </CardContent>
    </Card>
  );
}
