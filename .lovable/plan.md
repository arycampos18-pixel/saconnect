## Objetivo
Permitir que usuários ADM (ou perfis liberados) criem novos itens diretamente nos dropdowns dos formulários, sem sair da tela. Aplicado a todos os campos cuja origem já é uma **tabela** no banco (Tipo/Status de Evento continuam fixos por enquanto, conforme decidido).

## Escopo de campos cobertos nesta entrega

| Campo | Tabela | Onde é usado |
|---|---|---|
| Liderança | `liderancas` | Eventos (Responsável), Eleitores, Cabos, Segmentação |
| Cabo eleitoral | `cabos_eleitorais` | Eleitores, Segmentação |
| Departamento | `departamentos` | Departamentos do gabinete, Tickets |
| Categoria de Atendimento | `ticket_categories` | Tickets |
| Tag | `tags` | Eleitores, Segmentação |

Tipo de evento, Status de evento e Gênero permanecem como enums fixos por enquanto (não migrar nesta etapa).

## Banco de dados

Nova tabela `user_permissions` (1:1 com usuário), com flags:
- `can_create_liderancas`, `can_create_cabos`, `can_create_departamentos`, `can_create_categorias`, `can_create_tags`
- `can_create_all` (atalho)
- ADM (`has_role(uid,'admin')`) sempre pode, mesmo sem flag.

Função `public.can_user_create(_user uuid, _campo text) returns boolean` (security definer) usada em RLS para liberar `INSERT` nas tabelas de catálogo apenas para quem tem permissão. Cada tabela ganha policy `INSERT` baseada nessa função.

## Componentes (frontend)

1. `src/shared/components/forms/DropdownComNovoCadastro.tsx`
   - Props: `campo`, `label`, `opcoes`, `value`, `onChange`, `placeholder`, `onCreated?`
   - Usa `usePermissoes()` para decidir se mostra "+ Novo".
   - Mostra item especial "+ Novo {label}" no fim da lista que abre o modal.
2. `src/shared/components/forms/ModalNovoCadastro.tsx`
   - Modal genérico (nome obrigatório, descrição opcional dependendo do campo).
   - Validação client-side: nome ≥ 2 chars, sem duplicatas (case-insensitive).
   - Insere via `catalogosCriacaoService` (Supabase client). Sucesso → toast → callback com novo registro.
3. `src/shared/hooks/usePermissoes.ts`
   - Lê `user_permissions` + verifica role admin → expõe `can(campo)`.
4. `src/shared/services/catalogosCriacaoService.ts`
   - `criar(campo, payload)` mapeia campo→tabela e faz insert; retorna `{id, nome}`.

## Integrações iniciais
- `EventoFormDialog`: substituir o `Select` de Responsável pelo novo componente (`campo="liderancas"`).
- `SegmentoFormDialog`, telas de Eleitores e Tickets que usam esses catálogos: trocar Selects de Liderança/Cabo/Departamento/Categoria/Tag pelo novo componente.

## Configuração de permissões
- Página simples em **Configurações → Permissões de cadastro** (admin-only) para marcar as flags por usuário. (Reutiliza padrão de `settings_*` já existente — apenas CRUD básico.)

## Segurança
- RLS bloqueia `INSERT` para quem não tem permissão (defesa no servidor).
- Trigger `created_by = auth.uid()` nas tabelas de catálogo.
- Validação anti-duplicata no client + `unique` parcial (case-insensitive) onde fizer sentido.

## Fora desta entrega (explicitamente)
- Migrar Tipo/Status/Gênero de enum → tabela.
- Rate limiting de 10/h (pode ser adicionado depois via trigger).
- Edge functions dedicadas por campo (usaremos o client + RLS).

## Ordem de execução
1. Migration: `user_permissions` + função `can_user_create` + policies de INSERT nos 5 catálogos + colunas `created_by`.
2. Hook `usePermissoes` + service de criação.
3. Componentes `DropdownComNovoCadastro` + `ModalNovoCadastro`.
4. Trocar o Select de Responsável no `EventoFormDialog` (campo onde você está agora).
5. Aplicar nos demais formulários listados.
6. Tela de gestão de permissões em Configurações.
