import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

type Crumb = { label: string; to?: string };

const exactMap: Record<string, string> = {
  "/app": "Painel",
  "/app/dashboard": "Painel",
  "/app/eleitores": "Base de Eleitores",
  "/app/captacao": "Novo Eleitor",
  "/app/comunicacao": "Comunicação",
  "/app/perfil": "Meu Perfil",
  "/app/agenda": "Agenda do Gabinete",
  "/app/aniversariantes": "Aniversariantes",
  "/app/eventos": "Eventos",
  "/app/pesquisas": "Pesquisa Eleitoral",
  "/app/mapa": "Mapa Eleitoral",
  "/app/relatorios": "Relatórios",
  "/app/cadastros": "Cadastros",
  "/app/campanhas": "Campanhas",
  "/app/chatbot": "Automações",
  "/app/automacoes-hub": "Automações",
  "/app/atendimento": "Atendimento",
  "/app/notificacoes": "Notificações",
  "/app/backup": "Backup",
  "/app/pessoas": "Político",
  "/app/whatsapp": "WhatsApp",
  "/app/whatsapp-bulk": "Disparos API OFICIAL",
  "/app/tickets": "Tickets",
  "/app/configuracoes": "Configurações",
};

const sectionMap: Record<string, { label: string; to: string }> = {
  "/app/analise-de-eleitores": { label: "Político", to: "/app/political/dashboard" },
  "/app/pessoas": { label: "Político", to: "/app/political/dashboard" },
  "/app/whatsapp": { label: "WhatsApp", to: "/app/whatsapp" },
  "/app/wa-meta": { label: "WhatsApp", to: "/app/whatsapp" },
  "/app/whatsapp-bulk": { label: "Disparos API OFICIAL", to: "/app/whatsapp-bulk/dashboard" },
  "/app/tickets": { label: "Tickets", to: "/app/tickets" },
  "/app/settings": { label: "Configurações", to: "/app/configuracoes" },
  "/app/eventos": { label: "Eventos", to: "/app/eventos" },
  "/app/automacoes-hub": { label: "Automações", to: "/app/automacoes-hub" },
  "/app/relatorios": { label: "Relatórios", to: "/app/relatorios" },
};

const subLabels: Record<string, string> = {
  // Análise
  dashboard: "Dashboard", base: "Base de Eleitores", eleitores: "Eleitores",
  "meus-eleitores": "Meus Eleitores", "eleitores-lideranca": "Eleitores da Liderança",
  "novo-eleitor": "Novo Eleitor", liderancas: "Lideranças", cabos: "Cabos Eleitorais",
  atribuicoes: "Atribuições", crm: "CRM Eleitoral", aprovacoes: "Aprovações",
  hierarquia: "Hierarquia", "metas-gamificacao": "Metas & Gamificação",
  validacao: "Validação", revisao: "Revisão", duplicidades: "Duplicidades",
  tse: "TSE", comparativo: "Comparativo", "mapa-estrategico": "Mapa Estratégico",
  lgpd: "LGPD", logs: "Logs", performance: "Performance", homologacao: "Homologação",
  integracoes: "Integrações", analises: "Análises",
  "consultas-api": "Consultas de API", "custos-api": "Custos de API", financeiro: "Financeiro",
  "enriquecimento-config": "Orçamento & Consumo",
  // WhatsApp
  sessions: "Conexões", chat: "Conversas", contacts: "Contatos",
  compositor: "Compositor", campaigns: "Campanhas", bot: "Chatbot",
  queues: "Filas", settings: "Configurações", connect: "Conexão",
  templates: "Templates", leads: "Leads",
  // WhatsApp Bulk
  apis: "Conexões / APIs", campanhas: "Campanhas", atendimento: "Atendimento",
  fila: "Fila de Envios", relatorios: "Relatórios", optout: "Opt-out",
  configuracoes: "Configurações",
  // Tickets
  list: "Chamados", view: "Detalhe", calendar: "Agenda",
  categories: "Categorias", sla: "SLA",
  // Settings
  companies: "Empresas", users: "Usuários", roles: "Perfis & Permissões",
  general: "Geral",
  // Eventos / outros
  novo: "Novo", editar: "Editar", detalhe: "Detalhe",
};

function humanize(slug: string) {
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
}

function buildCrumbs(pathname: string): Crumb[] {
  if (exactMap[pathname]) return [{ label: exactMap[pathname] }];

  for (const prefix of Object.keys(sectionMap)) {
    if (pathname.startsWith(prefix + "/")) {
      const section = sectionMap[prefix];
      const rest = pathname.slice(prefix.length + 1).split("/").filter(Boolean);
      const crumbs: Crumb[] = [{ label: section.label, to: section.to }];
      let acc = prefix;
      rest.forEach((seg, i) => {
        acc += "/" + seg;
        const label = subLabels[seg] ?? humanize(seg);
        crumbs.push({ label, to: i < rest.length - 1 ? acc : undefined });
      });
      return crumbs;
    }
  }

  // Fallback genérico
  const parts = pathname.replace(/^\/app\/?/, "").split("/").filter(Boolean);
  if (parts.length === 0) return [{ label: "Painel" }];
  let acc = "/app";
  return parts.map((seg, i) => {
    acc += "/" + seg;
    return { label: subLabels[seg] ?? humanize(seg), to: i < parts.length - 1 ? acc : undefined };
  });
}

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const crumbs = buildCrumbs(pathname);
  const current = crumbs[crumbs.length - 1]?.label ?? "Painel";

  return (
    <>
      <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
        <Link to="/app/dashboard" className="flex items-center gap-1 font-medium tracking-[0.08em] hover:text-foreground">
          <Home className="h-3.5 w-3.5" />
          <span>S A CONNECT</span>
        </Link>
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5" />
            {c.to ? (
              <Link to={c.to} className="font-medium hover:text-foreground">{c.label}</Link>
            ) : (
              <span className="font-medium text-foreground">{c.label}</span>
            )}
          </span>
        ))}
      </nav>
      <p className="truncate text-sm font-semibold text-foreground sm:hidden">{current}</p>
    </>
  );
}