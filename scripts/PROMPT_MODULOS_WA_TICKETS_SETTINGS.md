# Prompt completo — WhatsApp, Tickets/Chamados e Configurações gerais

Copie **tudo** entre `---INÍCIO---` e `---FIM---` para outra IA (complementar com `PROMPT_REPLICA_ZERO.md`, `PROMPT_ESTETICA_UI.md` e migrações SQL).

---INÍCIO---

## Contexto global

Sistema **SaaS multi-tenant** com `company_id` em tabelas de negócio. Funções SQL auxiliares: `is_super_admin(uuid)`, `user_belongs_to_company(uuid, uuid)`, `user_has_permission(uuid, uuid, text)`. **RLS** obrigatório em todas as tabelas descritas.

---

## A) Configurações gerais (Settings / RBAC)

**Especificação completa** (layout `SettingsLayout`, todas as páginas, `CompanySwitcher`, `settingsService`, RLS, seed, `SettingsHub`, `GlobalSettings`/`ALL_MODULES`, matriz de permissões): ver **`scripts/PROMPT_CONFIGURACOES_COMPLETO.md`**.

### Modelo de dados

| Tabela | Função |
|--------|--------|
| `settings_companies` | Tenant: razão social, nome fantasia, CNPJ, status, plano |
| `settings_users` | Utilizador de negócio (PK = `auth.users.id`): nome, email, status, `is_super_admin` |
| `settings_profiles` | Perfil RBAC **por empresa** (`company_id`, nome, `is_system_default`) |
| `settings_permissions` | Dicionário global de permissões (`id` TEXT PK, `module`, `description`) |
| `settings_profile_permissions` | N:N perfil ↔ permissão |
| `settings_user_companies` | N:N utilizador ↔ empresa + `profile_id`, `is_default`, `status` |
| `settings_audit_logs` | Auditoria: `action`, `entity_type`, `entity_id`, `details` JSONB, IP |
| `settings_global` | Por empresa: `system_name`, `timezone`, `active_modules` JSONB, `feature_flags` JSONB |

### Seeds de permissões (IDs exactos)

Inserir na tabela `settings_permissions` pelo menos:

- `settings.dashboard.view`, `settings.users.view`, `settings.users.manage`
- `settings.companies.view`, `settings.companies.manage`
- `settings.profiles.view`, `settings.profiles.manage`
- `settings.audit.view`, `settings.global.view`, `settings.global.manage`
- `eleitores.view`, `eleitores.manage`
- `whatsapp.dashboard.view`, `whatsapp.chat.read`, `whatsapp.chat.send`, `whatsapp.chat.close`
- `disparos.view`, `disparos.manage`
- `eventos.view`, `eventos.manage`
- `crm.view`, `crm.manage`
- `relatorios.view`
- `automacoes.view`, `automacoes.manage`
- `departamentos.view`, `departamentos.manage`

(Seed opcional: empresa default, perfil **Admin** com todas as permissões, perfil **Atendente** com subset WhatsApp + eleitores/eventos/crm view, `settings_global` com `active_modules` JSON array.)

### Frontend — `CompanyProvider` (`src/modules/settings/contexts/CompanyContext.tsx`)

- Ao autenticar: carregar `settings_users.is_super_admin`, listar empresas via `settings_user_companies` + join `settings_companies`.
- **Empresa activa:** `localStorage` chave `sa_active_company_id`; fallback `is_default` ou primeira ligação.
- `changeCompany(companyId)`: actualizar estado, persistir storage, **recarregar permissões** do `profile_id` da ligação, e **`queryClient.clear()`** para não vazar cache entre tenants.
- API do contexto: `loading`, `companies`, `currentCompany`, `isSuperAdmin`, `permissions[]`, `hasPermission(perm)`, `changeCompany`, `reload`.

### Frontend — área `/app/settings/*` (`SettingsLayout.tsx`)

Navegação em tabs (nav com `rounded-xl border bg-card p-2`; activo: `bg-primary text-primary-foreground shadow-elegant-sm`):

| Rota | Label | Permissão | Notas |
|------|-------|-------------|--------|
| `/app/settings/dashboard` | Dashboard | `settings.dashboard.view` | |
| `/app/settings/users` | Usuários | `settings.users.view` | |
| `/app/settings/user-company` | Vínculos | `settings.users.view` | user ↔ empresa ↔ perfil |
| `/app/settings/companies` | Empresas | `settings.companies.view` | **`superOnly`** — só `isSuperAdmin` |
| `/app/settings/profiles` | Perfis | `settings.profiles.view` | |
| `/app/settings/permissions` | Permissões | `settings.profiles.view` | matriz perfil × permissão |
| `/app/settings/audit` | Auditoria | `settings.audit.view` | |
| `/app/settings/general` | Geral | `settings.global.view` | `settings_global` |

- Filtro de itens: `superOnly` → visível só se `isSuperAdmin`; caso contrário `hasPermission(perm)`.
- Serviço: `settingsService` (Supabase) para CRUD de empresas, utilizadores, perfis, permissões, vínculos, auditoria, global.

### UI global dependente de settings

- **`CompanySwitcher`** no header do `AppLayout` (troca tenant).
- Módulos podem mostrar “Empresa actual: `nome_fantasia`” como no `WhatsAppLayout` / `TicketsLayout`.

---

## B) WhatsApp (ecossistema completo)

**Documentação exaustiva** (satélites campanhas/disparos/chatbot/comunicação, todas as rotas, tabelas legado + Meta + 2.0, matriz de Edge Functions, hooks Realtime, dois `WhatsAppHub`, conflito de rotas `whatsapp` no `App.tsx`): ver **`scripts/PROMPT_WHATSAPP_COMPLETO.md`**.

O produto tem **várias superfícies** que convivem; não fundir numa só sem requisito explícito.

### B1) Módulo “WhatsApp 2.0” SaaS — rotas `/app/whatsapp/*`

**Layout:** `WhatsAppLayout.tsx` — título “WhatsApp”, subtítulo multi-tenant com empresa; **tabs** horizontais dentro de `Card` (`NavLink`; activo `bg-primary text-primary-foreground`).

**Tabs e permissões (`perm`):**

| Path relativo | Label | `perm` |
|---------------|-------|--------|
| `dashboard` | Dashboard | `whatsapp.dashboard.view` |
| `sessions` | WhatsApp (Z-API) | `whatsapp.dashboard.view` |
| `sessions?tab=meta` | API Oficial (Meta) | `whatsapp.dashboard.view` |
| `conversations` | Conversas | `whatsapp.chat.read` |
| `chat` | Chat | `whatsapp.chat.read` |
| `contacts` | Contatos | `whatsapp.dashboard.view` |
| `campaigns` | Campanhas | `whatsapp.dashboard.view` |
| `bot` | Chatbot | `whatsapp.dashboard.view` |
| `queues` | Filas | `whatsapp.dashboard.view` |
| `templates` | Templates | `whatsapp.dashboard.view` |
| `integrations` | Integrações | `whatsapp.dashboard.view` |
| `logs` | Logs | `whatsapp.dashboard.view` |
| `settings` | Configurações | `whatsapp.dashboard.view` |

- Filtrar tabs: `!perm || isSuperAdmin || hasPermission(perm)`.

**Tabelas novas (módulo 2)** — migração tipo `20260504010821_*.sql`:

- `whatsapp_sessions`: `company_id`, `name`, `provider` IN (`zapi`,`meta`,`webjs`), `status` IN (`connected`,`disconnected`,`connecting`,`qr_pending`), `phone_number`, `credentials` JSONB, `is_default`
- `whatsapp_contacts`: `company_id`, `phone` UNIQUE por empresa, `name`, `profile_pic_url`, `tags[]`, `notes`
- `whatsapp_queues`: `company_id`, `name`, `color`, `greeting_message`
- `whatsapp_conversations`: `session_id`, `contact_id`, `status` IN (`open`,`closed`,`pending`,`bot`), `agent_id`, `queue_id`, `last_message`, `unread_count`
- `whatsapp_messages`: `conversation_id`, `message_id_external`, `direction` inbound|outbound, `type` (text, image, …), `content`, `media_url`, `status` (pending, sent, …), `sender_id`

**RLS:** policies `is_super_admin` OR `user_belongs_to_company` em todas. **Realtime:** publicação `supabase_realtime` para `whatsapp_conversations` e `whatsapp_messages` com `REPLICA IDENTITY FULL`.

**Providers no client:** `IWhatsAppProvider`, `ZApiProvider` (parse de webhook Z-API), `MetaWhatsAppProvider` (Graph API `messages` com template/text). Pasta `src/modules/whatsapp/providers/`.

### B2) Atendimento WhatsApp “clássico” — rotas `/app/atendimento/*`

Fluxo operacional (inbox, departamentos, templates, logs de webhook, roteamento, configurações, relatórios). Tabelas legado típicas (nomes a respeitar nas migrações): `departamentos`, `departamento_membros`, `whatsapp_conversas`, `whatsapp_mensagens`, `whatsapp_webhook_raw`, `whatsapp_templates`, `whatsapp_config`, `whatsapp_roteamento_regras`, SLA/tags/notas/horários/feriados, etc.

**Envio de mensagem:** `fetch` para Edge Function `send-whatsapp-zapi` com `Authorization: Bearer <session.access_token>` e header `apikey: VITE_SUPABASE_PUBLISHABLE_KEY`, body `{ to, message, nome }`; após sucesso, `insert` em `whatsapp_mensagens` com `metadata: { provider: "Z-API" }`.

### B3) Hub WhatsApp — `/app/hub/whatsapp` (`WhatsAppHub.tsx`)

- Tabs persistidas em `localStorage` `sa:wa-hub:tab`: `zapi` | `meta`.
- **Z-API:** submódulos com links para atendimento, whatsapp-hub clássico, `/app/whatsapp/dashboard` (2.0), comunicação, campanhas, disparos, chatbot, templates, relatórios, config avançadas.
- **Meta:** links para `wa-meta` dashboard, connect, sessions, templates, campaigns, leads.
- Usar **`HubLayout`** (hero ícone gradiente, métricas `card-glass`, grelha de `NavLink` cards).

### B4) WhatsApp Meta (API oficial) — `/app/wa-meta/*`

- Layout próprio, OAuth callback dedicado, páginas: dashboard, connect, sessions, templates, campaigns, leads.
- `VITE_SUPABASE_PROJECT_ID` para URLs `*.supabase.co` onde aplicável.
- Edge Functions: `meta-oauth-callback`, `meta-send-message`, `meta-sync-templates`, `whatsapp-meta-webhook`.

### B5) Edge Functions WhatsApp / Z-API (Deno)

Implementar com contratos compatíveis:

- `send-whatsapp-zapi` — POST autenticado (JWT user + apikey); envia texto; integra Z-API.
- `send-whatsapp` — canal alternativo (ex. Twilio) se existir no código de referência.
- `zapi-status` — estado da conexão.
- `webhook-zapi`, `webhook-zapi-receptivo` — **sem JWT** (`verify_jwt = false` no `config.toml`); persistência de eventos / fila.
- `whatsapp-webhook`, `whatsapp-manutencao` — genéricos / manutenção.
- `whatsapp-meta-webhook` — entrada Meta, sem JWT.
- Funções de negócio relacionadas: `enviar-em-massa`, `disparo-processar`, `notificacoes-disparo`, `aniversariantes-disparo`, `automacao-executar`, `webhook-dispatcher` (quando dispara a partir de WhatsApp).

### B6) Integração fronte → funções

- Padrão: `${VITE_SUPABASE_URL}/functions/v1/<nome>` ou `supabase.functions.invoke`.
- Headers: `Content-Type`, `Authorization: Bearer <access_token>`, `apikey: VITE_SUPABASE_PUBLISHABLE_KEY`.

---

## C) Tickets / Chamados

### Modelo de dados (`20260504013243_*.sql`)

| Tabela | Campos-chave |
|--------|----------------|
| `ticket_categories` | `company_id`, `name`, `description`, `color` |
| `ticket_queues` | `company_id`, `name`, `description` |
| `tickets` | `company_id`, `ticket_number` (serial por instância — atenção ao tipo na app), `title`, `description`, `status` open\|in_progress\|waiting\|resolved\|closed, `priority` low\|medium\|high\|critical, FK categoria/fila, `requester_*`, `assigned_to` → `settings_users`, `sla_due_at`, timestamps |
| `ticket_messages` | `ticket_id`, `sender_id`, `sender_type` agent\|customer\|system, `content`, `is_internal_note` |
| `ticket_events` | agenda: `title`, `start_datetime`, `end_datetime`, `agent_id`, `status` scheduled\|done\|cancelled, `external_id` (Google) |
| `ticket_calendar_integrations` | `user_id` UNIQUE, tokens Google, `sync_enabled` |

**RLS:** loop de policies `SELECT/INSERT/UPDATE/DELETE` com `user_belongs_to_company(auth.uid(), company_id)` em todas as tabelas acima.

### Frontend — rotas `/app/tickets/*` (`TicketsLayout.tsx`)

Tabs (mesmo padrão visual que WhatsApp 2.0):

- `dashboard` — Dashboard  
- `list` — Chamados  
- `calendar` — Agenda  
- `queues` — Filas  
- `categories` — Categorias  
- `sla` — SLA  
- `settings` — Configurações  

Subtítulo: multi-tenant + nome da empresa.

### Serviço `ticketsService` (`src/modules/tickets/services/ticketsService.ts`)

- `list(companyId, filters)` — filtros opcionais: status, priority, queue_id, category_id, assigned_to, with_event  
- `get`, `create`, `update`, `remove` em `tickets`  
- `listMessages`, `addMessage` em `ticket_messages`  
- `listCategories`, `createCategory`, `deleteCategory`  
- `listQueues`, `createQueue`, `deleteQueue`  
- `listEvents`, CRUD de eventos conforme referência  
- Integração Google: métodos que chamam Edge Functions `tickets-google-oauth-start`, `tickets-google-oauth-callback`, `tickets-google-sync`

### Tipos (`src/modules/tickets/types.ts`)

- `TicketStatus`, `TicketPriority`, interfaces `Ticket`, `TicketMessage`, `TicketEvent`, `TicketCategory`, `TicketQueue`  
- Constantes de domínio `TICKET_EVENTS` (CREATED, UPDATED, ASSIGNED, …)

### Páginas esperadas

- `TicketsDashboard`, `TicketsList`, `TicketDetail`, `TicketsCalendar`, `TicketsQueues`, `TicketsCategories`, `TicketsSLA`, `TicketsSettings`  
- Componentes: badges de prioridade/status, SLA indicator, formulários de ticket/evento.

### Hub `/app/hub/tickets` (`TicketsHub.tsx`)

- Métricas e links rápidos para list, calendar, queues, categories, sla, dashboard, settings (textos em PT).

### Edge Functions Tickets

- `tickets-google-oauth-start`, `tickets-google-oauth-callback` (callback **sem JWT** no config), `tickets-google-sync`

---

## D) Menu lateral (`AppSidebar`) — estrutura, submenus e colapsar

### Onde entra no layout

- `App.tsx`: dentro de `/app`, o layout é `AppLayout` que envolve tudo com **`SidebarProvider`** (shadcn `Sidebar`) + `<AppSidebar />` + área principal.
- **Esconder / mostrar o menu:** no header (`AppLayout`), o botão **`SidebarTrigger`** (ícone hambúrguer) chama o contexto do provider e **alterna** entre expandido e colapsado (desktop) ou abre **sheet** (mobile). Não remover este gatilho.

### Provider shadcn (`src/components/ui/sidebar.tsx`) — comportamento a preservar

- **Cookie:** nome `sidebar:state`, `max-age` 7 dias, `path=/` — grava se a barra está aberta ao alternar (persistência entre visitas).
- **Larguras:** expandido `16rem`, modo ícone `3rem`, mobile sheet `18rem`.
- **Atalho de teclado:** **Ctrl+B** (ou Meta+B) para `toggleSidebar` (só quando não está a escrever num input).
- **Mobile:** `useIsMobile()` + `Sheet` lateral; `openMobile` / `setOpenMobile` separados do estado desktop.
- Componente **`<Sidebar collapsible="icon">`**: no modo colapsado a barra fica só com **ícones** (largura `SIDEBAR_WIDTH_ICON`); labels e submenus inline desaparecem em favore de **tooltips** nos botões (`tooltip={title}`).

### Modelo de dados do menu (`AppSidebar.tsx`)

Três tipos lógicos:

1. **`Item` simples** — só `title`, `url`, `icon`: um único `NavLink` (ex.: **Dashboard** → `/app/dashboard`).
2. **`Item` com `subs`** — lista plana de subitens: cada um `title`, `url`, `icon` (ex.: **Configurações**, **Tickets**, **Político**).
3. **`Item` com `subFolders`** — pastas aninhadas: cada pasta tem `title`, `key` (único para estado aberto/fechado), `icon`, `subs[]` (ex.: **WhatsApp** com pastas **WhatsApp** Z-API e **WhatsApp Oficial**).

Campos opcionais:

- **`badgeKey: "wa"`** no item WhatsApp: quando há mensagens pendentes (`usePendentesCount`) e a barra **não** está colapsada, mostra **Badge** âmbar com o número ao lado do título do grupo.

### Persistência do “grupo aberto” (submenus)

- **`localStorage`** chave **`sa:sidebar:open`** — objecto JSON `{ [chave: string]: boolean }`.
- Chaves usadas:
  - **`item.title`** para grupos de primeiro nível (Configurações, Tickets, Político) — abre/fecha o `Collapsible` principal.
  - **`folder.key`** para subpastas dentro de WhatsApp (`wa-zapi`, `wa-meta`).
- Em cada `toggle(key)` inverte `open[key]`.
- **`useEffect` ao mudar `pathname`:** se a rota actual pertence a um grupo ou subpasta, **abre automaticamente** esse ramo (`groupActive` / `isActive`) para o utilizador ver onde está.

### Lógica visual: expandido vs colapsado (`useSidebar().state === "collapsed"`)

| Estado | Comportamento |
|--------|----------------|
| **Expandido** | Itens com `subs` ou `subFolders` rendem `Collapsible`: trigger mostra ícone + título + chevron (Down/Right); conteúdo mostra `SidebarMenuSub` com links indentados (`pl-7`, sub-sub `pl-11`). |
| **Colapsado** | Qualquer item **com** filhos deixa de mostrar árvore: torna-se **um único `NavLink` para o `url` do hub** (ex.: WhatsApp → `/app/hub/whatsapp`) com `tooltip={item.title}`. O utilizador navega para o hub e de lá escolhe o submódulo. |
| **Item sem filhos** | Sempre link directo + tooltip. |

### Classes CSS reutilizadas no menu (alinhamento com `PROMPT_ESTETICA_UI.md`)

- Botão de linha principal (`itemClasses`): altura `h-11`, `gap-3`, `rounded-lg`, `px-4`, `text-[14px]`, `font-medium`, `text-sidebar-foreground`, hover `muted` → `foreground`, activo `data-[active=true]:bg-primary data-[active=true]:text-primary-foreground`.
- Subitens: `h-9`, `pl-7`, ícone `h-3.5`, texto `13px`; activo `bg-accent text-primary font-medium`.
- Sub-sub (dentro de pasta WhatsApp): `h-8`, `pl-11`, texto `12.5px`.

### Estrutura exacta do array `main` (replicar URLs e labels)

1. **Dashboard** — `/app/dashboard` — sem submenus.

2. **Configurações** — hub `/app/hub/configuracoes` — **subs:**  
   Empresas `/app/settings/companies` · Usuários `/app/settings/users` · Perfis & RBAC `/app/settings/profiles` · Integrações `/app/integracoes` · Webhooks `/app/webhooks` · Backup `/app/backup` · Notificações `/app/notificacoes` · Auditoria `/app/auditoria` · Geral `/app/configuracoes`.

3. **WhatsApp** — hub `/app/hub/whatsapp` — **`badgeKey: "wa"`** — **subFolders** (dois níveis):
   - Pasta **WhatsApp** (`key: wa-zapi`, ícone Smartphone): Atendimento `/app/atendimento`, Comunicação `/app/comunicacao`, Campanhas `/app/campanhas`, Disparos `/app/disparos`, Chatbot `/app/chatbot`, Templates `/app/atendimento/templates`, Relatórios `/app/atendimento/relatorios`.
   - Pasta **WhatsApp Oficial** (`key: wa-meta`, ícone Plug): Conexão `/app/wa-meta/connect`, Sessões `/app/wa-meta/sessions`, Dashboard `/app/wa-meta/dashboard`, Configurações `/app/atendimento/configuracoes-avancadas`.

4. **Tickets** — hub `/app/hub/tickets` — **subs:**  
   Dashboard `/app/tickets/dashboard` · Chamados `/app/tickets/list` · Agenda `/app/tickets/calendar` · Filas `/app/tickets/queues` · Categorias `/app/tickets/categories` · SLA `/app/tickets/sla` · Configurações `/app/tickets/settings`.

5. **Político** — hub `/app/hub/politico` — **subs:**  
   Eleitores, Novo Eleitor, CRM, Eventos, Agenda, Mapa, Pesquisas, Aniversariantes, Gamificação, Predição, Concorrência, Segmentação, Departamentos (rotas `/app/political/...` conforme lista no código), Aprovações `/app/aprovacoes`, Relatórios `/app/relatorios`.

### Secção **Conta** (rodapé da sidebar)

- Grupo separado por `border-t`, label **“Conta”**:
  - Meu Perfil → `/app/perfil`
  - Formulário Público → `/cadastro-publico` com `target="_blank"` (`external: true` no modelo de dados `account[]`).

### Cabeçalho da sidebar (branding)

- Card no `SidebarHeader`: ícone **Vote** em quadrado `bg-primary`, títulos **“SA CONNECT”** / **“Gabinete Inteligente”** (ocultos se `collapsed`).
- Faixa opcional “Ambiente principal” com chevron (só expandido).

### Rodapé

- Botão **Sair** com `authService.signOut`, toast “Sessão encerrada.”, `navigate("/login")`.

### Activação de rotas

- `isActive(path)`: `pathname === path || pathname.startsWith(path + "/")`.
- `groupActive(item)`: activo se o hub, qualquer `sub.url` ou qualquer URL dentro de `subFolders` coincidir.

### Critérios de aceitação — menu lateral

- [ ] `SidebarTrigger` no header alterna barra; estado persiste em cookie `sidebar:state`.  
- [ ] Modo ícone: submenus não são lista expandida; cada grupo com filhos vira link para o **hub** respectivo.  
- [ ] Submenus e subpastas persistem abertos em `sa:sidebar:open`; rota activa **reabre** o ramo correcto.  
- [ ] Badge de pendentes no WhatsApp quando `usePendentesCount > 0` e barra expandida.  
- [ ] Tooltips nos ícones quando colapsado.  
- [ ] Secções “Navegação” e “Conta” com labels uppercase pequenos como no original.

---

## E) Critérios de aceitação (funcional)

**Settings**

- [ ] Troca de empresa actualiza permissões e limpa cache de queries.  
- [ ] Super admin vê “Empresas”; utilizador normal não (conforme `superOnly`).  
- [ ] Matriz de permissões por perfil persiste em `settings_profile_permissions`.

**WhatsApp**

- [ ] Rotas `/app/whatsapp/*` com tabs filtradas por RBAC.  
- [ ] Envio Z-API via função com JWT + apikey; mensagens gravadas.  
- [ ] Módulo Meta separado com OAuth e webhooks.  
- [ ] Realtime opcional nas conversas/mensagens novas onde o original subscreve.

**Tickets**

- [ ] CRUD tickets escopado a `company_id`.  
- [ ] Mensagens internas vs públicas (`is_internal_note`).  
- [ ] Agenda e integração Google conforme funções deployadas.

---

## F) Ficheiros de referência no repo original

- **Menu lateral e colapsar:** `src/shared/layout/AppLayout.tsx` (`SidebarProvider`, `SidebarTrigger`), `src/shared/layout/AppSidebar.tsx`, `src/components/ui/sidebar.tsx`  
- Settings: `src/modules/settings/**/*`, `CompanyContext.tsx`, `settingsService.ts`  
- WhatsApp 2.0: `src/modules/whatsapp/**/*`  
- Atendimento: `src/modules/atendimento/**/*` (incl. `hooks/usePendentesCount` para badge)  
- Meta: `src/modules/whatsapp-meta/**/*`  
- Hubs: `src/shared/pages/hubs/WhatsAppHub.tsx`, `TicketsHub.tsx`  
- Tickets: `src/modules/tickets/**/*`  
- SQL: migrações contendo `whatsapp_sessions`, `ticket_`, `settings_`  
- Edge: pastas em `supabase/functions/` citadas nas secções B e C  
- `supabase/config.toml` — `verify_jwt` por função

---FIM---

## Como usar

1. Junta este prompt ao **schema SQL completo** (migrações) e, se possível, ao **código** das pastas listadas na secção F.  
2. Pede à IA: *“Implementa primeiro Settings + RLS, depois Tickets, depois WhatsApp (tabelas novas + atendimento + Meta + funções).”*  
3. Para UI, acopla também `PROMPT_ESTETICA_UI.md` para tabs, cards e hubs ficarem idênticos.
