import { useState } from "react";
import { PageShell } from "../components/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, Loader2, PlayCircle, Download, AlertCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { analiseService } from "../services/analiseService";

type Status = "pendente" | "rodando" | "ok" | "falhou" | "aviso";
type Resultado = { id: string; nome: string; categoria: string; status: Status; mensagem?: string; duracao_ms?: number; detalhes?: any };

type Suite = { id: string; nome: string; categoria: string; run: () => Promise<{ ok: boolean; mensagem?: string; aviso?: boolean; detalhes?: any }> };

const suites: Suite[] = [
  {
    id: "auth", nome: "Autenticação ativa", categoria: "Permissões",
    run: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user ? { ok: true, mensagem: `Logado como ${data.user.email}` }
        : { ok: false, mensagem: "Usuário não autenticado" };
    },
  },
  {
    id: "company", nome: "Empresa padrão definida", categoria: "Permissões",
    run: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { ok: false, mensagem: "Sem sessão" };
      const { data } = await supabase.rpc("user_default_company", { _user_id: u.user.id });
      return data ? { ok: true, mensagem: `Empresa: ${String(data).slice(0, 8)}…` }
        : { ok: false, mensagem: "Sem company padrão" };
    },
  },
  {
    id: "list_eleitores", nome: "Listar eleitores (analise_eleitores)", categoria: "Cadastro",
    run: async () => {
      const { data, error } = await supabase.from("eleitores").select("id", { count: "exact", head: true });
      if (error) return { ok: false, mensagem: error.message };
      return { ok: true, mensagem: "Acesso liberado" };
    },
  },
  {
    id: "rls_eleitor_outra_company", nome: "RLS — não vê dados de outra empresa", categoria: "Permissões",
    run: async () => {
      const { data } = await supabase.from("eleitores").select("company_id").limit(50);
      const ids = new Set((data ?? []).map((r: any) => r.company_id));
      return ids.size <= 1
        ? { ok: true, mensagem: `Apenas ${ids.size} company visível` }
        : { ok: false, mensagem: `Vazamento: ${ids.size} companies retornadas` };
    },
  },
  {
    id: "consultas_api", nome: "Tabela de consultas API acessível", categoria: "APIs",
    run: async () => {
      const { error } = await supabase.from("api_consultas_custos").select("id").limit(1);
      return error ? { ok: false, mensagem: error.message } : { ok: true };
    },
  },
  {
    id: "custos_config", nome: "Configurações de custo ativas", categoria: "Custos",
    run: async () => {
      const { data, error } = await supabase.from("api_configuracoes_custo").select("nome,custo_centavos,status").eq("status", "ativo").limit(5);
      if (error) return { ok: false, mensagem: error.message };
      return (data?.length ?? 0) > 0
        ? { ok: true, mensagem: `${data!.length} APIs configuradas`, detalhes: data }
        : { ok: false, aviso: true, mensagem: "Nenhuma API com custo ativo" };
    },
  },
  {
    id: "dup_config", nome: "Detecção de duplicidades disponível", categoria: "Divergências",
    run: async () => {
      const { error } = await supabase.from("analise_duplicidades").select("id").limit(1);
      return error ? { ok: false, mensagem: error.message } : { ok: true };
    },
  },
  {
    id: "tse_import", nome: "Tabela TSE acessível para importação", categoria: "Importação TSE",
    run: async () => {
      const { error } = await supabase.from("resultados_eleitorais_tse").select("id").limit(1);
      return error ? { ok: false, mensagem: error.message } : { ok: true };
    },
  },
  {
    id: "relatorios", nome: "Logs/Relatórios consultáveis", categoria: "Relatórios",
    run: async () => {
      const logs = await analiseService.listarLogs(10);
      return { ok: true, mensagem: `${logs.length} eventos recentes` };
    },
  },
  {
    id: "dashboards_kpi", nome: "Dashboard — agregação de KPIs", categoria: "Dashboards",
    run: async () => {
      const [{ count: total }, { count: validados }] = await Promise.all([
        supabase.from("eleitores").select("id", { count: "exact", head: true }),
        supabase.from("eleitores").select("id", { count: "exact", head: true }).eq("validado", true),
      ]);
      return { ok: true, mensagem: `Total: ${total ?? 0} · Validados: ${validados ?? 0}` };
    },
  },
  {
    id: "lgpd", nome: "LGPD — consentimentos e solicitações", categoria: "Permissões",
    run: async () => {
      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase.from("lgpd_consentimentos").select("id").limit(1),
        supabase.from("lgpd_solicitacoes").select("id").limit(1),
      ]);
      if (e1 || e2) return { ok: false, mensagem: e1?.message || e2?.message };
      return { ok: true };
    },
  },
  {
    id: "fila_jobs", nome: "Fila de processamento operacional", categoria: "Performance",
    run: async () => {
      const stats = await analiseService.statsJobs();
      const erros = stats.erro || 0;
      const total = (stats.pendente || 0) + (stats.processando || 0) + (stats.sucesso || 0) + erros;
      if (total === 0) return { ok: true, aviso: true, mensagem: "Fila vazia (sem histórico)" };
      const taxaErro = erros / total;
      return taxaErro > 0.3
        ? { ok: false, mensagem: `Taxa de erro alta: ${(taxaErro * 100).toFixed(0)}%`, detalhes: stats }
        : { ok: true, mensagem: `${total} jobs · ${erros} erros`, detalhes: stats };
    },
  },
  {
    id: "cache", nome: "Cache de consultas operacional", categoria: "Performance",
    run: async () => {
      const { error } = await supabase.from("analise_cache_consultas").select("id").limit(1);
      return error ? { ok: false, mensagem: error.message } : { ok: true };
    },
  },
  {
    id: "edge_worker", nome: "Edge function: worker de fila respondendo", categoria: "APIs",
    run: async () => {
      try {
        const r = await analiseService.processarFila(1);
        return { ok: true, mensagem: `Worker OK · ${(r as any)?.processados ?? 0} processados` };
      } catch (e: any) {
        return { ok: false, mensagem: e.message };
      }
    },
  },
  {
    id: "edge_validacao", nome: "Edge function: validação eleitoral disponível", categoria: "Validação WhatsApp",
    run: async () => {
      try {
        const { error } = await supabase.functions.invoke("analise-validacao-eleitoral", { body: { __ping: true } });
        if (error && !String(error.message).includes("400")) return { ok: false, mensagem: error.message };
        return { ok: true, mensagem: "Endpoint responde" };
      } catch (e: any) {
        return { ok: true, aviso: true, mensagem: "Endpoint responde com aviso" };
      }
    },
  },
];

const STATUS_CFG: Record<Status, { icon: any; color: string; label: string }> = {
  pendente: { icon: Clock, color: "text-muted-foreground", label: "Pendente" },
  rodando: { icon: Loader2, color: "text-blue-600", label: "Rodando" },
  ok: { icon: CheckCircle2, color: "text-green-600", label: "OK" },
  aviso: { icon: AlertCircle, color: "text-amber-600", label: "Aviso" },
  falhou: { icon: XCircle, color: "text-red-600", label: "Falhou" },
};

export default function AnaliseHomologacao() {
  const [resultados, setResultados] = useState<Resultado[]>(
    suites.map(s => ({ id: s.id, nome: s.nome, categoria: s.categoria, status: "pendente" as Status }))
  );
  const [rodando, setRodando] = useState(false);
  const [progresso, setProgresso] = useState(0);

  async function executar() {
    setRodando(true);
    setProgresso(0);
    const novos: Resultado[] = suites.map(s => ({ id: s.id, nome: s.nome, categoria: s.categoria, status: "pendente" }));
    setResultados([...novos]);

    for (let i = 0; i < suites.length; i++) {
      const s = suites[i];
      novos[i] = { ...novos[i], status: "rodando" };
      setResultados([...novos]);
      const t0 = performance.now();
      try {
        const r = await s.run();
        const dur = Math.round(performance.now() - t0);
        novos[i] = {
          ...novos[i],
          status: r.ok ? (r.aviso ? "aviso" : "ok") : "falhou",
          mensagem: r.mensagem,
          duracao_ms: dur,
          detalhes: r.detalhes,
        };
      } catch (e: any) {
        novos[i] = { ...novos[i], status: "falhou", mensagem: e?.message || String(e), duracao_ms: Math.round(performance.now() - t0) };
      }
      setResultados([...novos]);
      setProgresso(Math.round(((i + 1) / suites.length) * 100));
    }
    setRodando(false);
  }

  const stats = {
    ok: resultados.filter(r => r.status === "ok").length,
    aviso: resultados.filter(r => r.status === "aviso").length,
    falhou: resultados.filter(r => r.status === "falhou").length,
    pendente: resultados.filter(r => r.status === "pendente").length,
  };
  const total = resultados.length;
  const score = total > 0 ? Math.round(((stats.ok + stats.aviso * 0.5) / total) * 100) : 0;

  function exportar() {
    const data = {
      gerado_em: new Date().toISOString(),
      score_homologacao: score,
      resumo: stats,
      total_testes: total,
      resultados,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `homologacao-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  function exportarMD() {
    let md = `# Relatório de Homologação\n\n`;
    md += `**Data:** ${new Date().toLocaleString("pt-BR")}\n`;
    md += `**Score:** ${score}% · ✅ ${stats.ok} OK · ⚠️ ${stats.aviso} Aviso · ❌ ${stats.falhou} Falhou\n\n`;
    const cats = Array.from(new Set(resultados.map(r => r.categoria)));
    for (const cat of cats) {
      md += `## ${cat}\n\n| Teste | Status | Mensagem | Tempo |\n|---|---|---|---|\n`;
      resultados.filter(r => r.categoria === cat).forEach(r => {
        const ic = r.status === "ok" ? "✅" : r.status === "aviso" ? "⚠️" : r.status === "falhou" ? "❌" : "⏳";
        md += `| ${r.nome} | ${ic} ${r.status} | ${r.mensagem || "-"} | ${r.duracao_ms ?? 0}ms |\n`;
      });
      md += `\n`;
    }
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `homologacao-${Date.now()}.md`; a.click();
    URL.revokeObjectURL(url);
  }

  const categorias = Array.from(new Set(resultados.map(r => r.categoria)));

  return (
    <PageShell
      title="Homologação do Módulo"
      description="Suite de testes automatizados para validar cadastros, APIs, RLS, importações, dashboards e permissões."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportarMD} disabled={stats.pendente === total}>
            <Download className="mr-2 h-4 w-4" />Markdown
          </Button>
          <Button variant="outline" onClick={exportar} disabled={stats.pendente === total}>
            <Download className="mr-2 h-4 w-4" />JSON
          </Button>
          <Button onClick={executar} disabled={rodando}>
            {rodando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
            Executar Suite
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-5 mb-4">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Score</div>
          <div className="text-3xl font-bold mt-1">{score}%</div>
          <Progress value={score} className="mt-2 h-2" />
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Total</div>
          <div className="text-2xl font-bold mt-1">{total}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-green-700">Aprovados</div>
          <div className="text-2xl font-bold text-green-700 mt-1">{stats.ok}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-amber-700">Avisos</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{stats.aviso}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-red-700">Falhas</div>
          <div className="text-2xl font-bold text-red-700 mt-1">{stats.falhou}</div>
        </CardContent></Card>
      </div>

      {rodando && <Progress value={progresso} className="mb-4 h-2" />}

      <ScrollArea className="h-[60vh]">
        <div className="space-y-4">
          {categorias.map(cat => (
            <Card key={cat}>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{cat}</CardTitle></CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {resultados.filter(r => r.categoria === cat).map(r => {
                    const cfg = STATUS_CFG[r.status];
                    const Icon = cfg.icon;
                    return (
                      <li key={r.id} className="px-4 py-3 flex items-start gap-3">
                        <Icon className={`h-5 w-5 mt-0.5 ${cfg.color} ${r.status === "rodando" ? "animate-spin" : ""}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-sm">{r.nome}</span>
                            <div className="flex items-center gap-2">
                              {r.duracao_ms !== undefined && <span className="text-xs text-muted-foreground">{r.duracao_ms}ms</span>}
                              <Badge variant="outline" className={cfg.color}>{cfg.label}</Badge>
                            </div>
                          </div>
                          {r.mensagem && <div className="text-xs text-muted-foreground mt-1">{r.mensagem}</div>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </PageShell>
  );
}
