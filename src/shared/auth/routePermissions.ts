// =============================================================================
// Mapeamento centralizado rotas → permissões (default DENY)
// =============================================================================
// Política de segurança em vigor:
//   1. Toda rota sob /app/* exige uma `permission_id` mapeada em
//      `ROUTE_PERMISSIONS` (e que exista em `settings_permissions` no BD,
//      ligada ao perfil em `settings_profile_permissions`).
//   2. A única excepção é a LISTA BRANCA abaixo (`ROUTE_WHITELIST`), que
//      cobre páginas neutras (landing, perfil, hubs/dashboards de visão
//      geral) acessíveis a qualquer utilizador autenticado com vínculo
//      activo em `settings_user_companies`.
//   3. Super admin ignora as duas listas (acesso total).
//   4. Querystring (`?tab=...`) e hash são ignorados; rotas dinâmicas
//      (`:id`, `/editar`) herdam a permissão do prefixo mais longo.
//
// Defesa em profundidade: este ficheiro só decide o UI/router; toda tabela
// sensível continua protegida por RLS no Supabase. O frontend reflecte o
// que o servidor já nega.
//
// NOTA: O hook legado `useModulosPermitidos` / `MODULOS_CATALOGO`
// (ver `src/modules/auth/hooks/useModulosPermitidos.tsx`) é apenas
// metadado de UI (badges, descrições). NÃO é fonte de verdade de
// segurança — sempre que precisar de bloquear/exibir, use
// `canAccessRoute` ou `hasPermission(...)` do `CompanyContext`.

/**
 * Lista branca de rotas autenticadas que NÃO exigem permissão específica.
 * Mantém a UX coerente para páginas de overview/perfil. Qualquer rota
 * NÃO mapeada e NÃO whitelisted será negada por padrão.
 */
/**
 * Apenas estas rotas EXACTAS (sem subárvore) são liberadas. `/app` está aqui
 * para não liberar acidentalmente toda a subárvore de /app.
 */
const ROUTE_WHITELIST_EXACT: readonly string[] = ["/app"];

/**
 * Estes prefixos liberam a rota e qualquer descendente directo. Use com
 * parcimónia — apenas para hubs/landings cujos próprios cards já filtram
 * por permissão internamente.
 */
const ROUTE_WHITELIST_PREFIXES: readonly string[] = [
  "/app/dashboard", // dashboard unificado (abas internas têm guard próprio)
  "/app/perfil",
  "/app/hub/configuracoes",
  "/app/hub/whatsapp",
  "/app/hub/tickets",
  "/app/hub/politico",
];

/** Compatível com testes/consumidores externos: união achatada das duas listas. */
export const ROUTE_WHITELIST: readonly string[] = [
  ...ROUTE_WHITELIST_EXACT,
  ...ROUTE_WHITELIST_PREFIXES,
];

/**
 * Mapa "prefixo de rota → permission id". Correspondência pelo prefixo
 * MAIS LONGO que casa com o pathname.
 */
export const ROUTE_PERMISSIONS: Record<string, string> = {
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
  "/app/analise-de-eleitores/eleitores": "eleitores.view",
  "/app/analise-de-eleitores/meus-eleitores": "cabos.meus_eleitores",
  "/app/analise-de-eleitores/eleitores-lideranca": "eleitores.view",
  "/app/analise-de-eleitores/segmentacao": "political.segmentacao.view",
  "/app/analise-de-eleitores/crm": "crm.view",
  "/app/analise-de-eleitores/novo-eleitor": "eleitores.create",
  "/app/analise-de-eleitores/atribuicoes": "cabos.view",
  "/app/analise-de-eleitores/validacao": "analise.revisao.manual",
  "/app/analise-de-eleitores/custos-api": "analise.custos.view",
  "/app/analise-de-eleitores/consultas-custos": "analise.custos.view",
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
  "/app/analise-de-eleitores/predicao": "political.predicoes.view",
  "/app/analise-de-eleitores/concorrencia": "political.concorrencia.view",
  "/app/analise-de-eleitores/pesquisas": "political.pesquisas.view",
  "/app/analise-de-eleitores/eventos": "eventos.view",
  "/app/analise-de-eleitores/agenda": "political.agenda.view",
  "/app/analise-de-eleitores/aniversariantes": "political.aniversariantes.view",
  "/app/analise-de-eleitores/analises": "analise.analises.view",
  "/app/analise-de-eleitores/relatorios": "relatorios.view",
  "/app/analise-de-eleitores/seguranca-lgpd": "lgpd.visualizar",
  "/app/analise-de-eleitores/consentimentos": "lgpd.visualizar",
  "/app/analise-de-eleitores/logs": "settings.audit.view",
  "/app/analise-de-eleitores/departamentos": "departamentos.view",
  "/app/analise-de-eleitores/mapa-estrategico": "political.mapa.view",
  "/app/analise-de-eleitores/hierarquia": "political.hierarquia.view",
  "/app/analise-de-eleitores/metas-gamificacao": "political.metas.view",
  "/app/analise-de-eleitores/performance": "settings.dashboard.view",
  "/app/analise-de-eleitores/homologacao": "settings.dashboard.view",
  "/app/analise-de-eleitores": "analise.dashboard.view",

  // Módulo análise (rotas legadas /app/analise/*)
  "/app/analise": "analise.dashboard.view",

  // Político
  "/app/political/voters": "eleitores.view",
  "/app/political/capture": "eleitores.create",
  "/app/political/crm": "crm.view",
  "/app/political/events": "eventos.view",
  "/app/political/agenda": "political.agenda.view",
  "/app/political/agenda-eventos": "political.agenda.view",
  "/app/political/dashboard": "analise.dashboard.view",
  "/app/political/map": "political.mapa.view",
  "/app/political/polls": "political.pesquisas.view",
  "/app/political/birthdays": "political.aniversariantes.view",
  "/app/political/gamification": "political.gamification.view",
  "/app/political/predictions": "political.predicoes.view",
  "/app/political/competitors": "political.concorrencia.view",
  "/app/political/segmentation": "political.segmentacao.view",
  "/app/political/logistica": "liderancas.view",
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
  "/app/whatsapp-legacy": "whatsapp.dashboard.view",
  "/app/whatsapp-hub-legacy": "whatsapp.dashboard.view",
  "/app/wa": "whatsapp.dashboard.view",
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
  "/app/whatsapp-bulk/campanhas": "whatsapp.campanhas.view",
  "/app/whatsapp-bulk/templates": "whatsapp.chat.read",
  "/app/whatsapp-bulk/atendimento": "whatsapp.chat.read",
  "/app/whatsapp-bulk/fila": "whatsapp.campanhas.view",
  "/app/whatsapp-bulk/relatorios": "relatorios.view",
  "/app/whatsapp-bulk/optout": "whatsapp.settings.view",
  "/app/whatsapp-bulk": "whatsapp.dashboard.view",

  // Outros
  "/app/relatorios": "relatorios.view",
  "/app/eventos": "eventos.view",
  "/app/pesquisas": "political.pesquisas.view",
  "/app/pesquisas/nova": "political.pesquisas.view",
  "/app/eleitores": "eleitores.view",
  "/app/captacao": "eleitores.create",
  "/app/mapa": "political.mapa.view",
  "/app/agenda": "political.agenda.view",
  "/app/aniversariantes": "political.aniversariantes.view",
  "/app/predicao": "political.predicoes.view",
  "/app/concorrencia": "political.concorrencia.view",
  "/app/gamificacao": "political.gamification.view",
  "/app/crm": "crm.view",
  "/app/segmentacao": "political.segmentacao.view",
  "/app/executivo": "analise.dashboard.view",
  "/app/pessoas": "eleitores.view",
  "/app/departamentos-gabinete": "departamentos.view",
  "/app/politico": "analise.dashboard.view",
  "/app/analise-eleitoral": "analise.dashboard.view",
  "/app/tickets/list": "tickets.chamados.view",
  "/app/tickets/calendar": "tickets.agenda.view",
  "/app/tickets/queues": "tickets.filas.view",
  "/app/tickets/categories": "tickets.categorias.view",
  "/app/tickets/sla": "tickets.sla.view",
  "/app/tickets/settings": "tickets.settings.view",
  "/app/tickets": "tickets.dashboard.view",
};

/** Normaliza o pathname (remove query/hash, trailing slash). */
function normalize(url: string): string {
  const noQuery = url.split("?")[0].split("#")[0];
  return noQuery.length > 1 && noQuery.endsWith("/") ? noQuery.slice(0, -1) : noQuery;
}

/** True se o pathname está na lista branca de rotas autenticadas livres. */
export function isWhitelistedRoute(pathname: string): boolean {
  const path = normalize(pathname);
  if (ROUTE_WHITELIST_EXACT.includes(path)) return true;
  return ROUTE_WHITELIST_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}

/** Retorna a permission necessária para o pathname (prefixo mais longo) ou null se whitelisted/fora de /app. */
export function getRequiredPermission(pathname: string): string | null {
  const path = normalize(pathname);
  if (isWhitelistedRoute(path)) return null;
  let best: string | null = null;
  let bestLen = -1;
  for (const prefix in ROUTE_PERMISSIONS) {
    if (path === prefix || path.startsWith(prefix + "/")) {
      if (prefix.length > bestLen) {
        bestLen = prefix.length;
        best = ROUTE_PERMISSIONS[prefix];
      }
    }
  }
  return best;
}

/** Default deny: rota /app/* sem mapeamento e sem whitelist é considerada negada. */
export function isUnmappedAppRoute(pathname: string): boolean {
  const path = normalize(pathname);
  if (!path.startsWith("/app")) return false;
  if (isWhitelistedRoute(path)) return false;
  return getRequiredPermission(path) === null;
}

export function canAccessRoute(
  pathname: string,
  hasPermission: (permission: string) => boolean,
  isSuperAdmin = false,
  external = false,
): boolean {
  if (external || isSuperAdmin) return true;
  const path = normalize(pathname);
  // Rotas fora de /app não são geridas por este guard.
  if (!path.startsWith("/app")) return true;
  if (isWhitelistedRoute(path)) return true;
  const required = getRequiredPermission(path);
  // Default DENY: sem permissão mapeada → bloqueia.
  if (!required) return false;
  return hasPermission(required);
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
    ["settings.dashboard.view", "/app/settings"],
  ];
  for (const [perm, url] of candidates) {
    if (hasPermission(perm)) return url;
  }
  // Última paragem segura: perfil (sempre whitelisted).
  return "/app/perfil";
}
