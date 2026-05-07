import { useEffect, useState } from "react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";
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

type Sub = { title: string; url: string; icon: LucideIcon };
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
  { title: "Dashboard", url: "/app/dashboard", icon: LayoutGrid },
  {
    title: "Configurações",
    url: "/app/hub/configuracoes",
    icon: Settings,
    subs: [
      { title: "Empresas", url: "/app/settings/companies", icon: Building2 },
      { title: "Usuários", url: "/app/settings/users", icon: UserCog },
      { title: "Perfis & RBAC", url: "/app/settings/profiles", icon: ShieldCheck },
      { title: "Integrações", url: "/app/integracoes", icon: Share2 },
      { title: "Webhooks", url: "/app/webhooks", icon: Webhook },
      { title: "Backup", url: "/app/backup", icon: Database },
      { title: "Notificações", url: "/app/notificacoes", icon: Bell },
      { title: "Auditoria", url: "/app/auditoria", icon: Activity },
      { title: "Geral", url: "/app/configuracoes", icon: Settings2 },
    ],
  },
  {
    title: "WhatsApp",
    url: "/app/hub/whatsapp",
    icon: MessageCircle,
    badgeKey: "wa",
    subFolders: [
      {
        title: "WhatsApp",
        key: "wa-zapi",
        icon: Smartphone,
        subs: [
          { title: "Atendimento", url: "/app/atendimento", icon: Inbox },
          { title: "Comunicação", url: "/app/comunicacao", icon: MessageSquare },
          { title: "Campanhas", url: "/app/campanhas", icon: Megaphone },
          { title: "Disparos", url: "/app/disparos", icon: Send },
          { title: "Chatbot / URA", url: "/app/chatbot", icon: Bot },
          { title: "Templates", url: "/app/atendimento/templates", icon: FileText },
          { title: "Relatórios", url: "/app/atendimento/relatorios", icon: FileBarChart },
        ],
      },
      {
        title: "WhatsApp Oficial",
        key: "wa-meta",
        icon: Plug,
        subs: [
          { title: "Conexão", url: "/app/wa-meta/connect", icon: Plug },
          { title: "Sessões", url: "/app/wa-meta/sessions", icon: Smartphone },
          { title: "Dashboard", url: "/app/wa-meta/dashboard", icon: LayoutDashboard },
          { title: "Configurações", url: "/app/atendimento/configuracoes-avancadas", icon: Settings2 },
        ],
      },
    ],
  },
  {
    title: "Tickets",
    url: "/app/hub/tickets",
    icon: Inbox,
    subs: [
      { title: "Dashboard", url: "/app/tickets/dashboard", icon: LayoutDashboard },
      { title: "Chamados", url: "/app/tickets/list", icon: ListChecks },
      { title: "Agenda", url: "/app/tickets/calendar", icon: CalendarDays },
      { title: "Filas", url: "/app/tickets/queues", icon: Zap },
      { title: "Categorias", url: "/app/tickets/categories", icon: Tag },
      { title: "SLA", url: "/app/tickets/sla", icon: ShieldCheck },
      { title: "Configurações", url: "/app/tickets/settings", icon: Settings2 },
    ],
  },
  {
    title: "Político",
    url: "/app/hub/politico",
    icon: Vote,
    subs: [
      { title: "Eleitores", url: "/app/political/voters", icon: Users },
      { title: "Novo Eleitor", url: "/app/political/capture", icon: UserPlus },
      { title: "Lideranças", url: "/app/political/liderancas", icon: ShieldCheck },
      { title: "Cabos Eleitorais", url: "/app/political/cabos", icon: Megaphone },
      { title: "Meus Eleitores", url: "/app/political/meus-eleitores", icon: UserPlus },
      { title: "Dashboard Hierárquico", url: "/app/political/hierarquia", icon: LayoutDashboard },
      { title: "Metas & Gamificação", url: "/app/political/metas-gamificacao", icon: Trophy },
      { title: "CRM Eleitoral", url: "/app/political/crm", icon: Kanban },
      { title: "Eventos", url: "/app/political/events", icon: Calendar },
      { title: "Agenda", url: "/app/political/agenda", icon: CalendarDays },
      { title: "Mapa Eleitoral", url: "/app/political/map", icon: MapPin },
      { title: "Pesquisas", url: "/app/political/polls", icon: BarChart2 },
      { title: "Aniversariantes", url: "/app/political/birthdays", icon: Cake },
      { title: "Gamificação", url: "/app/political/gamification", icon: Trophy },
      { title: "Predição", url: "/app/political/predictions", icon: TrendingUp },
      { title: "Concorrência", url: "/app/political/competitors", icon: BarChart3 },
       { title: "Segmentação", url: "/app/political/segmentation", icon: Filter },
       { title: "Logística", url: "/app/political/logistica", icon: Package },
      { title: "Departamentos", url: "/app/political/departments", icon: Building2 },
      { title: "Aprovações", url: "/app/aprovacoes", icon: ShieldCheck },
      { title: "Relatórios", url: "/app/relatorios", icon: FileBarChart },
    ],
  },
];

const account = [
  { title: "Meu Perfil", url: "/app/perfil", icon: UserCircle },
  { title: "Formulário Público", url: "/cadastro-publico", icon: ExternalLink, external: true },
];

const STORAGE_KEY = "sa:sidebar:open";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data: pendentes = 0 } = usePendentesCount();

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");
  const groupActive = (item: Item) =>
    isActive(item.url) ||
    (item.subs?.some((s) => isActive(s.url)) ?? false) ||
    (item.subFolders?.some((f) => f.subs.some((s) => isActive(s.url))) ?? false);

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
      main.forEach((item) => {
        if ((item.subs || item.subFolders) && groupActive(item) && !next[item.title]) {
          next[item.title] = true;
          changed = true;
        }
        item.subFolders?.forEach((f) => {
          if (f.subs.some((s) => isActive(s.url)) && !next[f.key]) {
            next[f.key] = true;
            changed = true;
          }
        });
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(open));
  }, [open]);

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
              {main.map((item) => {
                const showBadge = item.badgeKey === "wa" && pendentes > 0 && !collapsed;
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
                                className="h-9 pl-7 pr-3 text-muted-foreground hover:bg-muted/60 hover:text-foreground data-[active=true]:bg-accent data-[active=true]:text-primary data-[active=true]:font-medium"
                              >
                                <NavLink to={sub.url}>
                                  <sub.icon className="h-3.5 w-3.5" />
                                  <span className="truncate text-[13px]">{sub.title}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                          {item.subFolders?.map((folder) => {
                            const folderOpen = !!open[folder.key];
                            const folderActive = folder.subs.some((s) => isActive(s.url));
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
                                      className="h-9 pl-7 pr-2 cursor-pointer text-muted-foreground hover:bg-muted/60 hover:text-foreground data-[active=true]:text-foreground data-[active=true]:font-medium"
                                    >
                                      <folder.icon className="h-3.5 w-3.5 shrink-0" />
                                      <span className="flex-1 truncate whitespace-nowrap text-[13px] font-medium">{folder.title}</span>
                                      {folderOpen ? (
                                        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                      ) : (
                                        <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                      )}
                                    </SidebarMenuSubButton>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <SidebarMenuSub className="ml-0 border-none pl-0 mt-0 gap-0">
                                      {folder.subs.map((sub) => (
                                        <SidebarMenuSubItem key={sub.url}>
                                          <SidebarMenuSubButton
                                            asChild
                                            isActive={isActive(sub.url)}
                                            className="h-8 pl-11 pr-3 text-muted-foreground/80 hover:bg-muted/40 hover:text-foreground data-[active=true]:bg-accent data-[active=true]:text-primary data-[active=true]:font-medium"
                                          >
                                            <NavLink to={sub.url}>
                                              <sub.icon className="h-3 w-3 shrink-0" />
                                              <span className="truncate text-[12.5px]">{sub.title}</span>
                                            </NavLink>
                                          </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                      ))}
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
                    <NavLink to={item.url} target={item.external ? "_blank" : undefined}>
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
