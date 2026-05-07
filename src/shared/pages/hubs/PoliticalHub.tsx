import {
  Vote,
  Users,
  UserPlus,
  Kanban,
  Calendar,
  CalendarDays,
  MapPin,
  BarChart2,
  Cake,
  Trophy,
  TrendingUp,
  BarChart3,
  Filter,
  Building2,
  ShieldCheck,
  FileBarChart,
  Star,
  Megaphone,
  UserSquare2,
  LayoutDashboard,
} from "lucide-react";
import HubLayout from "./HubLayout";

export default function PoliticalHub() {
  return (
    <HubLayout
      title="Político / Gabinete"
      subtitle="Gestão eleitoral — base, eventos, análise e gabinete."
      icon={Vote}
      submodules={[
        { to: "/app/political/voters", title: "Base de Eleitores", description: "Cadastro completo", icon: Users },
        { to: "/app/political/capture", title: "Novo Eleitor", description: "Cadastro rápido", icon: UserPlus },
        { to: "/app/political/liderancas", title: "Lideranças", description: "Gestão de lideranças", icon: Star },
        { to: "/app/political/cabos", title: "Cabos Eleitorais", description: "Cabos vinculados", icon: Megaphone },
        { to: "/app/political/meus-eleitores", title: "Meus Eleitores (Cabo)", description: "Visão do cabo + link/QR", icon: UserSquare2 },
        { to: "/app/political/hierarquia", title: "Dashboard Hierárquico", description: "Métricas por liderança e cabo", icon: LayoutDashboard },
        { to: "/app/political/crm", title: "CRM Eleitoral", description: "Funil e oportunidades", icon: Kanban },
        { to: "/app/political/events", title: "Eventos Sociais", description: "Agenda pública", icon: Calendar },
        { to: "/app/political/agenda", title: "Agenda do Gabinete", description: "Compromissos internos", icon: CalendarDays },
        { to: "/app/political/map", title: "Mapa Eleitoral", description: "Distribuição geográfica", icon: MapPin },
        { to: "/app/political/polls", title: "Pesquisas", description: "Coleta e resultados", icon: BarChart2 },
        { to: "/app/political/birthdays", title: "Aniversariantes", description: "Mensagens automáticas", icon: Cake },
        { to: "/app/political/gamification", title: "Gamificação", description: "Engajamento da equipe", icon: Trophy },
        { to: "/app/political/predictions", title: "Análise Preditiva", description: "Tendências eleitorais", icon: TrendingUp },
        { to: "/app/political/competitors", title: "Concorrência", description: "Monitorar adversários", icon: BarChart3 },
        { to: "/app/political/segmentation", title: "Segmentação", description: "Filtros avançados", icon: Filter },
        { to: "/app/political/departments", title: "Departamentos", description: "Estrutura do gabinete", icon: Building2 },
        { to: "/app/aprovacoes", title: "Aprovações", description: "Solicitações pendentes", icon: ShieldCheck },
        { to: "/app/relatorios", title: "Relatórios", description: "Análises consolidadas", icon: FileBarChart },
      ]}
    />
  );
}