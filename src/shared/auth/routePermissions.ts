// Mapeamento centralizado de rotas → permissões necessárias.
// Usado pelo sidebar (para esconder itens) e pelo guard de rotas
// (para bloquear acesso direto via URL) com base no perfil do usuário.

/**
 * Mapa "prefixo de rota → permission id".
 * A correspondência é feita pelo prefixo MAIS LONGO que casa com o pathname.
 * Rotas não listadas (como /app, /app/dashboard, /app/perfil, /app/hub/*)
 * são consideradas livres para qualquer usuário autenticado.
 */
export const ROUTE_PERMISSIONS: Record<string, string> = {
  // Hubs
  "/app/hub/configuracoes": "settings.dashboard.view",
  "/app/hub/whatsapp": "whatsapp.dashboard.view",
  "/app/hub/tickets": "tickets.dashboard.view",
  "/app/hub/politico": "analise.dashboard.view",

  // Configurações
  "/app/settings/companies": "settings.companies.view",
  "/app/settings/users": "settings.users.view",
  "/app/settings/user-company": "settings.users.view",
  "/app/settings/roles": "settings.profiles.view",
  "/app/settings/general": "settings.dashboard.view",
  "/app/settings": "settings.dashboard.view",
  "/app/configuracoes": "settings.dashboard.view",
  "/app/backup": "settings.backup.view",
  "/app/cadastros": "settings.users.view",
  "/app/notificacoes": "settings.notificacoes.view",
  "/app/webhooks": "settings.dashboard.view",
  "/app/integracoes": "settings.dashboard.view",

  // Análise de Eleitores
  "/app/analise-de-eleitores/cabos": "cabos.view",
  "/app/analise-de-eleitores/liderancas": "liderancas.view",
  "/app/analise-de-eleitores/base": "eleitores.view",
  "/app/analise-de-eleitores/custos-api": "analise.custos.view",
  "/app/analise-de-eleitores/financeiro-admin": "analise.custos.view",
  "/app/analise-de-eleitores/duplicidades": "analise.revisao.manual",
  "/app/analise-de-eleitores/revisao-manual": "analise.revisao.manual",
  "/app/analise-de-eleitores/divergencias": "analise.revisao.manual",
  "/app/analise-de-eleitores/consultas-api": "analise.api.consultar",
  "/app/analise-de-eleitores/enriquecimento-config": "settings.dashboard.view",
  "/app/analise-de-eleitores/integracoes": "settings.dashboard.view",
  "/app/analise-de-eleitores/webhooks": "settings.dashboard.view",
  "/app/analise-de-eleitores/configuracoes": "settings.dashboard.view",
  "/app/analise-de-eleitores/resultados-tse": "analise.analises.view",
  "/app/analise-de-eleitores/comparativo-pos-eleicao": "analise.analises.view",
  "/app/analise-de-eleitores/mapa-estrategico": "political.mapa.view",
  "/app/analise-de-eleitores/hierarquia": "political.hierarquia.view",
  "/app/analise-de-eleitores/metas-gamificacao": "political.metas.view",
  "/app/analise-de-eleitores/performance": "settings.dashboard.view",
  "/app/analise-de-eleitores/homologacao": "settings.dashboard.view",
  "/app/analise-de-eleitores": "analise.dashboard.view",

  // Político
  "/app/political/voters": "eleitores.view",
  "/app/political/capture": "eleitores.create",
  "/app/political/crm": "crm.view",
  "/app/political/events": "eventos.view",
  "/app/political/agenda": "political.agenda.view",
  "/app/political/map": "political.mapa.view",
  "/app/political/polls": "political.pesquisas.view",
  "/app/political/birthdays": "political.aniversariantes.view",
  "/app/political/gamification": "political.gamification.view",
  "/app/political/predictions": "political.predicoes.view",
  "/app/political/competitors": "political.concorrencia.view",
  "/app/political/segmentation": "political.segmentacao.view",
  "/app/political/departments": "departamentos.view",
  "/app/political/liderancas": "liderancas.view",
  "/app/political/cabos": "cabos.view",
  "/app/political/meus-eleitores": "cabos.meus_eleitores",
  "/app/political/hierarquia": "political.hierarquia.view",
  "/app/political/metas-gamificacao": "political.metas.view",
  "/app/political/analise/campanha-estrategico": "political.campanha.view",
  "/app/political": "analise.dashboard.view",

  // WhatsApp / Atendimento / Campanhas
  "/app/whatsapp/sessions": "whatsapp.sessions.view",
  "/app/whatsapp/chat": "whatsapp.chat.read",
  "/app/whatsapp/campaigns": "whatsapp.campanhas.view",
  "/app/whatsapp/bot": "whatsapp.chatbot.view",
  "/app/whatsapp/queues": "whatsapp.chat.read",
  "/app/whatsapp/dashboard": "whatsapp.dashboard.view",
  "/app/whatsapp/settings": "whatsapp.settings.view",
  "/app/whatsapp/integrations": "whatsapp.settings.view",
  "/app/whatsapp/logs": "whatsapp.settings.view",
  "/app/whatsapp-hub": "whatsapp.dashboard.view",
  "/app/whatsapp": "whatsapp.dashboard.view",
  "/app/atendimento": "whatsapp.chat.read",
  "/app/atendimento/templates": "whatsapp.chat.read",
  "/app/atendimento/relatorios": "relatorios.view",
  "/app/atendimento/configuracoes-avancadas": "whatsapp.settings.view",
  "/app/campanhas": "whatsapp.campanhas.view",
  "/app/disparos": "disparos.view",
  "/app/automacoes": "automacoes.view",
  "/app/automacoes-hub": "automacoes.view",
  "/app/chatbot": "whatsapp.chatbot.view",
  "/app/comunicacao": "whatsapp.campanhas.view",

  // WhatsApp oficial
  "/app/wa-meta/dashboard": "whatsapp.dashboard.view",
  "/app/wa-meta/connect": "whatsapp.settings.view",
  "/app/wa-meta/sessions": "whatsapp.sessions.view",
  "/app/wa-meta/templates": "whatsapp.chat.read",
  "/app/wa-meta/campaigns": "whatsapp.campanhas.view",
  "/app/wa-meta/leads": "whatsapp.chat.read",
  "/app/wa-meta": "whatsapp.dashboard.view",

  // WhatsApp Bulk (envio em massa multi-API)
  "/app/whatsapp-bulk/dashboard": "whatsapp.dashboard.view",
  "/app/whatsapp-bulk/apis": "whatsapp.settings.view",
  "/app/whatsapp-bulk/configuracoes": "whatsapp.settings.view",
  "/app/whatsapp-bulk": "whatsapp.dashboard.view",

  // Outros
  "/app/relatorios": "relatorios.view",
  "/app/eventos": "eventos.view",
  "/app/pesquisas": "political.pesquisas.view",
  "/app/pesquisas/nova": "political.pesquisas.view",
  "/app/eleitores": "eleitores.view",
  "/app/captacao": "eleitores.create",
  "/app/tickets/list": "tickets.chamados.view",
  "/app/tickets/calendar": "tickets.agenda.view",
  "/app/tickets/queues": "tickets.filas.view",
  "/app/tickets/categories": "tickets.categorias.view",
  "/app/tickets/sla": "tickets.sla.view",
  "/app/tickets/settings": "tickets.settings.view",
  "/app/tickets": "tickets.dashboard.view",
};

/** Retorna a permission necessária para o pathname (usando o prefixo mais longo) ou null se livre. */
export function getRequiredPermission(pathname: string): string | null {
  let best: string | null = null;
  let bestLen = -1;
  for (const prefix in ROUTE_PERMISSIONS) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      if (prefix.length > bestLen) {
        bestLen = prefix.length;
        best = ROUTE_PERMISSIONS[prefix];
      }
    }
  }
  return best;
}

export function canAccessRoute(
  pathname: string,
  hasPermission: (permission: string) => boolean,
  isSuperAdmin = false,
  external = false,
): boolean {
  if (external || isSuperAdmin) return true;
  const required = getRequiredPermission(pathname);
  return !required || hasPermission(required);
}

/** Rota "casa" sugerida quando a atual é negada. Escolhe a primeira permitida. */
export function findFallbackRoute(hasPermission: (p: string) => boolean): string {
  const candidates: Array<[string, string]> = [
    ["cabos.meus_eleitores", "/app/political/meus-eleitores"],
    ["cabos.view", "/app/political/cabos"],
    ["eleitores.view", "/app/political/voters"],
    ["whatsapp.chat.read", "/app/atendimento"],
    ["tickets.chamados.view", "/app/tickets/list"],
    ["analise.dashboard.view", "/app/analise-de-eleitores"],
  ];
  for (const [perm, url] of candidates) {
    if (hasPermission(perm)) return url;
  }
  return "/app/perfil";
}
