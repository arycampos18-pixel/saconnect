import { useState } from "react";
import {
  MessageCircle,
  Inbox,
  Megaphone,
  Bot,
  FileText,
  FileBarChart,
  Settings2,
  Send,
  MessageSquare,
  Smartphone,
  Users,
  Plug,
  LayoutDashboard,
} from "lucide-react";
import HubLayout, { HubSubmodule } from "./HubLayout";

const TABS = [
  { id: "zapi", label: "Z-API (não-oficial)" },
  { id: "meta", label: "Meta (oficial)" },
] as const;

const ZAPI_SUBS: HubSubmodule[] = [
  { to: "/app/atendimento", title: "Atendimento", description: "Chat ao vivo com fila", icon: Inbox },
  { to: "/app/whatsapp-hub", title: "WhatsApp Hub", description: "Visão clássica", icon: MessageCircle },
      { to: "/app/whatsapp/dashboard", title: "WhatsApp 2.0 (SaaS)", description: "Gestão multi-sessão", icon: MessageCircle, badge: "novo" },
  { to: "/app/comunicacao", title: "Comunicação", description: "Mensagens unificadas", icon: MessageSquare },
  { to: "/app/campanhas", title: "Campanhas em Massa", description: "Disparo segmentado", icon: Megaphone },
  { to: "/app/disparos", title: "Disparos", description: "Histórico e filas", icon: Send },
  { to: "/app/chatbot", title: "Chatbot / URA", description: "Fluxos automáticos", icon: Bot },
  { to: "/app/atendimento/templates", title: "Templates", description: "Mensagens prontas", icon: FileText },
  { to: "/app/atendimento/relatorios", title: "Relatórios", description: "Análise de atendimento", icon: FileBarChart },
  { to: "/app/atendimento/configuracoes-avancadas", title: "Configurações", description: "Avançadas do canal", icon: Settings2 },
];

const META_SUBS: HubSubmodule[] = [
  { to: "/app/wa-meta/dashboard", title: "Dashboard", description: "Visão geral oficial", icon: LayoutDashboard },
  { to: "/app/wa-meta/connect", title: "Conexão", description: "Configurar credenciais e OAuth", icon: Plug },
  { to: "/app/wa-meta/sessions", title: "Sessões", description: "Números conectados", icon: Smartphone },
  { to: "/app/wa-meta/templates", title: "Templates", description: "Aprovados pela Meta", icon: FileText },
  { to: "/app/wa-meta/campaigns", title: "Campanhas", description: "Disparo via API oficial", icon: Megaphone },
  { to: "/app/wa-meta/leads", title: "Leads", description: "Conversas e interações", icon: Users },
];

export default function WhatsAppHub() {
  const [tab, setTab] = useState<typeof TABS[number]["id"]>(() => {
    return (localStorage.getItem("sa:wa-hub:tab") as any) || "zapi";
  });

  const handleTab = (id: typeof TABS[number]["id"]) => {
    setTab(id);
    localStorage.setItem("sa:wa-hub:tab", id);
  };

  const isMeta = tab === "meta";

  return (
    <HubLayout
      title="WhatsApp"
      subtitle="Centro de comunicação — Z-API e API oficial da Meta."
      icon={MessageCircle}
      status={[
        { label: "Z-API", value: "Conectada", tone: "ok" },
        { label: "Meta Oficial", value: "Aguardando", tone: "warn" },
      ]}
      extra={
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTab(t.id)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      }
      submodules={isMeta ? META_SUBS : ZAPI_SUBS}
    />
  );
}