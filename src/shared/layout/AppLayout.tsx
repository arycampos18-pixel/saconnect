import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Plus, ChevronRight } from "lucide-react";
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

const breadcrumbMap: Record<string, string> = {
  "/app": "Dashboard",
  "/app/eleitores": "Base de Eleitores",
  "/app/captacao": "Novo Eleitor",
  "/app/comunicacao": "Comunicação",
  "/app/perfil": "Meu Perfil",
  "/app/agenda": "Agenda do Gabinete",
  "/app/aniversariantes": "Aniversariantes",
  "/app/eventos": "Eventos Sociais",
  "/app/pesquisas": "Pesquisa Eleitoral",
  "/app/mapa": "Mapa Eleitoral",
  "/app/relatorios": "Relatórios",
  "/app/cadastros": "Cadastros",
};

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
  const { currentCompany } = useCompany();
  useNovasMensagensRealtime();
  const current = breadcrumbMap[pathname] ?? "Dashboard";
  const userName =
    (user?.user_metadata as { nome?: string; full_name?: string } | undefined)?.nome ??
    (user?.user_metadata as { full_name?: string } | undefined)?.full_name ??
    user?.email?.split("@")[0] ??
    "Usuário";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur md:px-8">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 rounded-lg border border-border bg-card text-foreground hover:bg-secondary" />
              <div className="min-w-0 flex-1">
                <nav className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                  <span className="font-medium tracking-[0.08em] text-muted-foreground">S A CONNECT</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground">{current}</span>
                </nav>
                <p className="truncate text-sm font-semibold text-foreground sm:hidden">{current}</p>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
            <CompanySwitcher />
            <Button
              onClick={() => navigate("/app/captacao")}
              className="hidden h-10 rounded-lg bg-primary px-4 text-primary-foreground shadow-elegant-glow hover:bg-[hsl(var(--primary-hover))] sm:inline-flex"
              size="sm"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Novo Eleitor
            </Button>
            <NotificationsBell />
            <ThemeToggle />
            <Avatar className="h-9 w-9 border border-border bg-card shadow-elegant-sm">
              <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                {initials(userName)}
              </AvatarFallback>
            </Avatar>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-x-hidden px-4 py-6 md:px-8 md:py-7">
            <ErrorBoundary key={`${currentCompany?.id ?? "no-company"}:${pathname}`}>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
