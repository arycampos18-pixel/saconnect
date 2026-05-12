import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { NotificationsBell } from "@/shared/components/NotificationsBell";
import { ThemeToggle } from "@/shared/components/ThemeToggle";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { useNovasMensagensRealtime } from "@/modules/atendimento/hooks/useNovasMensagensRealtime";
import { CompanySwitcher } from "@/modules/settings/components/CompanySwitcher";
import { useCompany } from "@/modules/settings/contexts/CompanyContext";
import { Breadcrumbs } from "@/shared/components/Breadcrumbs";
import { KeyboardShortcutsProvider } from "@/shared/hooks/useKeyboardShortcuts";
import { getRequiredPermission, findFallbackRoute } from "@/shared/auth/routePermissions";
import { ShieldOff } from "lucide-react";
import { Can } from "@/shared/auth/Can";
import { NovoEleitorMenu } from "@/modules/eleitores/components/NovoEleitorMenu";

function initials(name?: string | null) {
  if (!name) return "SA";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}

export default function AppLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { currentCompany, isSuperAdmin, hasPermission, loading: companyLoading, switching, permissionsReady } = useCompany();
  useNovasMensagensRealtime();

  // Em telas menores (< xl = 1280px) a sidebar inicia colapsada para não
  // empurrar nem espremer o conteúdo. No mobile (< 768px) o shadcn
  // Sidebar já vira um Sheet sobreposto, então este controle só afeta
  // tablets e desktops estreitos.
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 1280;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 1280px)");
    const onChange = (e: MediaQueryListEvent) => setSidebarOpen(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Bloqueia acesso a rotas para as quais o perfil não tem permissão
  useEffect(() => {
    if (companyLoading || switching || !permissionsReady || isSuperAdmin) return;
    const required = getRequiredPermission(pathname);
    if (!required) return;
    if (!hasPermission(required)) {
      const fallback = findFallbackRoute(hasPermission);
      toast.error("Você não tem permissão para acessar esta página.");
      navigate(fallback, { replace: true });
    }
  }, [pathname, isSuperAdmin, hasPermission, companyLoading, switching, permissionsReady, navigate]);

  // Avaliação síncrona — impede o conteúdo da rota de renderizar mesmo
  // que o usuário digite a URL diretamente. O useEffect acima cuida do
  // redirecionamento; aqui apenas garantimos que nada vaza enquanto isso.
  const requiredPerm = getRequiredPermission(pathname);
  const blocked =
    !companyLoading &&
    !switching &&
    permissionsReady &&
    !isSuperAdmin &&
    !!requiredPerm &&
    !hasPermission(requiredPerm);

  // Enquanto as permissões carregam (login inicial OU troca de empresa),
  // não renderizamos o conteúdo — evita flicker e impede consumo de dados
  // antes do CompanyContext estar atualizado.
  const permissionsLoading = ((companyLoading || !permissionsReady) && !isSuperAdmin) || switching;

  const userName =
    (user?.user_metadata as { nome?: string; full_name?: string } | undefined)?.nome ??
    (user?.user_metadata as { full_name?: string } | undefined)?.full_name ??
    user?.email?.split("@")[0] ??
    "Usuário";

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <KeyboardShortcutsProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95 px-3 py-2.5 backdrop-blur md:px-8 md:py-3">
            <div className="flex items-center gap-2 md:gap-3">
              <SidebarTrigger
                aria-label="Abrir menu"
                className="h-10 w-10 shrink-0 rounded-lg border border-border bg-card text-foreground shadow-elegant-sm hover:bg-secondary md:h-9 md:w-9"
              />
              <div className="min-w-0 flex-1">
                <Breadcrumbs />
              </div>
              <div className="flex items-center gap-1.5 md:gap-3">
                <div className="hidden md:inline-flex">
                  <CompanySwitcher />
                </div>
                <div className="hidden sm:inline-flex">
                  <NovoEleitorMenu />
                </div>
                <NotificationsBell />
                <div className="hidden sm:inline-flex">
                  <ThemeToggle />
                </div>
                <Avatar className="h-9 w-9 border border-border bg-card shadow-elegant-sm">
                  <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                    {initials(userName)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-x-hidden px-3 py-4 md:px-8 md:py-7">
            <ErrorBoundary key={`${currentCompany?.id ?? "no-company"}:${pathname}`}>
              {blocked ? (
                <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-8 text-center shadow-elegant-sm">
                  <ShieldOff className="h-10 w-10 text-destructive" />
                  <h2 className="text-lg font-semibold text-foreground">Acesso negado</h2>
                  <p className="text-sm text-muted-foreground">
                    Você não tem permissão para acessar esta página. Redirecionando…
                  </p>
                </div>
              ) : permissionsLoading ? (
                <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-sm">
                    {switching ? "Trocando empresa…" : "Carregando permissões…"}
                  </p>
                </div>
              ) : (
                <Outlet />
              )}
            </ErrorBoundary>
          </main>
        </div>
      </div>
      </KeyboardShortcutsProvider>
    </SidebarProvider>
  );
}
