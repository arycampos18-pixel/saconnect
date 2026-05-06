# Prompt — identidade visual e UX (clone fiel “SA Connect”)

Use este texto **sozinho** ou **depois** do prompt funcional. Objetivo: outra IA **não** gerar um “dashboard genérico”; deve replicar **beleza, hierarquia, sombras, tipografia e ritmo** do original.

Copie tudo entre `---INÍCIO---` e `---FIM---`.

---INÍCIO---

## Identidade de marca

- Nome na UI: **“S A CONNECT”** (letras espaçadas no breadcrumb: `tracking-[0.08em]`).
- Tom: **SaaS premium**, político/gabinete, **não** fintech azul-neon genérico.
- **Cor dominante:** roxo / magenta (HSL ~ **291° 64% 42%** no modo claro). Secundários: lavanda muito clara (`290 100% 95%`), texto escuro com matiz roxa (`285 70% 20%`).
- **Evitar:** primário azul `#3b82f6`, fundo cinza “template Shadcn default” sem personalização, cards brancos chapados sem sombra, ícones coloridos aleatórios em cada linha da tabela.

## Stack visual obrigatória

- **Tailwind 3** + **shadcn/ui** (`style: default`, `baseColor: slate`, **`cssVariables: true`** em `components.json`).
- **next-themes** com `attribute="class"`, `defaultTheme="light"`, `enableSystem: false`, `storageKey="sa-theme"` (tema claro primeiro; dark refinado).
- **lucide-react** para ícones (tamanhos consistentes: `h-4 w-4` em linhas, `h-5 w-5` em cards, `h-7 w-7` em hero de hub).
- **Toasts:** `sonner` + toaster shadcn.
- **Gráficos:** Recharts com cores alinhadas a `hsl(var(--primary))` / `muted-foreground`, não paleta rainbow.

## Fontes (obrigatório — sem isto fica “estranho”)

No `index.html`, carregar Google Fonts:

- **Inter:** pesos 400, 500, 600, 700, 800 — corpo e UI.
- **Poppins:** pesos 500, 600, 700, 800 — **títulos e números grandes (KPIs)**.

No CSS global (`index.css` em `@layer base`):

- `body`: `font-family: "Inter", "Segoe UI", system-ui…`, `font-feature-settings: "cv02", "cv03", "cv04", "cv11"`, `line-height: 1.6`.
- `h1–h4`: família **Poppins** primeiro; tamanhos e tracking **exactamente** como no original:
  - `h1`: `text-[24px] md:text-[28px] font-bold tracking-[-0.02em] leading-[1.2]`
  - `h2`: `text-[17px] md:text-[18px] font-semibold tracking-[-0.01em]`
  - `h3`: `text-[15px] font-semibold tracking-[-0.005em]`
- Números em KPIs/cards: `font-[Poppins,Inter,sans-serif]` com `text-[28px]`–`text-[32px]`, `font-bold`, `tracking-[-0.02em]`, `leading-none`.

## Tokens CSS (`:root` e `.dark`)

Reproduzir **literalmente** (valores HSL sem função `hsl()` no token — só números) as variáveis do ficheiro de referência:

- Modo claro: `--primary: 291 64% 42%`, `--primary-foreground: 0 0% 100%`, `--primary-glow: 292 84% 61%`, `--foreground: 285 70% 20%`, `--secondary` lavanda, `--muted`, `--border` com matiz roxa (`290 30% 92%`), `--radius: 0.75rem`.
- Gradientes CSS: `--gradient-primary`, `--gradient-accent`, `--gradient-hero` (135deg, roxo → magenta).
- Sombras **elegantes** com toque roxo: `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-glow` (não sombras neutras puras).
- Sidebar: variáveis `--sidebar-*` espelhando o mesmo sistema de cor.
- Modo escuro: fundo `270 25% 7%`, cartões `270 22% 11%`, primary mais claro `292 84% 65%`, bordas `270 18% 20%`, gradientes e sombras ajustados (ver referência).

## `tailwind.config.ts`

- `darkMode: ["class"]`.
- `container`: `center: true`, `padding: "2rem"`, breakpoint `2xl: 1400px`.
- `extend.colors`: mapear **todas** as chaves semânticas (`border`, `background`, `primary`, `primary.glow`, `sidebar.*`, `success`, `warning`, etc.) para `hsl(var(--…))` como no original.
- `backgroundImage`: `gradient-primary`, `gradient-accent`, `gradient-hero` → `var(--gradient-*)`.
- `boxShadow`: mapear `sm`, `DEFAULT`, `md`, `lg`, `xl`, `elegant-*`, `elegant-glow` para `var(--shadow-*)`.
- `borderRadius`: `lg/md/sm` derivados de `var(--radius)`.
- Plugin: **`tailwindcss-animate`**.

## Classes utilitárias de componente (copiar comportamento)

Em `@layer components` do `index.css`, implementar **as mesmas** classes:

- **`.page-header`**, **`.page-title`**, **`.page-subtitle`**, **`.page-section`** — cabeçalhos de página uniformes.
- **`.btn-primary-premium`** — botão com `var(--gradient-primary)`, sombra roxa, hover `translateY(-2px) scale(1.02)` + glow, active com bounce curto (`cubic-bezier(0.34, 1.56, 0.64, 1)`).
- **`.card-interactive`** — card com borda suave, sombra em camadas roxas, hover `translateY(-3px)` e borda `primary/35`.
- **`.card-glass`** — `rounded-2xl`, gradiente sutil card→secondary, `backdrop-blur(12px)`, borda `primary/12`, hover elevação.
- **`.table-modern`** — cabeçalho `bg-accent/60`, linhas com hover `bg-accent/40`, zebra `even:bg-muted/30`.

Em `@layer utilities`:

- Animações: **`animate-shimmer-in`**, **`animate-fade-in-up`**, **`animate-fade-in-page`**, stagger **`stagger-1` … `stagger-4`**.
- **`.focus-ring-primary`** para inputs (sombra `primary/12`, sem outline feio).

Scrollbars webkit: track `secondary`, thumb `border` com raio pill, hover `primary/50`.

## Shell da aplicação (layout)

### `AppLayout`

- Fundo: `bg-background`, altura mínima full.
- **Header** `sticky top-0 z-30`: `border-b border-border/70`, `bg-background/95`, `backdrop-blur`, padding `px-4 py-3 md:px-8`.
- Breadcrumb desktop: texto pequeno `text-xs`, label da app em `text-muted-foreground` + `ChevronRight` + título actual em `text-foreground`.
- **SidebarTrigger:** `h-9 w-9 rounded-lg border border-border bg-card hover:bg-secondary`.
- Botão “Novo Eleitor” (quando existir): `hidden sm:inline-flex`, `h-10 rounded-lg`, `bg-primary`, `shadow-elegant-glow`, hover `bg-[hsl(var(--primary-hover))]`.
- **Avatar** utilizador: `h-9 w-9`, `border`, `bg-card`, `shadow-elegant-sm`, fallback `bg-primary text-primary-foreground`.
- **Main:** `flex-1 overflow-x-hidden px-4 py-6 md:px-8 md:py-7` — **não** colar conteúdo às bordas em mobile.

### Sidebar (`AppSidebar` + `@/components/ui/sidebar`)

- **`SidebarProvider`** em volta do layout autenticado; **`SidebarTrigger`** no header para **mostrar/ocultar** (desktop: expande/colapsa modo ícone; mobile: sheet).
- Cookie **`sidebar:state`** (7 dias) persiste aberto/fechado; atalho **Ctrl+B** alterna a barra.
- **`<Sidebar collapsible="icon">`:** colapsado = largura ~`3rem`, só ícones com **tooltip** no `SidebarMenuButton`; grupos com filhos viram **link directo para o URL do hub** (não mostrar árvore inline quando colapsado).
- **`localStorage` `sa:sidebar:open`:** JSON com chaves `item.title` e `folder.key` (`wa-zapi`, `wa-meta`) para `Collapsible` aberto/fechado; ao mudar `pathname`, **abrir automaticamente** o ramo que contém a rota activa.
- Hierarquia: item simples · item com `subs` (lista indentada `pl-7`) · item com `subFolders` (pastas com segundo nível `pl-11`). Ver **`PROMPT_MODULOS_WA_TICKETS_SETTINGS.md` secção D** para a árvore exacta de URLs.
- Ícones Lucide alinhados; **badge** âmbar no grupo WhatsApp quando há pendentes (`badgeKey: "wa"`) e barra expandida.
- Estados hover/active com `sidebar-accent` e texto `sidebar-accent-foreground`; classes `itemClasses` do `AppSidebar` (ver ficheiro).

### Hubs (`HubLayout`)

- Página com `space-y-6 animate-fade-in-page`.
- **Hero do hub:** ícone dentro de quadrado `h-14 w-14 rounded-2xl`, `bg-gradient-to-br from-primary to-primary-glow`, texto branco, sombra `0_8px_24px_-4px hsl(var(--primary)/0.45)`.
- Título `text-2xl font-bold`; subtítulo `text-sm text-muted-foreground`.
- **Métricas:** grelha `grid-cols-2 md:grid-cols-4`, cada célula usa classe **`card-glass`** + `animate-fade-in-up` + `stagger-N`.
- **Submódulos:** grelha `sm:grid-cols-2 lg:grid-cols-3`, cada `NavLink` com `rounded-xl border border-border/70`, `bg-gradient-to-br from-card to-secondary/40`, `shadow-sm`, hover `hover:-translate-y-1 hover:border-primary/40 hover:shadow-md`.
- Ícone do card: `h-11 w-11 rounded-xl`, `bg-gradient-to-br from-primary/15 to-primary/5`, `text-primary`, `group-hover:scale-110`.
- Seta `ArrowRight`: `group-hover:translate-x-1 group-hover:text-primary`.
- Título do card: `font-[Poppins,Inter,sans-serif] font-semibold`.

### `MetricCard` (dashboards)

- Wrapper: **`card-glass`** + `animate-fade-in-up` + `p-6`.
- Label: `text-[13px] font-medium uppercase tracking-[0.06em] text-muted-foreground`.
- Valor grande: Poppins, `text-[32px] font-bold tracking-[-0.02em]`.
- Ícone à direita: quadrado `h-12 w-12 rounded-xl` com variante gradiente (`primary` | `accent` | `success`) e sombra colorida; `group-hover:scale-110`.

## Componentes shadcn

- **Button, Card, Badge, Input, Table, Dialog, Tabs, Dropdown** — usar variantes padrão mas **sempre** combinar com tokens (`border-border`, `bg-card`, `text-muted-foreground`).
- **Espaçamento interno de cards:** `p-4`–`p-6` conforme densidade; evitar `p-2` em formulários largos.

## Micro-interacções e acessibilidade

- Transição global em `button, a, input…`: **150ms** `ease-in-out` para cor/borda/sombra/transform.
- **`:focus-visible`:** outline 2px `ring`, offset 2px, `border-radius: 4px`.
- **Antialiasing:** `-webkit-font-smoothing: antialiased` no `html`.

## O que NÃO fazer (lista anti–“clone feio”)

1. Primário **azul** padrão Tailwind ou verde “success” como cor de marca.
2. Esquecer **Poppins** nos títulos e KPIs.
3. Remover **gradientes e sombras roxas** — o produto **depende** delas para parecer premium.
4. Header branco sem blur nem `border-border/70`.
5. Grelhas de cards sem hover de elevação/borda.
6. Tabelas sem zebra nem hover de linha.
7. `main` sem padding horizontal responsivo.
8. Tema escuro como simples “inverter preto/branco” sem redefinir **todos** os tokens `:root` / `.dark`.

## Checklist de aceitação visual

- [ ] Modo claro: fundo branco, texto com matiz roxa escura, botões primários roxo–magenta com glow.
- [ ] Modo escuro: fundo azul-violeta muito escuro, cartões elevados, primary mais luminoso.
- [ ] Hubs: ícone gradiente 56px, cards de submódulos com lift no hover.
- [ ] KPIs: `card-glass` + tipografia Poppins nos números.
- [ ] Layout global: sidebar shadcn + header sticky com blur.
- [ ] Scrollbars discretas e coerentes com a paleta.
- [ ] Nenhuma página “solta” sem `.page-header` / títulos alinhados ao sistema quando for listagem ou formulário longo.

## Referência de implementação

Ao implementar, **copiar a estrutura de classes** dos ficheiros de referência: `src/index.css`, `tailwind.config.ts`, `src/shared/layout/AppLayout.tsx`, `src/shared/layout/AppSidebar.tsx`, `src/shared/pages/hubs/HubLayout.tsx`, `src/shared/components/MetricCard.tsx`, `index.html` (fonts + `translate="no"` no root se aplicável).

---FIM---

## Como usar

1. Cola o bloco **INÍCIO–FIM** noutra IA **junto** com ficheiros `index.css`, `tailwind.config.ts`, `components.json` e os componentes de layout listados (ou o repo completo).
2. Pede explicitamente: *“Implementa primeiro o design system e o shell; só depois as páginas. Compara visualmente com os ficheiros anexos.”*
