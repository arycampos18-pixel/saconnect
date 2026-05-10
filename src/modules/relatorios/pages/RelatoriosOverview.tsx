import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  FileBarChart,
  Plus,
  Clock,
  Download,
  ListChecks,
  MessageCircle,
  Users,
  Calendar,
  BarChart3,
} from "lucide-react";
import {
  ModuleOverview,
  type OverviewActivity,
  type OverviewKPI,
  type OverviewPieSlice,
} from "@/shared/components/ModuleOverview";

export default function RelatoriosOverview() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<OverviewKPI[]>([]);
  const [pie, setPie] = useState<OverviewPieSlice[]>([]);
  const [recent, setRecent] = useState<OverviewActivity[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const [{ count: total }, { count: noMes }, { count: agendados }, { data: list }] =
          await Promise.all([
            supabase.from("relatorios_customizados").select("id", { count: "exact", head: true }),
            supabase
              .from("relatorios_customizados")
              .select("id", { count: "exact", head: true })
              .gte("created_at", monthStart.toISOString()),
            supabase
              .from("relatorios_customizados")
              .select("id", { count: "exact", head: true })
              .eq("agendado", true),
            supabase
              .from("relatorios_customizados")
              .select("name,tipo,frequencia,proxima_execucao,created_at")
              .order("created_at", { ascending: false })
              .limit(8),
          ]);

        if (!alive) return;

        const tiposMap: Record<string, number> = {};
        for (const r of (list ?? []) as Array<any>) {
          const k = r.tipo ?? "geral";
          tiposMap[k] = (tiposMap[k] ?? 0) + 1;
        }
        setPie(
          Object.entries(tiposMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, value]) => ({ name, value })),
        );

        const ult = ((list ?? [])[0]?.created_at as string | undefined) ?? null;
        setKpis([
          { label: "Relatórios (mês)", value: noMes ?? 0, icon: FileBarChart },
          { label: "Agendados", value: agendados ?? 0, icon: Clock },
          {
            label: "Última atualização",
            value: ult
              ? new Date(ult).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
              : "—",
            icon: BarChart3,
          },
          { label: "Customizados", value: total ?? 0, icon: ListChecks },
        ]);

        setRecent(
          ((list ?? []) as Array<any>).map((r) => ({
            title: r.name ?? "Relatório",
            subtitle: [r.tipo, r.frequencia].filter(Boolean).join(" • ") || undefined,
            when: new Date(r.created_at).toLocaleString("pt-BR", {
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
      title="Relatórios"
      subtitle="Indicadores consolidados e relatórios customizados."
      icon={FileBarChart}
      loading={loading}
      kpis={kpis}
      pie={{ title: "Relatórios por tipo", data: pie }}
      quickActions={[
        { label: "Novo relatório", to: "/app/relatorios?tab=geral", icon: Plus },
        { label: "Agendar relatório", to: "/app/relatorios?tab=geral", icon: Clock },
        { label: "Exportar dados", to: "/app/relatorios?tab=geral", icon: Download },
      ]}
      activities={{ title: "Relatórios recentes", items: recent }}
      subpages={[
        { label: "WhatsApp", to: "/app/relatorios?tab=whatsapp", icon: MessageCircle },
        { label: "Eleitores", to: "/app/relatorios?tab=eleitores", icon: Users },
        { label: "Eventos", to: "/app/relatorios?tab=eventos", icon: Calendar },
        { label: "Geral", to: "/app/relatorios?tab=geral", icon: BarChart3 },
      ]}
    />
  );
}