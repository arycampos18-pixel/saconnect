# Arquitetura modular — `src/modules/`

O S A CONNECT segue **feature-based architecture** (também chamada de "screaming architecture"): cada funcionalidade do produto vive em uma pasta única com tudo que ela precisa.

## Estrutura padrão de um módulo

```
src/modules/<feature>/
├── index.ts        ← API pública (barrel) — o que outros módulos podem consumir
├── pages/          ← rotas (montadas em src/App.tsx)
├── components/     ← UI interna (NÃO importável de fora)
├── services/       ← chamadas Supabase / lógica de dados
├── hooks/          ← lógica reutilizável dentro do módulo
└── data/           ← catálogos estáticos
```

## Regras de isolamento

1. **Outros módulos só importam via barrel**: `import { x } from "@/modules/eleitores"`.
2. **Nunca importar `components/` ou `pages/` de outro módulo** — bloqueado pelo ESLint (`no-restricted-imports`).
3. **Comunicação entre módulos** acontece exclusivamente via:
   - Services (ex: `eleitoresService` consumido por `dashboard`, `mapa`, `eventos`).
   - Hooks compartilhados (ex: `useAuth`, `useUserRole`, `useModulosPermitidos` em `@/modules/auth`).
   - Catálogos (ex: `modulosCatalogo` em `@/modules/cadastros`).
4. **Código verdadeiramente compartilhado** (layout, ErrorBoundary, utils de CPF/CEP) vive em `src/shared/`.
5. **Tipos do banco** são auto-gerados em `src/integrations/supabase/types.ts` — **nunca editar manualmente**.

## Adicionar um novo módulo

1. Criar `src/modules/<nome>/{pages,components,services}/`.
2. Registrar a rota em `src/App.tsx`.
3. Adicionar item no `modulosCatalogo.ts` (cadastros) com o `moduloId` correspondente.
4. Adicionar entrada na `AppSidebar` referenciando esse `moduloId`.
5. Se outros módulos precisarem consumir algo, criar `index.ts` exportando só o necessário.

## Módulos com API pública declarada (têm `index.ts`)

| Módulo | Expõe | Consumidores |
|---|---|---|
| `auth` | `useAuth`, `useUserRole`, `useModulosPermitidos`, `authService` | quase todos |
| `eleitores` | `eleitoresService`, `catalogosService` | dashboard, captacao, comunicacao, eventos, mapa |
| `cadastros` | `permissoesService`, `cadastrosService`, `modulosCatalogo` | auth |
| `auditoria` | `auditoriaService` | cadastros |
| `segmentacao` | `segmentacaoService` | campanhas |
| `executivo` | `executivoService` | segmentacao |
| `integracoes` | `integracoesService`, `EnviarMensagemDialog` | whatsapp |

Demais módulos são *folhas* (consumidos apenas via rota) e não precisam de barrel.
