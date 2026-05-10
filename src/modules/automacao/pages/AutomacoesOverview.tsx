import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Bot,
  Workflow,
  CalendarClock,
  Plus,
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  Activity,
} from "lucide-react";
import {
  ModuleOverview,
  type OverviewActivity,
  type OverviewKPI,
  type OverviewPieSlice,
  type OverviewSeriesPoint,
} from "@/shared/components/ModuleOverview";

function lastNDays(n: number) {
  const out: { iso: string; label: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push({
      iso: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    });
  }
  return out;
}

export default function AutomacoesOverview() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<OverviewKPI[]>([]);
  const [series, setSeries] = useState<OverviewSeriesPoint[]>([]);
  const [pie, setPie] = useState<OverviewPieSlice[]>([]);
  const [recent, setRecent] = useState<OverviewActivity[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sevenAgo = new Date();
        sevenAgo.setDate(sevenAgo.getDate() - 6);
        sevenAgo.setHours(0, 0, 0, 0);

        const [
          { count: ativas },
          { count: hoje },
          { data: exec7d },
          { data: tipos },
          { data: recentes },
        ] = await Promise.all([
          supabase
            .from("automacoes")
            .select("id", { count: "exact", head: true })
            .eq("status", "Ativa"),
          supabase
            .from("automacao_execucoes")
            .select("id", { count: "exact", head: true })
            .gte("created_at", today.toISOString()),
          supabase
            .from("automacao_execucoes")
            .select("status,created_at")
            .gte("created_at", sevenAgo.toISOString())
            .limit(5000),
          supabase.from("automacoes").select("trigger_tipo"),
          supabase
            .from("automacao_execucoes")
            .select("id,status,erro,created_at,automacao_id")
            .order("created_at", { ascending: false })
            .limit(8),
        ]);

        if (!alive) return;

        const days = lastNDays(7);
        const counts: Record<string, number> = Object.fromEntries(days.map((d) => [d.iso, 0]));
        let sucesso = 0;
        let falhou = 0;
        for (const e of (exec7d ?? []) as Array<any>) {
          const iso = (e.created_at ?? "").slice(0, 10);
          if (iso in counts) counts[iso]++;
          if (e.status === "sucesso") sucesso++;
          else if (e.status === "erro" || e.status === "falhou") falhou++;
        }
        const total = sucesso + falhou;
        const taxa = total > 0 ? Math.round((sucesso / total) * 100) : 0;
        setSeries(days.map((d) => ({ label: d.label, value: counts[d.iso] })));

        const tipoCounts: Record<string, number> = {};
        for (const t of (tipos ?? []) as Array<any>) {
          const k = t.trigger_tipo ?? "outro";
          tipoCounts[k] = (tipoCounts[k] ?? 0) + 1;
        }
        setPie(
          Object.entries(tipoCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, value]) => ({ name, value })),
        );

        setKpis([
          { label: "Automações ativas", value: ativas ?? 0, icon: Bot },
          { label: "Execuções hoje", value: hoje ?? 0, icon: PlayCircle },
          { label: "Taxa de sucesso", value: `${taxa}%`, hint: "Últimos 7 dias", icon: CheckCircle2 },
          { label: "Erros (7d)", value: falhou, icon: AlertTriangle },
        ]);

        setRecent(
          ((recentes ?? []) as Array<any>).map((e) => ({
            title:
              e.status === "sucesso" ? "Execução concluída" : e.erro ? `Erro: ${e.erro}` : `Status: ${e.status}`,
            subtitle: e.automacao_id ? `Automação ${String(e.automacao_id).slice(0, 8)}` : undefined,
            when: new Date(e.created_at).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }),
          })),
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <ModuleOverview
      title="Automações"
      subtitle="Chatbots, fluxos e agendamentos."
      icon={Bot}
      loading={loading}
      kpis={kpis}
      series={{ title: "Execuções — últimos 7 dias", data: series, type: "line" }}
      pie={{ title: "Tipos de gatilho", data: pie }}
      quickActions={[
        { label: "Novo chatbot", to: "/app/chatbot", icon: Bot },
        { label: "Novo fluxo", to: "/app/automacoes-hub?aba=fluxos", icon: Workflow },
        { label: "Agendamentos", to: "/app/automacoes-hub?aba=agendamentos", icon: CalendarClock },
        { label: "Histórico de execuções", to: "/app/automacoes/historico", icon: Activity },
      ]}
      activities={{ title: "Execuções recentes", items: recent }}
    />
  );
}