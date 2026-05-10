import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageCircle,
  Send,
  Megaphone,
  Bot,
  Users,
  Inbox,
  BarChart3,
  Smartphone,
  Settings2,
} from "lucide-react";
import {
  ModuleOverview,
  type OverviewActivity,
  type OverviewKPI,
  type OverviewPieSlice,
  type OverviewSeriesPoint,
} from "@/shared/components/ModuleOverview";

function lastNDaysLabels(n: number): { iso: string; label: string }[] {
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

export default function WhatsAppOverview() {
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

        const [{ count: msgsToday }, { count: campAtivas }, { count: contatos }, msgs7d, recentes] =
          await Promise.all([
            supabase
              .from("whatsapp_mensagens")
              .select("id", { count: "exact", head: true })
              .eq("direcao", "saida")
              .gte("created_at", today.toISOString()),
            supabase
              .from("whatsapp_meta_campaigns")
              .select("id", { count: "exact", head: true })
              .in("status", ["running", "scheduled", "active"]),
            supabase.from("whatsapp_contacts").select("id", { count: "exact", head: true }),
            supabase
              .from("whatsapp_mensagens")
              .select("created_at,direcao,tipo")
              .gte("created_at", sevenAgo.toISOString())
              .limit(5000),
            supabase
              .from("whatsapp_mensagens")
              .select("conteudo,direcao,tipo,created_at")
              .order("created_at", { ascending: false })
              .limit(8),
          ]);

        if (!alive) return;

        // série últimos 7 dias
        const days = lastNDaysLabels(7);
        const counts: Record<string, number> = Object.fromEntries(days.map((d) => [d.iso, 0]));
        const tipos: Record<string, number> = {};
        for (const m of (msgs7d.data ?? []) as Array<{ created_at: string; tipo?: string | null }>) {
          const iso = (m.created_at ?? "").slice(0, 10);
          if (iso in counts) counts[iso]++;
          const t = (m.tipo ?? "texto") as string;
          tipos[t] = (tipos[t] ?? 0) + 1;
        }
        setSeries(days.map((d) => ({ label: d.label, value: counts[d.iso] })));
        setPie(
          Object.entries(tipos)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, value]) => ({ name, value })),
        );

        const enviadasEntrada = (msgs7d.data ?? []).filter(
          (m: any) => m.direcao === "entrada",
        ).length;
        const enviadasSaida = (msgs7d.data ?? []).filter((m: any) => m.direcao === "saida").length;
        const taxaResp =
          enviadasSaida > 0 ? Math.round((enviadasEntrada / enviadasSaida) * 100) : 0;

        setKpis([
          {
            label: "Mensagens (hoje)",
            value: msgsToday ?? 0,
            hint: "Saídas confirmadas",
            icon: Send,
          },
          {
            label: "Taxa de resposta",
            value: `${taxaResp}%`,
            hint: "Últimos 7 dias",
            icon: BarChart3,
          },
          {
            label: "Campanhas ativas",
            value: campAtivas ?? 0,
            hint: "Em execução ou agendadas",
            icon: Megaphone,
          },
          {
            label: "Contatos",
            value: contatos ?? 0,
            hint: "Únicos cadastrados",
            icon: Users,
          },
        ]);

        setRecent(
          ((recentes.data ?? []) as Array<any>).map((m) => ({
            title:
              (m.conteudo ?? "").toString().slice(0, 80) ||
              `[${m.tipo ?? "mensagem"}]`,
            subtitle: m.direcao === "entrada" ? "Recebida" : "Enviada",
            when: new Date(m.created_at).toLocaleString("pt-BR", {
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
      title="WhatsApp"
      subtitle="Visão geral, atendimentos, campanhas e automações."
      icon={MessageCircle}
      loading={loading}
      kpis={kpis}
      series={{ title: "Mensagens — últimos 7 dias", data: series, type: "line" }}
      pie={{ title: "Tipos de mensagem", data: pie }}
      quickActions={[
        { label: "Nova campanha", to: "/app/campanhas", icon: Megaphone },
        { label: "Novo chatbot", to: "/app/chatbot", icon: Bot },
        { label: "Atendimentos", to: "/app/atendimento", icon: Inbox },
      ]}
      activities={{ title: "Mensagens recentes", items: recent }}
      subpages={[
        { label: "Atendimento", to: "/app/atendimento", icon: Inbox, description: "Caixa de entrada das conversas" },
        { label: "Campanhas", to: "/app/campanhas", icon: Megaphone, description: "Disparos em massa e agendados" },
        { label: "Automações", to: "/app/automacoes-hub", icon: Bot, description: "Chatbots, fluxos, agendamentos" },
        { label: "Relatórios", to: "/app/relatorios?tab=whatsapp", icon: BarChart3 },
        { label: "Conexões", to: "/app/whatsapp/sessions", icon: Smartphone },
        { label: "Configurações", to: "/app/whatsapp/settings", icon: Settings2 },
      ]}
    />
  );
}