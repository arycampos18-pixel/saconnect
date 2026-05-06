import {
  Inbox,
  CalendarDays,
  Zap,
  Tag,
  FileBarChart,
  Settings2,
  ListChecks,
  ShieldCheck,
} from "lucide-react";
import HubLayout from "./HubLayout";

export default function TicketsHub() {
  return (
    <HubLayout
      title="Tickets / Chamados"
      subtitle="Sistema de atendimento integrado — chamados, SLA e automações."
      icon={Inbox}
      submodules={[
        { to: "/app/tickets/list", title: "Gerenciar Chamados", description: "Lista e filtros", icon: ListChecks },
        { to: "/app/tickets/calendar", title: "Agenda / Calendário", description: "Compromissos e prazos", icon: CalendarDays },
        { to: "/app/tickets/queues", title: "Filas & Automações", description: "Roteamento", icon: Zap },
        { to: "/app/tickets/categories", title: "Categorias", description: "Organize chamados", icon: Tag },
        { to: "/app/tickets/sla", title: "SLA", description: "Níveis de serviço", icon: ShieldCheck },
        { to: "/app/tickets/dashboard", title: "Dashboard", description: "Visão geral", icon: FileBarChart },
        { to: "/app/tickets/settings", title: "Configurações", description: "Preferências do módulo", icon: Settings2 },
      ]}
    />
  );
}