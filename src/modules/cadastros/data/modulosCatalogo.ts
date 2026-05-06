/**
 * Catálogo central de módulos do sistema.
 * IDs são strings curtas usadas para casar com as rotas em AppSidebar.
 */
import {
  LayoutGrid, Users, UserPlus, Calendar, CalendarDays, Cake, BarChart2, MapPin,
  MessageSquare, FileBarChart, TrendingUp, Zap, BarChart3, Trophy, Kanban,
  Gauge, Filter, Megaphone, ShieldCheck, Activity, Share2, Settings, UserCog,
  UserCircle, Inbox, Building2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ModuloDef = {
  id: string;
  nome: string;
  descricao: string;
  icon: LucideIcon;
  /** rota associada — usada para filtrar o sidebar */
  url?: string;
};

export const MODULOS_CATALOGO: ModuloDef[] = [
  { id: "dashboard", nome: "Dashboard", descricao: "Visualizar métricas e gráficos principais", icon: LayoutGrid, url: "/app" },
  { id: "eleitores", nome: "Base de Eleitores", descricao: "Gerenciar cadastro de eleitores", icon: Users, url: "/app/eleitores" },
  { id: "novo-eleitor", nome: "Novo Eleitor", descricao: "Adicionar novos eleitores", icon: UserPlus, url: "/app/captacao" },
  { id: "eventos", nome: "Eventos Sociais", descricao: "Criar e gerenciar eventos", icon: Calendar, url: "/app/eventos" },
  { id: "agenda", nome: "Agenda do Gabinete", descricao: "Visualizar agenda de compromissos", icon: CalendarDays, url: "/app/agenda" },
  { id: "aniversariantes", nome: "Aniversariantes", descricao: "Ver lista de aniversariantes", icon: Cake, url: "/app/aniversariantes" },
  { id: "pesquisa", nome: "Pesquisa Eleitoral", descricao: "Criar e visualizar pesquisas", icon: BarChart2, url: "/app/pesquisas" },
  { id: "mapa", nome: "Mapa Eleitoral", descricao: "Visualizar mapa de eleitores", icon: MapPin, url: "/app/mapa" },
  { id: "comunicacao", nome: "Comunicação", descricao: "Enviar mensagens (WhatsApp, SMS, Email)", icon: MessageSquare, url: "/app/comunicacao" },
  { id: "atendimento", nome: "Atendimento WhatsApp", descricao: "Inbox receptivo de conversas", icon: Inbox, url: "/app/atendimento" },
  { id: "relatorios", nome: "Relatórios", descricao: "Gerar e visualizar relatórios", icon: FileBarChart, url: "/app/relatorios" },
  { id: "predicao", nome: "Análise Preditiva", descricao: "Acessar análises de IA", icon: TrendingUp, url: "/app/predicao" },
  { id: "automacao", nome: "Automação Inteligente", descricao: "Criar automações", icon: Zap, url: "/app/automacoes" },
  { id: "concorrencia", nome: "Análise de Concorrência", descricao: "Monitorar concorrentes", icon: BarChart3, url: "/app/concorrencia" },
  { id: "gamificacao", nome: "Gamificação", descricao: "Visualizar ranking e badges", icon: Trophy, url: "/app/gamificacao" },
  { id: "crm", nome: "CRM Avançado", descricao: "Gerenciar pipeline de relacionamento", icon: Kanban, url: "/app/crm" },
  { id: "executivo", nome: "Dashboard Executivo", descricao: "Visão executiva completa", icon: Gauge, url: "/app/executivo" },
  { id: "segmentacao", nome: "Segmentação", descricao: "Criar segmentos de eleitores", icon: Filter, url: "/app/segmentacao" },
  { id: "campanhas", nome: "Campanhas", descricao: "Gerenciar campanhas", icon: Megaphone, url: "/app/campanhas" },
  { id: "aprovacoes", nome: "Aprovações", descricao: "Aprovar ações pendentes", icon: ShieldCheck, url: "/app/aprovacoes" },
  { id: "auditoria", nome: "Auditoria & Logs", descricao: "Visualizar logs do sistema", icon: Activity, url: "/app/auditoria" },
  { id: "integracoes", nome: "Integrações Externas", descricao: "Configurar integrações", icon: Share2, url: "/app/integracoes" },
  { id: "configuracoes", nome: "Configurações", descricao: "Acessar configurações do sistema", icon: Settings, url: "/app/configuracoes" },
  { id: "cadastros", nome: "Cadastros", descricao: "Acessar módulo de cadastros (Admin)", icon: UserCog, url: "/app/cadastros" },
  { id: "departamentos-gabinete", nome: "Departamentos do Gabinete", descricao: "Gerenciar departamentos, membros e histórico", icon: Building2, url: "/app/departamentos-gabinete" },
  { id: "perfil", nome: "Meu Perfil", descricao: "Editar perfil pessoal", icon: UserCircle, url: "/app/perfil" },
];

export const TODOS_IDS = MODULOS_CATALOGO.map((m) => m.id);

/** Presets default — usados como sugestão se a tabela role_modulos vier vazia. */
export const PRESETS_DEFAULT: Record<string, string[]> = {
  admin: TODOS_IDS,
  // "Coordenador" no produto = papel `lideranca` no banco
  lideranca: TODOS_IDS.filter((id) => !["cadastros", "auditoria", "integracoes", "configuracoes"].includes(id)),
  operador: ["dashboard", "eleitores", "novo-eleitor", "eventos", "comunicacao", "relatorios", "pesquisa", "mapa", "gamificacao", "crm", "segmentacao", "perfil"],
  visualizador: ["dashboard", "eleitores", "relatorios", "predicao", "gamificacao", "perfil"],
};

export function getModulo(id: string): ModuloDef | undefined {
  return MODULOS_CATALOGO.find((m) => m.id === id);
}