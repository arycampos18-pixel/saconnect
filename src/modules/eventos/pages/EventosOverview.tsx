import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  Plus,
  ScanLine,
  ClipboardList,
  BarChart3,
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

export default function EventosOverview() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<OverviewKPI[]>([]);
  const [series, setSeries] = useState<OverviewSeriesPoint[]>([]);
  const [pie, setPie] = useState<OverviewPieSlice[]>([]);
  const [recent, setRecent] = useState<OverviewActivity[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const thirtyAgo = new Date();
        thirtyAgo.setDate(thirtyAgo.getDate() - 29);
        thirtyAgo.setHours(0, 0, 0, 0);

        const [
          { count: doMes },
          inscricoes,
          { data: proximos },
          { data: eventos30 },
          { data: recentes },
        ] = await Promise.all([
          supabase
            .from("eventos")
            .select("id", { count: "exact", head: true })
            .gte("data_hora", monthStart.toISOString()),
          supabase.from("evento_inscricoes").select("presente").limit(20000),
          supabase
            .from("eventos")
            .select("id,nome,data_hora,local")
            .gte("data_hora", new Date().toISOString())
            .order("data_hora", { ascending: true })
            .limit(1),
          supabase
            .from("eventos")
            .select("id,nome,data_hora")
            .gte("data_hora", thirtyAgo.toISOString())
            .limit(2000),
          supabase
            .from("eventos")
            .select("id,nome,local,data_hora")
            .order("data_hora", { ascending: false })
            .limit(8),
        ]);

        if (!alive) return;

        const totalIns = (inscricoes.data ?? []).length;
        const presentes = (inscricoes.data ?? []).filter((i: any) => i.presente).length;
        const taxa = totalIns > 0 ? Math.round((presentes / totalIns) * 100) : 0;
        const prox = (proximos ?? [])[0];

        // Série: eventos por dia nos últimos 30 dias (agregado por semana p/ legibilidade)
        const days = lastNDays(7);
        const counts: Record<string, number> = Object.fromEntries(days.map((d) => [d.iso, 0]));
        for (const e of (eventos30 ?? []) as Array<any>) {
          const iso = (e.data_hora ?? "").slice(0, 10);
          if (iso in counts) counts[iso]++;
        }
        setSeries(days.map((d) => ({ label: d.label, value: counts[d.iso] })));

        // Pie: top 5 eventos por presença
        const insPorEvento: Record<string, number> = {};
        for (const i of (inscricoes.data ?? []) as Array<any>) {
          if (i.presente && i.evento_id) {
            insPorEvento[i.evento_id] = (insPorEvento[i.evento_id] ?? 0) + 1;
          }
        }
        const nomesEv: Record<string, string> = Object.fromEntries(
          ((recentes ?? []) as Array<any>).map((e) => [e.id, e.nome]),
        );
        setPie(
          Object.entries(insPorEvento)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([id, value]) => ({ name: nomesEv[id] ?? "Evento", value })),
        );

        setKpis([
          { label: "Eventos no mês", value: doMes ?? 0, icon: CalendarDays },
          { label: "Total de presentes", value: presentes, icon: CheckCircle2 },
          { label: "Taxa de presença", value: `${taxa}%`, icon: BarChart3 },
          {
            label: "Próximo evento",
            value: prox
              ? new Date(prox.data_hora).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                })
              : "—",
            hint: prox?.nome ?? "Nenhum agendado",
            icon: Calendar,
          },
        ]);

        setRecent(
          ((recentes ?? []) as Array<any>).map((e) => ({
            title: e.nome ?? "Evento",
            subtitle: e.local ?? undefined,
            when: new Date(e.data_hora).toLocaleString("pt-BR", {
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
      title="Eventos"
      subtitle="Agenda, eventos, check-ins e pesquisas."
      icon={Calendar}
      loading={loading}
      kpis={kpis}
      series={{ title: "Eventos — últimos 7 dias", data: series, type: "bar" }}
      pie={{ title: "Top eventos por presença", data: pie }}
      quickActions={[
        { label: "Novo evento", to: "/app/political/events", icon: Plus },
        { label: "Check-in", to: "/app/political/events", icon: ScanLine },
        { label: "Nova pesquisa", to: "/app/pesquisas/nova", icon: ClipboardList },
        { label: "Ver agenda", to: "/app/political/agenda", icon: CalendarDays },
      ]}
      activities={{ title: "Eventos recentes", items: recent }}
      subpages={[
        { label: "Agenda", to: "/app/political/agenda", icon: CalendarDays },
        { label: "Eventos", to: "/app/political/events", icon: Calendar },
        { label: "Pesquisas", to: "/app/political/polls", icon: ClipboardList },
        { label: "Aniversariantes", to: "/app/political/birthdays", icon: BarChart3 },
      ]}
    />
  );
}