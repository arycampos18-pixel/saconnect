# Prompt — Módulo **Configurações** completo (RBAC, multi-tenant, layout, dados, RLS)

Copie entre `---INÍCIO---` e `---FIM---` para outra IA. Use com migrações `*settings*` / `20260504005750_*.sql`, `PROMPT_ESTETICA_UI.md` e `CompanyProvider` no `App.tsx`.

---INÍCIO---

## 1) Papel do módulo

Área **`/app/settings/*`** para **multi-tenant SaaS**: empresas (tenants), utilizadores de negócio, vínculos utilizador↔empresa↔perfil, perfis RBAC, dicionário de permissões, matriz perfil×permissão, auditoria, configurações globais por empresa (`settings_global`). O **enforcement** crítico é **RLS no PostgreSQL** + função **`user_has_permission`**. O front usa `hasPermission()` para **UX** (ocultar menus / desactivar botões).

---

## 2) Rotas (`App.tsx`)

Aninhadas sob `/app` com **`SettingsLayout`**:

| Rota | Componente | Ficheiro |
|------|------------|----------|
| `/app/settings` | redirect | `index` → `/app/settings/dashboard` |
| `/app/settings/dashboard` | `SettingsDashboard` | `pages/SettingsDashboard.tsx` |
| `/app/settings/users` | `UsersManager` | `pages/UsersManager.tsx` |
| `/app/settings/user-company` | `UserCompanyLinksPage` | `pages/UserCompanyLinksPage.tsx` |
| `/app/settings/companies` | `CompaniesManager` | `pages/CompaniesManager.tsx` |
| `/app/settings/profiles` | `ProfilesManager` | `pages/ProfilesManager.tsx` |
| `/app/settings/permissions` | `PermissionsByProfilePage` | `pages/PermissionsByProfilePage.tsx` |
| `/app/settings/audit` | `AuditLogs` | `pages/AuditLogs.tsx` |
| `/app/settings/general` | `GlobalSettings` | `pages/GlobalSettings.tsx` |

**Hub de entrada separado (não substitui o layout):** `/app/hub/configuracoes` → `src/shared/pages/hubs/SettingsHub.tsx` (cards `HubLayout` com links para empresas, utilizadores, perfis, auditoria **global** `/app/auditoria`, integrações, webhooks, backup, notificações, **config geral** `/app/configuracoes` — ver nota abaixo).

**Nota de consistência:** o `SettingsHub` aponta “Configurações Gerais” para **`/app/configuracoes`** (módulo `configuracoes`), enquanto o item **“Geral”** do `SettingsLayout` aponta para **`/app/settings/general`** (`GlobalSettings` / `settings_global`). Na replicação, **definir** se unificam ou mantêm dois ecrãs.

---

## 3) Layout da área Configurações (`SettingsLayout.tsx`)

**Estrutura DOM:**

- Contentor raiz: `div.space-y-6`
- **Cabeçalho:**
  - `h1.flex.items-center.gap-2.text-2xl.font-bold.tracking-tight.md:text-3xl`
  - Ícone `Settings` Lucide `h-7 w-7 text-primary` + texto **“Configurações”**
  - Subtítulo: `p.mt-1.text-sm.text-muted-foreground` — *“Identidade, empresas, usuários, perfis e regras de acesso.”*
- **Navegação em tabs** (não é sidebar interna): `nav.flex.flex-wrap.gap-2.rounded-xl.border.bg-card.p-2`
  - Cada item: `NavLink` com `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition`
  - **Activo:** `bg-primary text-primary-foreground shadow-elegant-sm` (usar `pathname.startsWith(i.to)` para prefixo)
  - **Inactivo:** `text-muted-foreground hover:bg-secondary hover:text-foreground`
  - Ícones: `h-4 w-4`

**Itens da nav (ordem):**

| `to` | Label | Ícone (Lucide) | `perm` | `superOnly` |
|------|--------|----------------|--------|-------------|
| `/app/settings/dashboard` | Dashboard | LayoutGrid | `settings.dashboard.view` | — |
| `/app/settings/users` | Usuários | Users | `settings.users.view` | — |
| `/app/settings/user-company` | Vínculos | Link2 | `settings.users.view` | — |
| `/app/settings/companies` | Empresas | Building2 | `settings.companies.view` | **true** |
| `/app/settings/profiles` | Perfis | ShieldCheck | `settings.profiles.view` | — |
| `/app/settings/permissions` | Permissões | Shield | `settings.profiles.view` | — |
| `/app/settings/audit` | Auditoria | Activity | `settings.audit.view` | — |
| `/app/settings/general` | Geral | Settings | `settings.global.view` | — |

**Filtro:** `.filter((i) => (i.superOnly ? isSuperAdmin : hasPermission(i.perm)))`.

- Corpo: `<Outlet />` para a página filha.

---

## 4) Contexto global — `CompanyProvider` (`contexts/CompanyContext.tsx`)

**Storage:** `localStorage` chave **`sa_active_company_id`**.

**Fluxo `reload()`:**

1. Se sem `user` → `loading` false e sair.
2. Ler `settings_users` (`is_super_admin`) para o utilizador autenticado.
3. `settingsService.listarEmpresasDoUsuario(user.id)` → lista de empresas ligadas (`settings_user_companies` + `settings_companies`).
4. Escolher empresa: `savedId` do localStorage se existir nos links; senão `is_default`; senão primeiro link.
5. Persistir `sa_active_company_id` quando houver empresa.
6. `loadPermissions(profileId)` → `settingsService.permissoesDoPerfil(profileId)` → array de IDs.

**`changeCompany(companyId)`:** actualizar estado, localStorage, `loadPermissions` do `profile_id` do link, e **`queryClient.clear()`** (evitar dados de outro tenant em cache).

**API exposta:**

```ts
loading: boolean;
companies: SettingsCompany[];
currentCompany: SettingsCompany | null;
isSuperAdmin: boolean;
permissions: string[];
hasPermission: (perm: string) => boolean; // true se super OU perm em lista
changeCompany: (companyId: string) => Promise<void>;
reload: () => Promise<void>;
```

**Provider** deve envolver a árvore autenticada (ex.: dentro de `App` após `AuthProvider`).

---

## 5) `CompanySwitcher` (`components/CompanySwitcher.tsx`) — header global

- Não renderiza se `!currentCompany`.
- **Popover** + **Command** (shadcn): trigger `Button variant="outline"` `h-9 max-w-[220px]`, ícone `Building2`, nome fantasia truncado, `ChevronsUpDown`.
- Lista empresas: `CommandInput` “Buscar empresa…”, `CommandItem` com `Check` se seleccionada, nome fantasia + razão social; `Badge` se `status !== "active"`.
- `onSelect` → `changeCompany(c.id)`.
- Se **`isSuperAdmin`:** grupo extra com item “Gerenciar empresas” → `window.location.href = "/app/settings/companies"`.

---

## 6) Serviço — `settingsService.ts` (contratos)

**Tipos TS:** `SettingsCompany`, `SettingsUser`, `SettingsProfile`, `SettingsPermission`, `UserCompanyLink`, `AuditLog`, `SettingsGlobalRow` (`active_modules: string[]`, `feature_flags: Record<string, any>`).

| Método | Tabela / acção |
|--------|----------------|
| `listarEmpresas()` | `settings_companies` * |
| `criarEmpresa(input)` | INSERT `settings_companies` + INSERT `settings_global` default `{ company_id }` |
| `atualizarEmpresa(id, patch)` | UPDATE |
| `removerEmpresa(id)` | DELETE |
| `listarUsuariosDaEmpresa(companyId)` | `settings_user_companies` select + join `settings_users`, `settings_profiles` |
| `listarEmpresasDoUsuario(userId)` | vínculos activos + `settings_companies` |
| `vincularUsuarioEmpresa(userId, companyId, profileId)` | upsert `settings_user_companies` |
| `desvincularUsuario(userId, companyId)` | delete |
| `definirEmpresaPadraoDoUsuario(userId, companyId)` | todos `is_default` false para user; depois true no par |
| `listarTodosVinculosUsuarioEmpresa(limit)` | visão global (RLS tipicamente super admin) |
| `atualizarStatusUsuario(userId, status)` | `settings_users` |
| `atualizarUsuario(userId, patch)` | `settings_users` |
| `listarPerfis(companyId)` | `settings_profiles` where `company_id.eq.X OR company_id.is.null` |
| `criarPerfil` / `atualizarPerfil` / `removerPerfil` | CRUD perfis |
| `listarPermissoes()` | `settings_permissions` ordenado `module`, `id` |
| `permissoesDoPerfil(profileId)` | IDs de `settings_profile_permissions` |
| `definirPermissoesDoPerfil(profileId, permissionIds)` | DELETE all + INSERT batch |
| `listarLogs(companyId?, limit)` | `settings_audit_logs`; se `companyId` null (super) sem filtro empresa |
| `registrarLog` | INSERT (erro só console.warn) |
| `obterGlobal(companyId)` | `settings_global` maybeSingle |
| `salvarGlobal(companyId, patch)` | upsert `settings_global` |

\* Lista de empresas: RLS restringe a membros ou super admin.

---

## 7) Páginas — comportamento e UI

### `SettingsDashboard`

- `useQuery`: utilizadores da empresa actual, perfis, (se super) lista empresas, últimos 10 audit logs da empresa.
- Grelha de **Cards** métricas: usuários ativos, perfis, (opcional super) empresas, eventos recentes.
- Card “Atividade recente”: lista `action` + data `pt-BR`.

### `UsersManager`

- Permissão **gestão:** `settings.users.manage`.
- Lista `settings_user_companies` da empresa + joins; filtro texto nome/email.
- Tabela: Nome (badge **Super** se `is_super_admin`), Email, Perfil (`Select` se `canManage`), Status, acções Desativar/Reativar.
- Botão “Convidar”: toast a explicar fluxo via **Cadastro** (não implementa convite inline).

### `UserCompanyLinksPage`

- `settings.users.manage` para acções sensíveis; super vê tabela global extra.
- Explica vínculos `settings_user_companies` e empresa **padrão**.
- **Nesta empresa:** tornar padrão (`definirEmpresaPadraoDoUsuario`), desvincular (bloquear auto-remoção do utilizador actual na empresa actual).
- **Super + canManage:** segunda tabela com `listarTodosVinculosUsuarioEmpresa` (todos os vínculos).

### `CompaniesManager`

- **Guard:** se `!isSuperAdmin` → card mensagem “Apenas Super Admins…”.
- Lista empresas; Dialog “Nova empresa”: razão social, nome fantasia, CNPJ, plano (`basic` / `pro` / `enterprise`), criação chama `criarEmpresa` + invalidação + `reload()` do contexto.
- Acções: alterar status `active` | `inactive` | `suspended`.

### `ProfilesManager`

- `settings.profiles.manage` para criar/eliminar.
- Lista perfis da empresa; link para `/app/settings/permissions` (matriz).
- Dialog novo perfil: nome, descrição; `company_id` = empresa actual.
- **Não remover** perfis com `is_system_default`.

### `PermissionsByProfilePage`

- `settings.profiles.view` para ver; `settings.profiles.manage` para editar checkboxes.
- `Select` perfil; estado local `Set` de permission IDs; `toggle` + botão Salvar → `definirPermissoesDoPerfil`.
- **Query string:** `?profile=<uuid>` sincroniza perfil seleccionado (`useSearchParams`).
- Dicionário agrupado por `module` (`useMemo`); componente **`ProfilePermissionsMatrix`**: secções uppercase por módulo, grelha 2 colunas, cada linha checkbox + `description` + `id` em texto pequeno.

### `AuditLogs`

- Super admin: `listarLogs(null, 500)` — todas as empresas.
- Não super: `listarLogs(currentCompany.id, 500)`.
- Tabela: quando, ação (Badge), entidade, detalhes JSON truncado, IP.

### `GlobalSettings`

- Ver: `settings.global.view`; editar/salvar: **`settings.global.manage`**.
- Campos: `system_name`, `timezone` (inputs).
- **Módulos activos:** lista fixa `ALL_MODULES` no código:

```txt
dashboard, eleitores, whatsapp, atendimento, disparos, eventos, agenda, crm,
relatorios, automacoes, departamentos, campanhas, pesquisa, mapa, predicao,
concorrencia, gamificacao, settings
```

- Checkboxes em grelha responsiva; persistência em `settings_global.active_modules` (array JSON).

---

## 8) Componente `ProfilePermissionsMatrix.tsx`

- Props: `grouped: Record<string, SettingsPermission[]>`, `perms: Set<string>`, `onToggle`, `canManage`, `emptyMessage?`.
- Para cada módulo: título `text-xs font-bold uppercase tracking-wider text-muted-foreground`.
- Cada permissão: `label` com `rounded-lg border p-3`, Checkbox + título + `id`.

---

## 9) Hub `SettingsHub.tsx` (`/app/hub/configuracoes`)

- `HubLayout` título **“Configurações”**, subtítulo centro de controlo.
- **Submódulos** (cards com ícone, título, descrição, `to`):
  - Empresas → `/app/settings/companies`
  - Usuários → `/app/settings/users`
  - Perfis & RBAC → `/app/settings/profiles`
  - Auditoria → **`/app/auditoria`** (não `/app/settings/audit`)
  - Integrações → `/app/integracoes`
  - Webhooks → `/app/webhooks`
  - Backup → `/app/backup`
  - Notificações → `/app/notificacoes`
  - Configurações Gerais → **`/app/configuracoes`**

---

## 10) Modelo SQL (resumo — migração é fonte de verdade)

**Tabelas:**

- `settings_companies` — PK uuid, `razao_social`, `nome_fantasia`, `cnpj` UNIQUE, `status` check, `plan`, timestamps
- `settings_users` — PK = `auth.users.id`, `nome`, `email` UNIQUE, `status`, `is_super_admin`
- `settings_profiles` — `company_id` FK nullable (perfis globais teóricos), `nome`, `descricao`, `is_system_default`
- `settings_permissions` — PK `id` TEXT, `module`, `description`
- `settings_profile_permissions` — (`profile_id`, `permission_id`) PK composta
- `settings_user_companies` — PK (`user_id`, `company_id`), `profile_id`, `is_default`, `status`, `created_at`
- `settings_audit_logs` — `company_id` nullable, `user_id`, `action`, `entity_type`, `entity_id`, `details` JSONB, `ip_address`
- `settings_global` — PK `company_id`, `system_name` default `SA CONNECT`, `timezone` default `America/Sao_Paulo`, `active_modules` JSONB default `[]`, `feature_flags` JSONB default `{}`, `updated_at`

**Funções SQL (SECURITY DEFINER):**

- `is_super_admin(uuid)`
- `user_belongs_to_company(uuid, uuid)`
- `user_has_permission(_user_id, _company_id, _permission)` — super OU existe vínculo activo com perfil que tem a permissão

**RLS (políticas nomeadas na migração):**

- **Companies:** SELECT membros ou super; INSERT/UPDATE/DELETE **só super admin**
- **Users:** SELECT colegas mesma empresa (join em `settings_user_companies`) OU self OU super; ALL com USING/WITH CHECK super ou self
- **Profiles:** SELECT super OU `company_id` null OU belongs; ALL com `settings.profiles.manage` na empresa do perfil (ou super)
- **Permissions dictionary:** SELECT todos autenticados; ALL só super
- **Profile_permissions:** SELECT se pertence ao universo do perfil; ALL com `settings.profiles.manage` no `company_id` do perfil
- **User_companies:** SELECT super OU self OU `settings.users.manage` na empresa; ALL super OU `settings.users.manage` OU (self em certas operações)
- **Audit:** SELECT belongs ou super; INSERT qualquer autenticado
- **Global:** SELECT belongs; ALL com `settings.global.manage` ou super

---

## 11) Seed de permissões (IDs exactos)

Replicar o `INSERT` da migração, incluindo todas as chaves `settings.*`, `eleitores.*`, `whatsapp.*`, `disparos.*`, `eventos.*`, `crm.*`, `relatorios.*`, `automacoes.*`, `departamentos.*` (lista completa no ficheiro SQL `20260504005750_*.sql` linhas ~280–307).

---

## 12) Integração com resto da app

- **Sidebar** (`AppSidebar`): grupo Configurações com subs (Empresas, Utilizadores, Perfis, Integrações, Webhooks, Backup, Notificações, Auditoria **global**, Geral **`/app/configuracoes`**) — alinhar com rotas reais.
- **TanStack Query:** chaves típicas `["settings_users", companyId]`, `["settings_profiles", companyId]`, `["settings_companies_list"]`, `["settings_audit_logs", ...]`, `["settings_global", companyId]`, `["settings_permissions"]`, `["settings_company_users", companyId]`.

---

## 13) Critérios de aceitação

- [ ] `SettingsLayout` com tabs, ícones e estilos conforme secção 3.  
- [ ] Navegação filtrada por `hasPermission` e `superOnly` para Empresas.  
- [ ] `CompanyProvider` + `sa_active_company_id` + `queryClient.clear()` ao trocar empresa.  
- [ ] `CompanySwitcher` no header com busca e atalho super para empresas.  
- [ ] CRUD coerente com RLS (erros tratados com toast).  
- [ ] Matriz de permissões persiste via delete+insert em `settings_profile_permissions`.  
- [ ] `GlobalSettings` grava `active_modules` e `system_name` / `timezone`.  
- [ ] `AuditLogs` scope super vs tenant.  
- [ ] Perfis `is_system_default` não apagáveis.  
- [ ] Criar empresa cria linha `settings_global` default.

---

## 14) Ficheiros de referência (anexar à IA)

```
src/modules/settings/contexts/CompanyContext.tsx
src/modules/settings/components/CompanySwitcher.tsx
src/modules/settings/components/ProfilePermissionsMatrix.tsx
src/modules/settings/services/settingsService.ts
src/modules/settings/pages/SettingsLayout.tsx
src/modules/settings/pages/SettingsDashboard.tsx
src/modules/settings/pages/UsersManager.tsx
src/modules/settings/pages/UserCompanyLinksPage.tsx
src/modules/settings/pages/CompaniesManager.tsx
src/modules/settings/pages/ProfilesManager.tsx
src/modules/settings/pages/PermissionsByProfilePage.tsx
src/modules/settings/pages/AuditLogs.tsx
src/modules/settings/pages/GlobalSettings.tsx
src/shared/pages/hubs/SettingsHub.tsx
supabase/migrations/20260504005750_7af70121-d523-40cf-abfb-7c2d7802adc8.sql
```

---FIM---

## Nota

O módulo **`/app/configuracoes`** (`src/modules/configuracoes/`) pode ser **outro** ecrã de preferências do gabinete; este prompt cobre **`/app/settings/*`** + hub. Unificar ou documentar a diferença na vossa spec de produto.
