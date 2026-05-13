import { useEffect, useState } from "react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";
import { useCompany } from "@/modules/settings/contexts/CompanyContext";
import {
  LayoutGrid,
  Settings,
  MessageCircle,
  Inbox,
  Vote,
  UserCircle,
  LogOut,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Building2,
  UserCog,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Share2,
  Database,
  Webhook,
  Bell,
  Users,
  UserPlus,
  Kanban,
  Calendar,
  CalendarDays,
  MapPin,
  BarChart2,
  Cake,
  Trophy,
  TrendingUp,
  BarChart3,
  Filter,
  ListChecks,
  Zap,
  Tag,
  FileBarChart,
  Settings2,
  Megaphone,
  Bot,
  FileText,
  Send,
  MessageSquare,
  Smartphone,
  Plug,
   LayoutDashboard,
   Package,
   ScanSearch,
   Link2,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { authService } from "@/modules/auth/services/authService";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { usePendentesCount } from "@/modules/atendimento/hooks/usePendentesCount";
import { canAccessRoute } from "@/shared/auth/routePermissions";

type Sub = {
  title: string;
  url: string;
  icon: LucideIcon;
  external?: boolean;
  // Quando presente, este "sub" se comporta como um folder aninhado (3º nível).
  subs?: Sub[];
  key?: string;
};
type SubFolder = { title: string; key: string; icon: LucideIcon; subs: Sub[] };
type Item = {
  title: string;
  url: string;
  icon: LucideIcon;
  badgeKey?: "wa";
  subs?: Sub[];
  subFolders?: SubFolder[];
};

const main: Item[] = [
   { title: "Painel", url: "/app/dashboard", icon: LayoutGrid },
  {
    title: "Gestão de Eleitores",
    url: "/app/analise-de-eleitores",
    icon: Users,
    subs: [
      { title: "Dashboard", url: "/app/analise-de-eleitores", icon: LayoutDashboard },
      { title: "Base de Eleitores", url: "/app/analise-de-eleitores/base", icon: Users },
      { title: "Lideranças", url: "/app/analise-de-eleitores/liderancas", icon: ShieldCheck },
      { title: "Cabos Eleitorais", url: "/app/analise-de-eleitores/cabos", icon: Megaphone },
      { title: "Departamentos", url: "/app/political/departments", icon: Building2 },
    ],
  },
  {
    title: "Político",
    url: "/app/political/dashboard",
    icon: ScanSearch,
    subFolders: [
      {
        title: "Visão Geral",
        key: "ae-visao",
        icon: BarChart3,
        subs: [
          { title: "Hierarquia & Ranking", url: "/app/analise-de-eleitores/hierarquia", icon: BarChart3 },
          { title: "Metas & Gamificação", url: "/app/analise-de-eleitores/metas-gamificacao", icon: Trophy },
          { title: "Mapa Estratégico", url: "/app/analise-de-eleitores/mapa-estrategico", icon: MapPin },
        ],
      },
      {
        title: "Análise",
        key: "ae-analise",
        icon: BarChart2,
        subs: [
          { title: "Resultados TSE", url: "/app/analise-de-eleitores/resultados-tse", icon: BarChart3 },
          { title: "Comparativo Eleições", url: "/app/analise-de-eleitores/comparativo-pos-eleicao", icon: Activity },
          { title: "Campanha Estratégico", url: "/app/political/analise/campanha-estrategico", icon: TrendingUp },
          { title: "Mapa Eleitoral", url: "/app/political/map", icon: MapPin },
          {
            title: "Validação Unificada",
            url: "#",
            icon: ShieldCheck,
            key: "ae-validacao-unificada",
            subs: [
              { title: "Revisão Manual", url: "/app/analise-de-eleitores/revisao-manual", icon: ListChecks },
              { title: "Duplicidades", url: "/app/analise-de-eleitores/duplicidades", icon: AlertTriangle },
              { title: "Divergências", url: "/app/analise-de-eleitores/divergencias", icon: AlertTriangle },
            ],
          },
        ],
      },
      {
        title: "Gerenciamento Técnico",
        key: "ae-tecnico",
        icon: Settings2,
        subs: [
          { title: "Consultas & Custos API", url: "/app/analise-de-eleitores/consultas-custos", icon: Share2 },
          { title: "Integrações", url: "/app/analise-de-eleitores/integracoes", icon: Plug },
          { title: "Webhooks", url: "/app/analise-de-eleitores/webhooks", icon: Webhook },
          { title: "Configurações Gerais", url: "/app/analise-de-eleitores/configuracoes", icon: Settings2 },
        ],
      },
    ],
  },
  {
    title: "WhatsApp",
    url: "/app/whatsapp",
    icon: MessageCircle,
    subFolders: [
      {
        title: "WhatsApp",
        key: "wa-zapi",
        icon: Smartphone,
        subs: [
          // — Visão geral —
          { title: "Conexões & Dispositivo", url: "/app/whatsapp/sessions", icon: Smartphone },

          // — Operação diária —
          { title: "Atendimento", url: "/app/atendimento", icon: Inbox },

          // — Envio em massa —
          { title: "Campanhas", url: "/app/campanhas", icon: Megaphone },

          // — Automação & conteúdo —
          { title: "Automações", url: "/app/automacoes-hub", icon: Bot },

          // — Análise & ajustes —
          { title: "Configurações", url: "/app/whatsapp/settings", icon: Settings2 },
        ],
      },
      {
        title: "Disparos API OFICIAL",
        key: "wa-bulk",
        icon: Send,
        subs: [
          { title: "Dashboard", url: "/app/whatsapp-bulk/dashboard", icon: LayoutDashboard },
          { title: "Conexões / APIs", url: "/app/whatsapp-bulk/apis", icon: Smartphone },
          { title: "Templates", url: "/app/whatsapp-bulk/templates", icon: FileText },
          { title: "Campanhas", url: "/app/whatsapp-bulk/campanhas", icon: Megaphone },
          { title: "Atendimento", url: "/app/whatsapp-bulk/atendimento", icon: Inbox },
          { title: "Fila de Envios", url: "/app/whatsapp-bulk/fila", icon: ListChecks },
          { title: "Configurações", url: "/app/whatsapp-bulk/configuracoes", icon: Settings2 },
        ],
      },
    ],
  },
  {
    title: "Relatórios",
    url: "/app/relatorios",
    icon: FileBarChart,
  },
   {
     title: "Tickets",
     url: "/app/tickets/list",
     icon: Inbox,
   },
  {
    title: "Eventos",
    url: "/app/eventos",
    icon: Calendar,
    subs: [
      { title: "Visão Geral", url: "/app/eventos", icon: BarChart3 },
      { title: "Agenda / Eventos", url: "/app/political/agenda-eventos", icon: CalendarDays },
      { title: "Pesquisas", url: "/app/political/polls", icon: ListChecks },
      { title: "Links Curtos", url: "/app/links", icon: Link2 },
      { title: "Aniversariantes", url: "/app/political/birthdays", icon: Cake },
    ],
  },
  {
    title: "Configurações",
    url: "/app/hub/configuracoes",
    icon: Settings,
    subs: [
      { title: "Empresas", url: "/app/settings/companies", icon: Building2 },
      { title: "Usuários", url: "/app/settings/users", icon: UserCog },
      { title: "Perfis & Permissões", url: "/app/settings/roles", icon: ShieldCheck },
      { title: "Integrações", url: "/app/configuracoes?tab=integracoes", icon: Plug },
      { title: "Formulário Público", url: "/cadastro-publico", icon: ExternalLink, external: true },
      { title: "Backup", url: "/app/backup", icon: Database },
    ],
  },
];

const account = [
  { title: "Meu Perfil", url: "/app/perfil", icon: UserCircle },
];

const STORAGE_KEY = "sa:sidebar:open";

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data: pendentes = 0 } = usePendentesCount();
  const { isSuperAdmin, hasPermission, loading: companyLoading, switching } = useCompany();

  // Mantém apenas itens (e folders/subs) cujo usuário tem permissão.
  const canAccess = (url: string, external?: boolean) =>
    canAccessRoute(url, hasPermission, isSuperAdmin, external);

  const filterItems = (items: Item[]): Item[] =>
    items
      .map((it) => {
        const filterSubs = (subs?: Sub[]): Sub[] | undefined =>
          subs
            ?.map((s) => {
              if (s.subs) {
                const nested = filterSubs(s.subs);
                if (!nested || nested.length === 0) return null;
                return { ...s, subs: nested } as Sub;
              }
              return canAccess(s.url, s.external) ? s : null;
            })
            .filter((s): s is Sub => s !== null);
        const subs = filterSubs(it.subs);
        const subFolders = it.subFolders
          ?.map((f) => ({ ...f, subs: filterSubs(f.subs) ?? [] }))
          .filter((f) => f.subs.length > 0);
        const itemAllowed = canAccess(it.url);
        const hasChildren = (subs && subs.length > 0) || (subFolders && subFolders.length > 0);
        // Se o item tem filhos definidos, só mantém se ainda restar algum filho permitido.
        if (it.subs || it.subFolders) {
          if (!hasChildren) return null;
          return { ...it, subs, subFolders };
        }
        return itemAllowed ? it : null;
      })
      .filter((x): x is Item => x !== null);

  const mainNavBase = isSuperAdmin
    ? main.map((g) =>
        g.title === "Político"
          ? {
              ...g,
              subFolders: (g.subFolders ?? []).map((f) =>
                f.key === "ae-tecnico"
                  ? {
                      ...f,
                      subs: [
                        ...f.subs,
                        { title: "Performance & Filas", url: "/app/analise-de-eleitores/performance", icon: Activity },
                        { title: "Homologação & Testes", url: "/app/analise-de-eleitores/homologacao", icon: ShieldCheck },
                        { title: "Financeiro (Super Admin)", url: "/app/analise-de-eleitores/financeiro-admin", icon: BarChart3 },
                      ],
                    }
                  : f,
              ),
            }
          : g,
      )
    : main;
  // Durante carregamento inicial OU troca de empresa, não renderizamos
  // nenhum item — evita flicker e cliques em rotas da empresa anterior.
  const navBlocked = switching || (companyLoading && !isSuperAdmin);
  const mainNav = navBlocked ? [] : filterItems(mainNavBase);

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");
  const subActive = (sub: Sub): boolean =>
    (sub.url !== "#" && isActive(sub.url)) ||
    (sub.subs?.some((s) => subActive(s)) ?? false);
  const groupActive = (item: Item) =>
    isActive(item.url) ||
    (item.subs?.some((s) => subActive(s)) ?? false) ||
    (item.subFolders?.some((f) => f.subs.some((s) => subActive(s))) ?? false);

  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  });

  // Auto-open active group
  useEffect(() => {
    setOpen((prev) => {
      const next = { ...prev };
      let changed = false;
      mainNav.forEach((item) => {
        if ((item.subs || item.subFolders) && groupActive(item) && !next[item.title]) {
          next[item.title] = true;
          changed = true;
        }
        item.subFolders?.forEach((f) => {
          if (f.subs.some((s) => subActive(s)) && !next[f.key]) {
            next[f.key] = true;
            changed = true;
          }
          f.subs.forEach((s) => {
            if (s.subs && s.subs.some((i) => isActive(i.url))) {
              const k = s.key ?? `${f.key}-${s.title}`;
              if (!next[k]) { next[k] = true; changed = true; }
            }
          });
        });
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(open));
  }, [open]);

  // Fecha o overlay do sidebar automaticamente ao navegar no mobile
  useEffect(() => {
    if (isMobile) setOpenMobile(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isMobile]);

  const toggle = (key: string) => setOpen((p) => ({ ...p, [key]: !p[key] }));

  const itemClasses =
    "h-11 gap-3 rounded-lg px-4 text-[14px] font-medium text-sidebar-foreground transition-colors duration-200 " +
    "hover:bg-muted hover:text-foreground " +
    "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:font-semibold";

  const handleLogout = async () => {
    await authService.signOut();
    toast.success("Sessão encerrada.");
    navigate("/login", { replace: true });
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/80">
      <SidebarHeader className="bg-sidebar px-3 pt-4">
        <div className="rounded-xl border border-sidebar-border bg-card px-3 py-3 shadow-elegant-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary shadow-elegant-sm">
              <Vote className="h-5 w-5 text-primary-foreground" strokeWidth={2} />
            </div>
            {!collapsed && (
              <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="text-sm font-semibold text-foreground">SA CONNECT</span>
                <span className="text-[11px] text-muted-foreground">Gabinete Inteligente</span>
              </div>
            )}
          </div>
          {!collapsed && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
              <span>Ambiente principal</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar px-3 pb-3 pt-2">
        <SidebarGroup className="p-0 pb-6">
          <SidebarGroupLabel className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
            Navegação
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {mainNav.map((item) => {
                const showBadge = !!item.badgeKey && !collapsed && pendentes > 0;
                // Item sem subs (Dashboard) — link direto
                if (!item.subs && !item.subFolders) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        isActive={isActive(item.url)}
                        className={itemClasses}
                        size="lg"
                      >
                        <NavLink to={item.url}>
                          <item.icon className="h-5 w-5" strokeWidth={2} />
                          <span className="flex-1 text-[14px]">{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                // Quando colapsado: vira link direto para o hub
                if (collapsed) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        isActive={groupActive(item)}
                        className={itemClasses}
                        size="lg"
                      >
                        <NavLink to={item.url}>
                          <item.icon className="h-5 w-5" strokeWidth={2} />
                          <span className="flex-1 text-[14px]">{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                const isOpen = !!open[item.title];
                return (
                  <Collapsible
                    key={item.title}
                    open={isOpen}
                    onOpenChange={() => toggle(item.title)}
                    asChild
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.title}
                          isActive={groupActive(item)}
                          className={itemClasses}
                          size="lg"
                        >
                          <item.icon className="h-5 w-5" strokeWidth={2} />
                          <span className="flex-1 text-left text-[14px]">{item.title}</span>
                          {showBadge && (
                            <Badge className="h-5 min-w-[20px] justify-center bg-amber-500 px-1.5 text-[10px] text-white hover:bg-amber-500">
                              {pendentes}
                            </Badge>
                          )}
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 opacity-70" />
                          ) : (
                            <ChevronRight className="h-4 w-4 opacity-70" />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="ml-0 border-none pl-0 mt-0.5 gap-0">
                          {item.subs?.map((sub) => (
                            <SidebarMenuSubItem key={sub.url}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isActive(sub.url)}
                                className="min-h-8 h-auto py-1.5 pl-6 pr-3 items-start !overflow-visible text-[12.5px] font-medium text-sidebar-foreground/85 hover:bg-muted hover:text-foreground data-[active=true]:bg-accent data-[active=true]:text-primary data-[active=true]:font-semibold [&>span:last-child]:!truncate-none [&>span:last-child]:!whitespace-normal [&>span:last-child]:!overflow-visible"
                              >
                                <NavLink to={sub.url}>
                                  <sub.icon className="h-3.5 w-3.5 shrink-0 mt-[3px]" />
                                  <span className="whitespace-normal break-words leading-snug">{sub.title}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                          {item.subFolders?.map((folder) => {
                            const folderOpen = !!open[folder.key];
                            const folderActive = folder.subs.some((s) => subActive(s));
                            return (
                              <Collapsible
                                key={folder.key}
                                open={folderOpen}
                                onOpenChange={() => toggle(folder.key)}
                              >
                                <SidebarMenuSubItem>
                                  <CollapsibleTrigger asChild>
                                    <SidebarMenuSubButton
                                      isActive={folderActive}
                                      className="min-h-8 h-auto py-1.5 pl-6 pr-2 items-start cursor-pointer !overflow-visible text-[12.5px] font-semibold text-sidebar-foreground/90 hover:bg-muted hover:text-foreground data-[active=true]:text-foreground [&>span:last-child]:!whitespace-normal [&>span:last-child]:!overflow-visible"
                                    >
                                      <folder.icon className="h-3.5 w-3.5 shrink-0 mt-[3px]" />
                                      <span className="flex-1 whitespace-normal break-words leading-snug text-left">{folder.title}</span>
                                      {folderOpen ? (
                                        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                      ) : (
                                        <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                      )}
                                    </SidebarMenuSubButton>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <SidebarMenuSub className="ml-0 border-none pl-0 mt-0 gap-0">
                                      {folder.subs.map((sub) => {
                                        if (sub.subs && sub.subs.length > 0) {
                                          const nestedKey = sub.key ?? `${folder.key}-${sub.title}`;
                                          const nestedOpen = !!open[nestedKey];
                                          const nestedActive = sub.subs.some((s) => subActive(s));
                                          return (
                                            <Collapsible
                                              key={nestedKey}
                                              open={nestedOpen}
                                              onOpenChange={() => toggle(nestedKey)}
                                            >
                                              <SidebarMenuSubItem>
                                                <CollapsibleTrigger asChild>
                                                  <SidebarMenuSubButton
                                                    isActive={nestedActive}
                                                    className="min-h-7 h-auto py-1 pl-10 pr-2 items-start cursor-pointer !overflow-visible text-[12px] font-semibold text-sidebar-foreground/85 hover:bg-muted hover:text-foreground data-[active=true]:text-foreground [&>span:last-child]:!whitespace-normal [&>span:last-child]:!overflow-visible"
                                                  >
                                                    <sub.icon className="h-3 w-3 shrink-0 mt-[3px]" />
                                                    <span className="flex-1 whitespace-normal break-words leading-snug text-left">{sub.title}</span>
                                                    {nestedOpen ? (
                                                      <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
                                                    ) : (
                                                      <ChevronRight className="h-3 w-3 shrink-0 opacity-70" />
                                                    )}
                                                  </SidebarMenuSubButton>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent>
                                                  <SidebarMenuSub className="ml-0 border-none pl-0 mt-0 gap-0">
                                                    {sub.subs.map((inner) => (
                                                      <SidebarMenuSubItem key={inner.url}>
                                                        <SidebarMenuSubButton
                                                          asChild
                                                          isActive={isActive(inner.url)}
                                                          className="min-h-7 h-auto py-1 pl-14 pr-3 items-start !overflow-visible text-[12px] text-sidebar-foreground/80 hover:bg-muted hover:text-foreground data-[active=true]:bg-accent data-[active=true]:text-primary data-[active=true]:font-semibold [&>span:last-child]:!whitespace-normal [&>span:last-child]:!overflow-visible"
                                                        >
                                                          <NavLink to={inner.url}>
                                                            <inner.icon className="h-3 w-3 shrink-0 mt-[3px]" />
                                                            <span className="whitespace-normal break-words leading-snug">{inner.title}</span>
                                                          </NavLink>
                                                        </SidebarMenuSubButton>
                                                      </SidebarMenuSubItem>
                                                    ))}
                                                  </SidebarMenuSub>
                                                </CollapsibleContent>
                                              </SidebarMenuSubItem>
                                            </Collapsible>
                                          );
                                        }
                                        return (
                                          <SidebarMenuSubItem key={sub.url}>
                                            <SidebarMenuSubButton
                                              asChild
                                              isActive={isActive(sub.url)}
                                              className="min-h-7 h-auto py-1 pl-10 pr-3 items-start !overflow-visible text-[12px] text-sidebar-foreground/80 hover:bg-muted hover:text-foreground data-[active=true]:bg-accent data-[active=true]:text-primary data-[active=true]:font-semibold [&>span:last-child]:!whitespace-normal [&>span:last-child]:!overflow-visible"
                                            >
                                              <NavLink to={sub.url}>
                                                <sub.icon className="h-3 w-3 shrink-0 mt-[3px]" />
                                                <span className="whitespace-normal break-words leading-snug">{sub.title}</span>
                                              </NavLink>
                                            </SidebarMenuSubButton>
                                          </SidebarMenuSubItem>
                                        );
                                      })}
                                    </SidebarMenuSub>
                                  </CollapsibleContent>
                                </SidebarMenuSubItem>
                              </Collapsible>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="p-0 pt-2 mt-2 border-t border-sidebar-border/60">
          <SidebarGroupLabel className="px-4 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
            Conta
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {account.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActive(item.url)}
                    className={itemClasses}
                    size="lg"
                  >
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" strokeWidth={2} />
                      <span className="text-[14px]">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border bg-sidebar p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sair"
              onClick={handleLogout}
              className="h-10 gap-3 rounded-lg px-3 text-sidebar-foreground/80 hover:bg-card hover:text-foreground"
            >
              <LogOut className="h-5 w-5" strokeWidth={2} />
              <span className="text-sm">Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
