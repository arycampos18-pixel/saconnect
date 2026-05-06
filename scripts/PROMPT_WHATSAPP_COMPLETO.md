# Prompt — Módulo WhatsApp **completo** (todas as superfícies, rotas, dados e funções)

Copie entre `---INÍCIO---` e `---FIM---` para outra IA. Use **junto** com as migrações SQL do repositório, `PROMPT_ESTETICA_UI.md` e `PROMPT_MODULOS_WA_TICKETS_SETTINGS.md` (menu lateral + settings).

---INÍCIO---

## 1) Visão do ecossistema (não é um único ecrã)

O WhatsApp no produto reparte-se por **cinco camadas** que devem coexistir:

| Camada | Rotas principais | Papel |
|--------|------------------|--------|
| **A. WhatsApp 2.0 (SaaS)** | `/app/whatsapp/*` | Sessões multi-provedor (`zapi` / `meta` / `webjs`), conversas/mensagens novas tabelas, filas, contactos, UI de tabs com RBAC. |
| **B. Atendimento clássico** | `/app/atendimento/*` | Inbox, departamentos, templates, roteamento, configs, relatórios, logs de webhook; tabelas `whatsapp_conversas` / `whatsapp_mensagens` + `departamentos`. |
| **C. API oficial Meta** | `/app/wa-meta/*` | OAuth, sessões, templates, campanhas, leads; tabelas `whatsapp_meta_*`. |
| **D. Hub de entrada** | `/app/hub/whatsapp`, `/app/whatsapp-hub` | Visão por tabs Z-API vs Meta; cards para submódulos. |
| **E. Satélites Z-API** | `/app/campanhas`, `/app/disparos`, `/app/chatbot`, `/app/comunicacao`, `/app/integracoes`, `/app/webhooks`, `/app/backup`, `/app/aniversariantes` | Campanhas em massa, disparos, fluxos de bot, caixa de comunicação, testes Z-API, webhooks de saída, export backup, disparo aniversários. |

**Redirect canónico:** rota `/app/wa/*` → `WaLegacyRedirect` redirecciona para `/app/whatsapp/<mesmo-path>` (URL canónica do módulo 2.0).

---

## 2) Rotas `App.tsx` (lista para não omitir nada)

**WhatsApp 2.0 (nested `WhatsAppLayout`):**

- `/app/whatsapp` → index redirect `dashboard`
- `dashboard`, `sessions` (query `?tab=meta` para separador Meta na mesma página se implementado), `conversations`, `chat`, `contacts`, `campaigns`, `bot`, `queues`, `templates`, `integrations`, `logs`, `settings`

**Legado / hub (atenção a dois ficheiros homónimos):**

- `/app/hub/whatsapp` — **`src/shared/pages/hubs/WhatsAppHub.tsx`** (HubLayout + tabs Z-API/Meta).
- `/app/whatsapp-hub` — **`src/modules/whatsapp/pages/WhatsAppHub.tsx`** (visão “clássica” do módulo).
- `/app/whatsapp` — no `App.tsx` existem **duas** declarações `path="whatsapp"`: uma com componente legacy **`WhatsApp`** e outra nested com **`WhatsAppLayout`** (2.0). Na replicação, **resolver explicitamente** (ex.: uma só rota ou redirect do legacy → `/app/whatsapp/dashboard`) para não haver ambiguidade.
- `/app/wa/*` — `WaLegacyRedirect` → `/app/whatsapp/<resto>` (URL canónica do 2.0).

**Atendimento:**

- `/app/atendimento`, `atendimento/dashboard`, `relatorios`, `departamentos`, `templates`, `logs`, `roteamento`, `configuracoes`, `configuracoes-avancadas`

**Meta:**

- `/app/wa-meta` (layout nested), `connect`, `sessions`, `templates`, `campaigns`, `leads`, `dashboard`
- `/app/wa-meta/oauth-callback` — callback OAuth (rota isolada)

**Satélites:**

- `/app/campanhas`, `/app/disparos`, `/app/disparos/:id`, `optout`, `config`
- `/app/chatbot`, `chatbot/sessoes`, `chatbot/:id` (editor)
- `/app/comunicacao`
- `/app/integracoes`, `/app/webhooks`, `/app/backup`
- `/app/aniversariantes` (usa função de disparo WhatsApp)

---

## 3) Módulo A — `src/modules/whatsapp/` (WhatsApp 2.0)

### Ficheiros

- **Layout / páginas:** `WhatsAppLayout.tsx`, `WADashboard.tsx`, `WASessions.tsx`, `WAConversations.tsx`, `WAChat.tsx`, `WAContacts.tsx`, `WACampaigns.tsx`, `WAChatbot.tsx`, `WAQueues.tsx`, `WATemplates.tsx`, `WAIntegrations.tsx`, `WALogs.tsx`, `WASettings.tsx`, `WhatsApp.tsx`, `WhatsAppHub.tsx`, `WaLegacyRedirect.tsx`
- **Serviços:** `whatsappService.ts` (Z-API status/disconnect/restart + métricas `mensagens_externas`), `waService.ts` (CRUD leitura `whatsapp_sessions`, `contacts`, `queues`, `conversations`, `messages` filtrados por `company_id`)
- **Providers:** `WhatsAppProviderInterface.ts`, `ZApiProvider.ts`, `MetaProvider.ts`, `MetaWhatsAppProvider.ts`, `index.ts`
- **Outros:** `hooks/useTenantGate.ts`, `components/ConexaoCard.tsx`, `types.ts`

### Tabs do `WhatsAppLayout` e permissões

(Ver tabela no prompt de módulos: `whatsapp.dashboard.view` vs `whatsapp.chat.read` para conversas/chat.)

### `whatsappService` (Z-API via Edge)

- `GET .../functions/v1/zapi-status?action=status|disconnect|restart` com `Authorization: Bearer` + `apikey`
- Métricas agregadas a partir de `mensagens_externas` onde `canal = 'WhatsApp'`

### `waService` (PostgREST)

- Sempre `.eq('company_id', companyId)` — RLS reforça no servidor.

### `WASessions` (detalhe de produto)

- Expõe `WEBHOOK_URL` = `${VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook` para utilizador configurar no painel Z-API (copiar URL).

---

## 4) Módulo B — `src/modules/atendimento/` (clássico)

### Páginas

- `Atendimento.tsx` (inbox / kanban conforme UI), `AtendimentoDashboard.tsx`, `Departamentos.tsx`, `Templates.tsx`, `WebhookLogs.tsx`, `Roteamento.tsx`, `Configuracoes.tsx`, `ConfiguracoesAvancadas.tsx`, `Relatorios.tsx`, `Historico.tsx`, `Kanban.tsx`

### Serviços

- `atendimentoService.ts` — conversas, mensagens, envio via **`send-whatsapp-zapi`** (POST com JWT + apikey)
- `departamentoService.ts`, `templateService.ts`, `roteamentoService.ts`, `configService.ts`, `configAvancadaService.ts`, `eleitorContextoService.ts`
- `webhookRawService.ts` — lista `whatsapp_webhook_raw`; **reprocessar** chama `https://${VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/webhook-zapi-receptivo` (POST payload)

### Hooks

- `usePendentesCount.ts` — badge na sidebar (WhatsApp)
- `useNovasMensagensRealtime.ts` — subscrição Realtime (registado no `AppLayout`)

### Componentes

- `ConversaPainel.tsx`, `PainelLateralConversa.tsx`, `NovaConversaDialog.tsx`

### Tabelas SQL (legado — migrações `whatsapp_*` + `departamentos`)

Incluir (nomes exactos nas migrações): `departamentos`, `departamento_membros`, `whatsapp_conversas`, `whatsapp_mensagens`, `whatsapp_conversa_notas`, `whatsapp_webhook_raw`, `whatsapp_templates`, `whatsapp_config`, `whatsapp_roteamento_regras`, `whatsapp_slas`, `whatsapp_tags`, `whatsapp_notas_internas`, `whatsapp_horarios`, `whatsapp_feriados`, etc.

---

## 5) Módulo C — `src/modules/whatsapp-meta/` (Meta Cloud API)

### Páginas

- `MetaLayout.tsx`, `MetaDashboard.tsx`, `MetaConnect.tsx`, `MetaOAuthCallback.tsx`, `MetaSessions.tsx`, `MetaTemplates.tsx`, `MetaCampaigns.tsx`, `MetaLeads.tsx`

### Serviço `whatsappMetaService.ts`

- Graph API (templates, mensagens, OAuth); URL de webhook: `https://${VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/whatsapp-meta-webhook`

### Tabelas

- `whatsapp_meta_sessions`, `whatsapp_meta_templates`, `whatsapp_meta_campaigns`, `whatsapp_meta_campaign_contacts`, `whatsapp_meta_leads` (+ RLS por `company_id`).

---

## 6) Módulo D — Hubs (dois ecrãs diferentes)

| Rota | Ficheiro | Conteúdo |
|------|-----------|----------|
| `/app/hub/whatsapp` | `src/shared/pages/hubs/WhatsAppHub.tsx` | `HubLayout`: tabs em `localStorage` **`sa:wa-hub:tab`** (`zapi` \| `meta`); cards **ZAPI_SUBS** (atendimento, whatsapp-hub, dashboard 2.0, comunicação, campanhas, disparos, chatbot, templates, relatórios, config avançada) vs **META_SUBS** (dashboard Meta, connect, sessions, templates, campaigns, leads). |
| `/app/whatsapp-hub` | `src/modules/whatsapp/pages/WhatsAppHub.tsx` | Hub “interno” do módulo WhatsApp (UI distinta do hub global). |

---

## 7) Módulos satélite (integração WhatsApp / Z-API)

| Módulo | Pasta | Função Edge relevante |
|--------|--------|------------------------|
| **Campanhas** | `src/modules/campanhas/` | `enviar-em-massa` |
| **Disparos** | `src/modules/disparos/` | `disparo-processar`; páginas lista, detalhe, optout, config + `disparo_config` / `disparos` / `disparo_destinatarios` |
| **Chatbot** | `src/modules/chatbot/` | fluxos `chatbot_fluxos`, `chatbot_nos`, `chatbot_sessoes` — editor e sessões |
| **Comunicação** | `src/modules/comunicacao/` | `mensagens`, `mensagens_externas`, canais |
| **Integrações** | `src/modules/integracoes/` | `zapi-status`, `send-whatsapp` / Z-API testes |
| **Webhooks** | `src/modules/webhooks/` | `webhook-dispatcher` (POST com apikey) |
| **Backup** | `src/modules/backup/` | `backup-export` |
| **Aniversariantes** | `src/modules/aniversariantes/` | `aniversariantes-disparo` |
| **Automação** | `src/modules/automacao/` | `automacao-executar` (pode disparar WhatsApp) |
| **Departamentos gabinete** | `src/modules/departamentos-gabinete/` | `send-whatsapp-zapi` em loop |

Tabelas de apoio: `mensagem_envios`, `integracoes_config`, `webhooks_saida`, `webhook_entregas`, `notifications`, etc. (ver migrações).

---

## 8) Edge Functions — matriz WhatsApp

| Função | Uso típico |
|--------|------------|
| `zapi-status` | status / disconnect / restart sessão Z-API (GET + JWT) |
| `send-whatsapp-zapi` | envio texto (POST + JWT + apikey) — atendimento, campanhas, gabinete |
| `send-whatsapp` | canal alternativo (ex. Twilio) |
| `webhook-zapi` | entrada webhook Z-API |
| `webhook-zapi-receptivo` | processamento receptivo (público; URL fixa com project id em alguns fluxos) |
| `whatsapp-webhook` | URL mostrada em WASessions |
| `whatsapp-manutencao` | tarefas de manutenção |
| `whatsapp-meta-webhook` | entrada Meta (público) |
| `meta-oauth-callback`, `meta-send-message`, `meta-sync-templates` | Meta |
| `enviar-em-massa` | campanhas |
| `disparo-processar` | fila de disparos |
| `notificacoes-disparo` | notificações |
| `aniversariantes-disparo` | aniversários |
| `automacao-executar` | regras |
| `webhook-dispatcher` | encaminhar eventos |

`supabase/config.toml`: `verify_jwt = false` para webhooks públicos (`webhook-zapi`, `webhook-zapi-receptivo`, `whatsapp-webhook`, `whatsapp-meta-webhook`, `aniversariantes-disparo`, `tickets-google-oauth-callback`).

---

## 9) Tabelas — checklist (novo + legado + Meta)

**Novo módulo 2.0:** `whatsapp_sessions`, `whatsapp_contacts`, `whatsapp_queues`, `whatsapp_conversations`, `whatsapp_messages` (+ Realtime).

**Meta:** `whatsapp_meta_*` (5 tabelas).

**Legado atendimento:** `whatsapp_conversas`, `whatsapp_mensagens`, `whatsapp_webhook_raw`, `whatsapp_templates`, `whatsapp_config`, `whatsapp_roteamento_regras`, SLA/tags/notas/horários/feriados, `departamentos`, `departamento_membros`.

**Mensagens / canais:** `mensagens`, `mensagens_externas`.

**Disparos:** `disparos`, `disparo_destinatarios`, `disparo_optout`, `disparo_config`.

**Chatbot:** `chatbot_fluxos`, `chatbot_nos`, `chatbot_sessoes`.

---

## 10) Permissões RBAC (mínimo WhatsApp)

- `whatsapp.dashboard.view`, `whatsapp.chat.read`, `whatsapp.chat.send`, `whatsapp.chat.close`
- `disparos.view`, `disparos.manage` (satélite disparos)

SuperAdmin ignora verificações no client; RLS continua no Supabase.

---

## 11) Padrão técnico de chamadas Edge (repetir em todos os módulos)

```http
Authorization: Bearer <access_token do Supabase Auth>
apikey: <VITE_SUPABASE_PUBLISHABLE_KEY>
Content-Type: application/json
```

URL base: `${VITE_SUPABASE_URL}/functions/v1/<nome>`.

---

## 12) Ficheiros obrigatórios para anexar à IA

```
src/modules/whatsapp/**/* 
src/modules/atendimento/**/* 
src/modules/whatsapp-meta/**/* 
src/modules/campanhas/**/* 
src/modules/disparos/**/* 
src/modules/chatbot/**/* 
src/modules/comunicacao/**/* 
src/modules/integracoes/**/* 
src/modules/webhooks/**/* 
src/modules/backup/**/* 
src/modules/aniversariantes/**/* 
src/modules/automacao/**/* 
src/modules/departamentos-gabinete/**/* 
src/shared/pages/hubs/WhatsAppHub.tsx 
supabase/functions/send-whatsapp-zapi/** 
supabase/functions/zapi-status/** 
supabase/functions/webhook-zapi/** 
supabase/functions/webhook-zapi-receptivo/** 
supabase/functions/whatsapp-webhook/** 
supabase/functions/whatsapp-meta-webhook/** 
supabase/functions/meta-*/** 
supabase/functions/enviar-em-massa/** 
supabase/functions/disparo-processar/** 
supabase/functions/aniversariantes-disparo/** 
supabase/migrations/*whatsapp* 
supabase/migrations/*chatbot* 
supabase/migrations/*disparo* 
supabase/migrations/*mensagem*
```

---

## 13) Critérios de aceitação — módulo WhatsApp “completo”

- [ ] Todas as rotas da secção 2 existem e renderizam sem 404.  
- [ ] `/app/wa/foo` redirecciona para `/app/whatsapp/foo`.  
- [ ] `WhatsAppLayout` tabs respeitam `hasPermission`.  
- [ ] `waService` + RLS: dados isolados por `company_id`.  
- [ ] Atendimento envia mensagem via `send-whatsapp-zapi` e persiste em `whatsapp_mensagens`.  
- [ ] Meta: OAuth + páginas + webhooks + tabelas `whatsapp_meta_*`.  
- [ ] Hub: tabs Z-API/Meta persistem; links correctos.  
- [ ] Campanhas chama `enviar-em-massa`; disparos chama `disparo-processar`.  
- [ ] Chatbot CRUD fluxos e nós; sessões listadas.  
- [ ] `useNovasMensagensRealtime` activo no layout autenticado.  
- [ ] Badge sidebar quando `usePendentesCount > 0`.  
- [ ] `whatsapp-webhook` URL visível/configurável onde o UX original mostra.

---FIM---

## Nota

Este ficheiro **substitui** a secção B “resumida” de `PROMPT_MODULOS_WA_TICKETS_SETTINGS.md` para o âmbito WhatsApp: use **ambos** (módulos gerais + este) ou funda num único documento na vossa documentação interna.
