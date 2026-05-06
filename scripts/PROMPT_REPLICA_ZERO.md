# Prompt mestre — recriar “SA Connect / Smart Political Relations” do zero

Copie **tudo** entre as linhas `---INÍCIO---` e `---FIM---` e cole noutra IA (modo agente / implementação).  
Anexe também o ficheiro `replica-context-manifest.txt` gerado pelo script `export-replica-context.ps1`, **ou** anexe o repositório original como referência.

---INÍCIO---

## Papel

És um engenheiro sénior full-stack. Deves **implementar um clone funcional** de um SaaS multi-tenant para **relações políticas / campanha / gabinete**, com **WhatsApp (Z-API não-oficial + Meta Cloud API oficial)**, **atendimento**, **tickets**, **automações**, **disparos**, **CRM eleitoral**, etc.

**Regra de ouro:** preserva o **modelo de dados**, **rotas**, **módulos**, **fluxos de integração** e **padrões de código** descritos abaixo. Não inventes um “produto diferente”; replica a arquitectura.

## Stack obrigatória (frontend)

- **Vite 5** + **React 18** + **TypeScript**
- **React Router v6** (`BrowserRouter`, rotas aninhadas sob `/app`)
- **TanStack Query v5** (QueryClient com `staleTime` ~5min, `refetchOnWindowFocus: false`, `retry: 1`)
- **Supabase JS v2** (`createClient` com `Database` tipado; auth com `localStorage`, `persistSession`, `autoRefreshToken`)
- **Tailwind CSS 3** + **shadcn/ui** (Radix) + **lucide-react**
- **react-hook-form** + **zod** + **@hookform/resolvers**
- **next-themes** (`ThemeProvider`, `attribute="class"`, `storageKey` tipo `sa-theme`)
- **sonner** + toaster shadcn
- **Lazy loading** de páginas com `React.lazy` + `Suspense` (fallback “Carregando…”)
- Alias **`@` → `./src`**
- **Vite:** `server.host: "::"`, `server.port: 8080`, `build.target: "es2020"`. **Não** uses `manualChunks` custom no Rollup (causava erro de ordem de chunks React).

Variáveis de ambiente (Vite):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID` (usado em URLs Meta e alguns webhooks)

Cliente Supabase gerado em `src/integrations/supabase/client.ts` (padrão Lovable/Supabase).

## Stack obrigatória (backend)

- **Supabase:** PostgreSQL + Auth + Row Level Security + **Edge Functions (Deno)** em `supabase/functions/<nome>/index.ts`
- Ficheiro `supabase/config.toml`: define `project_id` (placeholder no clone) e **por função** `verify_jwt = false` onde o original desactiva JWT (webhooks públicos):
  - `webhook-zapi`, `webhook-zapi-receptivo`, `whatsapp-webhook`, `whatsapp-meta-webhook`, `aniversariantes-disparo`, `tickets-google-oauth-callback`

**Migrações:** reproduzir **na ordem** todos os ficheiros em `supabase/migrations/*.sql`. Não omitas tabelas, enums, policies, triggers nem índices.

### Tabelas principais (resumo — o SQL é a fonte de verdade)

Multi-tenant / settings: `settings_companies`, `settings_users`, `settings_profiles`, `settings_permissions`, `settings_profile_permissions`, `settings_user_companies`, `settings_audit_logs`, `settings_global`.

Auth/perfil legado: `profiles`, `user_roles`, `organizacoes`, `coordenadores`, `role_modulos`, `user_modulos_override`.

Eleitoral / CRM: `eleitores`, `eleitor_tags`, `tags`, `liderancas`, `cabos_eleitorais`, `crm_etapas`, `crm_oportunidades`, `crm_tarefas`, `crm_interacoes`, `segmentos`, etc.

Comunicação: `mensagens`, `mensagem_envios`, `mensagens_externas`, `posts_sociais`, `integracoes_config`, `comunicacao` (se existir nas migrações).

WhatsApp atendimento (legado + novo): `departamentos`, `departamento_membros`, `whatsapp_conversas`, `whatsapp_mensagens`, `whatsapp_webhook_raw`, `whatsapp_templates`, `whatsapp_config`, `whatsapp_roteamento_regras`, SLA/tags/notas/horários/feriados, etc.

WhatsApp “módulo 2” SaaS: `whatsapp_sessions`, `whatsapp_contacts`, `whatsapp_queues`, `whatsapp_conversations`, `whatsapp_messages` (atenção: podem coexistir com `whatsapp_conversas` / `whatsapp_mensagens` — respeita o schema).

Meta oficial: `whatsapp_meta_sessions`, `whatsapp_meta_templates`, `whatsapp_meta_campaigns`, `whatsapp_meta_campaign_contacts`, `whatsapp_meta_leads`.

Chatbot: `chatbot_fluxos`, `chatbot_nos`, `chatbot_sessoes`.

Disparos: `disparos`, `disparo_destinatarios`, `disparo_optout`, `disparo_config`.

Tickets: `ticket_categories`, `ticket_queues`, `tickets`, `ticket_messages`, `ticket_events`, `ticket_calendar_integrations`.

Outros: `automacoes`, `automacao_execucoes`, `eventos`, `pesquisas`, `agenda_compromissos`, `gamificacao_*`, `concorrentes`, `aprovacoes`, `audit_logs`, `notifications`, `webhooks_saida`, `webhook_entregas`, `aniversariantes_*`, etc.

**Tipos TypeScript:** o ficheiro `src/integrations/supabase/types.ts` deve reflectir o schema PostgREST (podes regenerar com Supabase CLI ou manter estrutura equivalente).

## Edge Functions a implementar (nomes e papel)

Cada uma em pasta própria com `index.ts` (Deno):

1. `zapi-status` — estado ligação Z-API  
2. `whatsapp-webhook` — webhook genérico WhatsApp  
3. `whatsapp-meta-webhook` — webhook Meta  
4. `whatsapp-manutencao` — tarefas de manutenção  
5. `webhook-zapi` — entrada Z-API  
6. `webhook-zapi-receptivo` — receptivo (sem JWT no config)  
7. `webhook-dispatcher` — despacho de webhooks  
8. `tickets-google-sync`, `tickets-google-oauth-start`, `tickets-google-oauth-callback` — Google Calendar / OAuth  
9. `send-whatsapp` — envio (ex.: Twilio legado)  
10. `send-whatsapp-zapi` — envio via Z-API (Bearer user + apikey)  
11. `notificacoes-disparo`  
12. `meta-sync-templates`, `meta-send-message`, `meta-oauth-callback`  
13. `enviar-em-massa`, `disparo-processar`  
14. `backup-export`  
15. `automacao-executar`  
16. `aniversariantes-disparo`  
17. `analise-preditiva`, `analise-concorrencia`

Comportamento interno: segue a lógica do código de referência (validação, chamadas HTTP a Z-API/Meta, inserts nas tabelas `whatsapp_*`, filas, etc.).

## Frontend — estrutura de pastas (obrigatório)

- `src/modules/auth/` — login, cadastro, reset, `ProtectedRoute`, `PublicRoute`, `useAuth`
- `src/modules/settings/` — empresas, utilizadores, perfis, permissões, auditoria, `CompanyContext`, `CompanySwitcher`
- `src/modules/whatsapp/` — Z-API: dashboard, sessões, conversas, chat, contactos, campanhas, bot, filas, templates, integrações, logs, settings; providers `ZApiProvider`, `MetaProvider`, interface `IWhatsAppProvider`; serviços `whatsappService`, `waService`
- `src/modules/whatsapp-meta/` — API oficial Meta: layout, dashboard, connect, OAuth callback, sessions, templates, campaigns, leads, `whatsappMetaService`
- `src/modules/atendimento/` — inbox, departamentos, templates, logs de webhook, roteamento, configurações, relatórios; serviço que chama `send-whatsapp-zapi` e grava `whatsapp_mensagens`
- `src/modules/tickets/` — módulo chamados completo
- `src/modules/political/` — hub político (eleitores, CRM, mapa, etc.) sob `/app/political/*`
- `src/modules/dashboard/`, `executivo`, `eleitores`, `captacao`, `comunicacao`, `eventos`, `pesquisa`, `mapa`, `relatorios`, `agenda`, `aniversariantes`, `predicao`, `automacao`, `concorrencia`, `gamificacao`, `crm`, `segmentacao`, `campanhas`, `aprovacoes`, `auditoria`, `integracoes`, `disparos`, `chatbot`, `configuracoes`, `backup`, `webhooks`, `notificacoes`, `cadastros`, `departamentos-gabinete`, `perfil`
- `src/shared/layout/` — `AppLayout` (`SidebarProvider`, `SidebarTrigger`), `AppSidebar` (menu hierárquico, colapsar modo ícone, `localStorage sa:sidebar:open`, cookie `sidebar:state` — ver **`PROMPT_MODULOS_WA_TICKETS_SETTINGS.md` secção D**)
- `src/shared/pages/hubs/` — `SettingsHub`, `WhatsAppHub`, `TicketsHub`, `PoliticalHub`, `HubLayout`
- `src/components/ui/` — componentes shadcn
- `src/pages/NotFound.tsx`

## Rotas (espelhar `App.tsx`)

- Públicas: `/login`, `/cadastro`, `/reset-password`, `/cadastro-publico`, `/p/:slug` (pesquisa pública)
- Área autenticada: `/app` com `AppLayout` e filhos:
  - `dashboard` (sub-rotas `principal`, `executivo`, `politico`)
  - `hub/configuracoes`, `hub/whatsapp`, `hub/tickets`, `hub/politico`
  - Rotas “clássicas” com redirects para `political/*` onde aplicável (`eleitores` → `political/voters`, etc.)
  - `settings/*` (dashboard, users, companies, profiles, permissions, user-company, audit, general)
  - `whatsapp/*` (nested `WhatsAppLayout`: dashboard, sessions, conversations, chat, contacts, campaigns, bot, queues, templates, integrations, logs, settings)
  - `wa/*` → `WaLegacyRedirect`
  - `tickets/*`
  - `political/*`
  - `wa-meta/*` incl. `wa-meta/oauth-callback`
  - atendimento, chatbot, disparos, campanhas, integracoes, backup, webhooks, notificacoes, etc. (como no original)
- `*` → `NotFound`

## Padrões de negócio a preservar

- **Multi-tenant:** `company_id` em tabelas de negócio; contexto de empresa no UI (`CompanyProvider`); RLS no Supabase alinhado às migrações.
- **Permissões:** matriz perfil × permissão (`settings_*`); guards por rota/componente onde o original usa `perm:` (ex.: WhatsApp layout).
- **WhatsApp Z-API:** envios via `fetch` / `supabase.functions.invoke` para `send-whatsapp-zapi` com `Authorization: Bearer <access_token>` e header `apikey: VITE_SUPABASE_PUBLISHABLE_KEY`. Metadata `provider: "Z-API"` em inserts.
- **WhatsApp Meta:** chamadas à Graph API no client em `MetaWhatsAppProvider` com `phone_number_id` + `access_token`; project id em `VITE_SUPABASE_PROJECT_ID`.
- **Webhooks:** módulo `webhooks` + tabelas `webhooks_saida`, `webhook_entregas`; dispatcher em edge function.
- **Testes:** Vitest + Testing Library; existe `src/test/module-boundaries.test.ts` — mantém disciplina de fronteiras de módulos.

## UI/UX

- Português (PT) na interface e mensagens de erro amigáveis.
- Tema claro/escuro coerente com `next-themes`.
- Gráficos: Recharts onde o original usa (`AreaTrendChart`, `DonutChart`, etc.).
- Mapas: Leaflet / react-leaflet onde aplicável (`mapa`, mapa eleitoral).

## O que NÃO fazer

- Não simplificar o schema (não “fundir” tabelas de WhatsApp legado e novo sem motivo).
- Não remover Edge Functions “por ser trabalhoso”.
- Não hardcodar chaves reais; usa `.env.example` com placeholders.
- Não copiar código propriedade de terceiros se o teu output for público — **reimplementa** com o mesmo contrato (endpoints, payloads, tabelas).

## Ordem de implementação sugerida (para a IA)

1. Supabase: aplicar migrações + RLS + gerar tipos.  
2. Edge Functions com stubs que compilam; depois preencher Z-API/Meta.  
3. Auth + `CompanyProvider` + settings.  
4. Shell `AppLayout` + sidebar + rotas espelhadas.  
5. Módulos por prioridade: WhatsApp/atendimento → disparos → political → tickets → restantes.  
6. Testes smoke + `npm run build` sem erros.

## Entregáveis

- Repositório com `README` mínimo (como correr `npm install`, `npm run dev`, variáveis `.env`, deploy Supabase).
- `package.json` com scripts: `dev`, `build`, `lint`, `test`, `preview`, e opcional `supabase:*` se usares CLI.

---FIM---

## Nota para ti (humano)

- Gera sempre o **manifesto** com `scripts/export-replica-context.ps1` e anexa-o ao prompt para a outra IA ter contagens e listas exactas de pastas/ficheiros.
- Para **WhatsApp end-to-end**, anexa também **`scripts/PROMPT_WHATSAPP_COMPLETO.md`** (módulo + satélites + funções + tabelas).
- Para **Configurações / RBAC / multi-tenant**, anexa **`scripts/PROMPT_CONFIGURACOES_COMPLETO.md`**.
- Se possível, anexa também o **zip do repositório** (sem `node_modules`) para a IA comparar linha a linha.
