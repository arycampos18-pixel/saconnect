import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  ShieldCheck,
  Megaphone,
  UserPlus,
  ListChecks,
  Trophy,
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

export default function PessoasOverview() {
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
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const [
          { count: total },
          { count: hoje },
          { count: lideres },
          { count: noMes },
          ele7d,
          recentes,
          lideranças,
        ] = await Promise.all([
          supabase.from("eleitores").select("id", { count: "exact", head: true }),
          supabase
            .from("eleitores")
            .select("id", { count: "exact", head: true })
            .gte("created_at", today.toISOString()),
          supabase
            .from("liderancas")
            .select("id", { count: "exact", head: true })
            .eq("ativo", true),
          supabase
            .from("eleitores")
            .select("id", { count: "exact", head: true })
            .gte("created_at", monthStart.toISOString()),
          supabase
            .from("eleitores")
            .select("created_at,lideranca_id")
            .gte("created_at", sevenAgo.toISOString())
            .limit(5000),
          supabase
            .from("eleitores")
            .select("nome,bairro,cidade,created_at")
            .order("created_at", { ascending: false })
            .limit(8),
          supabase.from("liderancas").select("id,nome").eq("ativo", true).limit(50),
        ]);

        if (!alive) return;

        const days = lastNDays(7);
        const counts: Record<string, number> = Object.fromEntries(days.map((d) => [d.iso, 0]));
        const porLid: Record<string, number> = {};
        const lidNomes: Record<string, string> = Object.fromEntries(
          ((lideranças.data ?? []) as Array<any>).map((l) => [l.id, l.nome]),
        );
        for (const e of (ele7d.data ?? []) as Array<any>) {
          const iso = (e.created_at ?? "").slice(0, 10);
          if (iso in counts) counts[iso]++;
          const k = e.lideranca_id ? lidNomes[e.lideranca_id] ?? "Outras" : "Sem liderança";
          porLid[k] = (porLid[k] ?? 0) + 1;
        }
        setSeries(days.map((d) => ({ label: d.label, value: counts[d.iso] })));
        setPie(
          Object.entries(porLid)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, value]) => ({ name, value })),
        );

        setKpis([
          { label: "Total de eleitores", value: total ?? 0, icon: Users },
          { label: "Cadastros hoje", value: hoje ?? 0, icon: UserPlus },
          { label: "Lideranças ativas", value: lideres ?? 0, icon: ShieldCheck },
          { label: "Cadastros no mês", value: noMes ?? 0, icon: BarChart3 },
        ]);

        setRecent(
          ((recentes.data ?? []) as Array<any>).map((e) => ({
            title: e.nome ?? "Eleitor",
            subtitle: [e.bairro, e.cidade].filter(Boolean).join(" • ") || undefined,
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
      title="Político"
      subtitle="Eleitores, lideranças e cabos eleitorais."
      icon={Users}
      loading={loading}
      kpis={kpis}
      series={{ title: "Cadastros — últimos 7 dias", data: series, type: "bar" }}
      pie={{ title: "Distribuição por liderança", data: pie }}
      quickActions={[
        { label: "Novo eleitor", to: "/app/analise-de-eleitores/novo-eleitor", icon: UserPlus },
        { label: "Nova liderança", to: "/app/analise-de-eleitores/liderancas", icon: ShieldCheck },
        { label: "Novo cabo eleitoral", to: "/app/analise-de-eleitores/cabos", icon: Megaphone },
        { label: "Ver base de eleitores", to: "/app/analise-de-eleitores/base", icon: Users },
      ]}
      activities={{ title: "Eleitores recentes", items: recent }}
      subpages={[
        { label: "Base de Eleitores", to: "/app/analise-de-eleitores/base", icon: Users },
        { label: "Lideranças", to: "/app/analise-de-eleitores/liderancas", icon: ShieldCheck },
        { label: "Cabos Eleitorais", to: "/app/analise-de-eleitores/cabos", icon: Megaphone },
        { label: "Metas & Gamificação", to: "/app/analise-de-eleitores/metas-gamificacao", icon: Trophy },
      ]}
    />
  );
}