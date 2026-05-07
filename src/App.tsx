import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/modules/auth/hooks/useAuth";
import { ProtectedRoute } from "@/modules/auth/components/ProtectedRoute";
import { PublicRoute } from "@/modules/auth/components/PublicRoute";

import Login from "@/modules/auth/pages/Login";
import Cadastro from "@/modules/auth/pages/Cadastro";
import ResetPassword from "@/modules/auth/pages/ResetPassword";
import AppLayout from "@/shared/layout/AppLayout";
import Dashboard from "@/modules/dashboard/pages/Dashboard";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import NotFound from "@/pages/NotFound";

// Novo shell modular (hubs + dashboard unificado)
const DashboardHome = lazy(() => import("@/modules/dashboard/pages/DashboardHome"));
const SettingsHubPage = lazy(() => import("@/shared/pages/hubs/SettingsHub"));
const WhatsAppHubPage = lazy(() => import("@/shared/pages/hubs/WhatsAppHub"));
const TicketsHubPage = lazy(() => import("@/shared/pages/hubs/TicketsHub"));
const PoliticalHubPage = lazy(() => import("@/shared/pages/hubs/PoliticalHub"));

// Lazy loaded routes (reduz bundle inicial)
const Eleitores = lazy(() => import("@/modules/eleitores/pages/Eleitores"));
const Captacao = lazy(() => import("@/modules/captacao/pages/Captacao"));
const CadastroPublico = lazy(() => import("@/modules/captacao/pages/CadastroPublico"));
const Comunicacao = lazy(() => import("@/modules/comunicacao/pages/Comunicacao"));
const Perfil = lazy(() => import("@/modules/perfil/pages/Perfil"));
const Eventos = lazy(() => import("@/modules/eventos/pages/Eventos"));
const Pesquisas = lazy(() => import("@/modules/pesquisa/pages/Pesquisas"));
const NovaPesquisa = lazy(() => import("@/modules/pesquisa/pages/NovaPesquisa"));
const Resultados = lazy(() => import("@/modules/pesquisa/pages/Resultados"));
const PesquisaPublica = lazy(() => import("@/modules/pesquisa/pages/PesquisaPublica"));
const Mapa = lazy(() => import("@/modules/mapa/pages/Mapa"));
const Relatorios = lazy(() => import("@/modules/relatorios/pages/Relatorios"));
const Agenda = lazy(() => import("@/modules/agenda/pages/Agenda"));
const Aniversariantes = lazy(() => import("@/modules/aniversariantes/pages/Aniversariantes"));
const Predicao = lazy(() => import("@/modules/predicao/pages/Predicao"));
const Automacoes = lazy(() => import("@/modules/automacao/pages/Automacoes"));
const AutomacaoEditor = lazy(() => import("@/modules/automacao/pages/AutomacaoEditor"));
const AutomacaoHistorico = lazy(() => import("@/modules/automacao/pages/AutomacaoHistorico"));
const Concorrencia = lazy(() => import("@/modules/concorrencia/pages/Concorrencia"));
const Gamificacao = lazy(() => import("@/modules/gamificacao/pages/Gamificacao"));
const CRM = lazy(() => import("@/modules/crm/pages/CRM"));
const Executivo = lazy(() => import("@/modules/executivo/pages/Executivo"));
const Segmentacao = lazy(() => import("@/modules/segmentacao/pages/Segmentacao"));
const Campanhas = lazy(() => import("@/modules/campanhas/pages/Campanhas"));
const Aprovacoes = lazy(() => import("@/modules/aprovacoes/pages/Aprovacoes"));
const Auditoria = lazy(() => import("@/modules/auditoria/pages/Auditoria"));
const Integracoes = lazy(() => import("@/modules/integracoes/pages/Integracoes"));
const WhatsApp = lazy(() => import("@/modules/whatsapp/pages/WhatsApp"));
const WhatsAppHub = lazy(() => import("@/modules/whatsapp/pages/WhatsAppHub"));
const Atendimento = lazy(() => import("@/modules/atendimento/pages/Atendimento"));
const AtendimentoDashboard = lazy(() => import("@/modules/atendimento/pages/AtendimentoDashboard"));
const DepartamentosAtendimento = lazy(() => import("@/modules/atendimento/pages/Departamentos"));
const TemplatesAtendimento = lazy(() => import("@/modules/atendimento/pages/Templates"));
const AtendimentoWebhookLogs = lazy(() => import("@/modules/atendimento/pages/WebhookLogs"));
const AtendimentoRoteamento = lazy(() => import("@/modules/atendimento/pages/Roteamento"));
const ConfiguracoesWhatsApp = lazy(() => import("@/modules/atendimento/pages/Configuracoes"));
const RelatoriosAtendimento = lazy(() => import("@/modules/atendimento/pages/Relatorios"));
const ConfiguracoesAvancadasAtendimento = lazy(() => import("@/modules/atendimento/pages/ConfiguracoesAvancadas"));
const Chatbots = lazy(() => import("@/modules/chatbot/pages/Chatbots"));
const ChatbotEditor = lazy(() => import("@/modules/chatbot/pages/ChatbotEditor"));
const ChatbotSessoes = lazy(() => import("@/modules/chatbot/pages/ChatbotSessoes"));
const Disparos = lazy(() => import("@/modules/disparos/pages/Disparos"));
const DisparoDetalhe = lazy(() => import("@/modules/disparos/pages/DisparoDetalhe"));
const DisparoOptout = lazy(() => import("@/modules/disparos/pages/DisparoOptout"));
const DisparoConfig = lazy(() => import("@/modules/disparos/pages/DisparoConfig"));
const Configuracoes = lazy(() => import("@/modules/configuracoes/pages/Configuracoes"));
const Backup = lazy(() => import("@/modules/backup/pages/Backup"));
const Webhooks = lazy(() => import("@/modules/webhooks/pages/Webhooks"));
const Notificacoes = lazy(() => import("@/modules/notificacoes/pages/Notificacoes"));
const Cadastros = lazy(() => import("@/modules/cadastros/pages/Cadastros"));
const DepartamentosGabinete = lazy(() => import("@/modules/departamentos-gabinete/pages/DepartamentosGabinete"));
const DepartamentoGabineteDetalhe = lazy(() => import("@/modules/departamentos-gabinete/pages/DepartamentoDetalhe"));
const SettingsLayout = lazy(() => import("@/modules/settings/pages/SettingsLayout"));
const SettingsDashboard = lazy(() => import("@/modules/settings/pages/SettingsDashboard"));
const SettingsUsers = lazy(() => import("@/modules/settings/pages/UsersManager"));
const SettingsCompanies = lazy(() => import("@/modules/settings/pages/CompaniesManager"));
const SettingsProfiles = lazy(() => import("@/modules/settings/pages/ProfilesManager"));
const SettingsPermissions = lazy(() => import("@/modules/settings/pages/PermissionsByProfilePage"));
const SettingsUserCompany = lazy(() => import("@/modules/settings/pages/UserCompanyLinksPage"));
const SettingsAudit = lazy(() => import("@/modules/settings/pages/AuditLogs"));
const SettingsGeneral = lazy(() => import("@/modules/settings/pages/GlobalSettings"));

// Novo módulo WhatsApp multi-tenant (Módulo 2 SaaS)
const WhatsAppLayout = lazy(() => import("@/modules/whatsapp/pages/WhatsAppLayout"));
const WADashboard = lazy(() => import("@/modules/whatsapp/pages/WADashboard"));
const WASessions = lazy(() => import("@/modules/whatsapp/pages/WASessions"));
const WAConversations = lazy(() => import("@/modules/whatsapp/pages/WAConversations"));
const WAChat = lazy(() => import("@/modules/whatsapp/pages/WAChat"));
const WAContacts = lazy(() => import("@/modules/whatsapp/pages/WAContacts"));
const WACampaigns = lazy(() => import("@/modules/whatsapp/pages/WACampaigns"));
const WAChatbot = lazy(() => import("@/modules/whatsapp/pages/WAChatbot"));
const WAQueues = lazy(() => import("@/modules/whatsapp/pages/WAQueues"));
const WATemplates = lazy(() => import("@/modules/whatsapp/pages/WATemplates"));
const WAIntegrations = lazy(() => import("@/modules/whatsapp/pages/WAIntegrations"));
const WALogs = lazy(() => import("@/modules/whatsapp/pages/WALogs"));
const WASettings = lazy(() => import("@/modules/whatsapp/pages/WASettings"));
const WaLegacyRedirect = lazy(() => import("@/modules/whatsapp/pages/WaLegacyRedirect"));

// Módulo 3 — Tickets / Chamados (SaaS multi-tenant)
const TicketsLayout = lazy(() => import("@/modules/tickets/pages/TicketsLayout"));
const TicketsDashboard = lazy(() => import("@/modules/tickets/pages/TicketsDashboard"));
const TicketsList = lazy(() => import("@/modules/tickets/pages/TicketsList"));
const TicketDetail = lazy(() => import("@/modules/tickets/pages/TicketDetail"));
const TicketsCalendar = lazy(() => import("@/modules/tickets/pages/TicketsCalendar"));
const TicketsQueues = lazy(() => import("@/modules/tickets/pages/TicketsQueues"));
const TicketsCategories = lazy(() => import("@/modules/tickets/pages/TicketsCategories"));
const TicketsSLA = lazy(() => import("@/modules/tickets/pages/TicketsSLA"));
const TicketsSettings = lazy(() => import("@/modules/tickets/pages/TicketsSettings"));

// Módulo 4 — Político / Gabinete (SaaS multi-tenant)
const PoliticalLayout = lazy(() => import("@/modules/political/pages/PoliticalLayout"));
const PoliticalDashboard = lazy(() => import("@/modules/political/pages/PoliticalDashboard"));
const VotersList = lazy(() => import("@/modules/political/pages/VotersList"));
const VoterCapture = lazy(() => import("@/modules/political/pages/VoterCapture"));
const ElectoralCRM = lazy(() => import("@/modules/political/pages/ElectoralCRM"));
const SocialEvents = lazy(() => import("@/modules/political/pages/SocialEvents"));
const CabinetAgenda = lazy(() => import("@/modules/political/pages/CabinetAgenda"));
const ElectoralMap = lazy(() => import("@/modules/political/pages/ElectoralMap"));
const Polls = lazy(() => import("@/modules/political/pages/Polls"));
const Birthdays = lazy(() => import("@/modules/political/pages/Birthdays"));
const Gamification = lazy(() => import("@/modules/political/pages/Gamification"));
const Predictions = lazy(() => import("@/modules/political/pages/Predictions"));
const Competitors = lazy(() => import("@/modules/political/pages/Competitors"));
const Segmentation = lazy(() => import("@/modules/political/pages/Segmentation"));
const CabinetDepartments = lazy(() => import("@/modules/political/pages/CabinetDepartments"));
const Liderancas = lazy(() => import("@/modules/political/pages/Liderancas"));
const CabosEleitorais = lazy(() => import("@/modules/political/pages/CabosEleitorais"));
const MeusEleitores = lazy(() => import("@/modules/political/pages/MeusEleitores"));
const CadastroCaboPublico = lazy(() => import("@/modules/political/pages/CadastroCaboPublico"));
const HierarquiaDashboard = lazy(() => import("@/modules/political/pages/HierarquiaDashboard"));
const MetasGamificacao = lazy(() => import("@/modules/political/pages/MetasGamificacao"));

// Módulo 5 — WhatsApp Meta (API Oficial)
const MetaLayout = lazy(() => import("@/modules/whatsapp-meta/pages/MetaLayout"));
const MetaDashboard = lazy(() => import("@/modules/whatsapp-meta/pages/MetaDashboard"));
const MetaSessions = lazy(() => import("@/modules/whatsapp-meta/pages/MetaSessions"));
const MetaTemplates = lazy(() => import("@/modules/whatsapp-meta/pages/MetaTemplates"));
const MetaCampaigns = lazy(() => import("@/modules/whatsapp-meta/pages/MetaCampaigns"));
const MetaLeads = lazy(() => import("@/modules/whatsapp-meta/pages/MetaLeads"));
const MetaOAuthCallback = lazy(() => import("@/modules/whatsapp-meta/pages/MetaOAuthCallback"));
const MetaConnect = lazy(() => import("@/modules/whatsapp-meta/pages/MetaConnect"));

import { CompanyProvider } from "@/modules/settings/contexts/CompanyContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="sa-theme">
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CompanyProvider>
          <Suspense fallback={<div className="flex h-screen items-center justify-center text-sm text-muted-foreground">Carregando…</div>}>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route
              path="/login"
              element={
                <ErrorBoundary>
                  <PublicRoute><Login /></PublicRoute>
                </ErrorBoundary>
              }
            />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/cadastro-publico" element={<CadastroPublico />} />
            <Route path="/p/:slug" element={<PesquisaPublica />} />
            <Route path="/cabo/r/:token" element={<CadastroCaboPublico />} />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              {/* Novo dashboard unificado com 3 abas */}
              <Route path="dashboard" element={<DashboardHome />}>
                <Route index element={<Navigate to="principal" replace />} />
                <Route path="principal" element={<Dashboard />} />
                <Route path="executivo" element={<Executivo />} />
                <Route path="politico" element={<PoliticalDashboard />} />
              </Route>
              {/* Hubs modulares */}
              <Route path="hub/configuracoes" element={<SettingsHubPage />} />
              <Route path="hub/whatsapp" element={<WhatsAppHubPage />} />
              <Route path="hub/tickets" element={<TicketsHubPage />} />
              <Route path="hub/politico" element={<PoliticalHubPage />} />
              {/* Rotas antigas → redirects para /app/political/* */}
              <Route path="eleitores" element={<Navigate to="/app/political/voters" replace />} />
              <Route path="captacao" element={<Navigate to="/app/political/capture" replace />} />
              <Route path="eventos" element={<Navigate to="/app/political/events" replace />} />
              <Route path="pesquisas" element={<Navigate to="/app/political/polls" replace />} />
              <Route path="pesquisas/nova" element={<NovaPesquisa />} />
              <Route path="pesquisas/:id/editar" element={<NovaPesquisa />} />
              <Route path="pesquisas/:id" element={<Resultados />} />
              <Route path="mapa" element={<Navigate to="/app/political/map" replace />} />
              <Route path="relatorios" element={<Relatorios />} />
              <Route path="predicao" element={<Navigate to="/app/political/predictions" replace />} />
              <Route path="automacoes" element={<Automacoes />} />
              <Route path="automacoes/historico" element={<AutomacaoHistorico />} />
              <Route path="automacoes/:id" element={<AutomacaoEditor />} />
              <Route path="concorrencia" element={<Navigate to="/app/political/competitors" replace />} />
              <Route path="gamificacao" element={<Navigate to="/app/political/gamification" replace />} />
              <Route path="crm" element={<Navigate to="/app/political/crm" replace />} />
              <Route path="executivo" element={<Executivo />} />
              <Route path="segmentacao" element={<Navigate to="/app/political/segmentation" replace />} />
              <Route path="campanhas" element={<Campanhas />} />
              <Route path="disparos" element={<Disparos />} />
              <Route path="disparos/optout" element={<DisparoOptout />} />
              <Route path="disparos/config" element={<DisparoConfig />} />
              <Route path="disparos/:id" element={<DisparoDetalhe />} />
              <Route path="aprovacoes" element={<Aprovacoes />} />
              <Route path="auditoria" element={<Auditoria />} />
              <Route path="integracoes" element={<Integracoes />} />
              <Route path="whatsapp" element={<WhatsApp />} />
              <Route path="whatsapp-hub" element={<WhatsAppHub />} />
              <Route path="atendimento" element={<Atendimento />} />
              <Route path="atendimento/dashboard" element={<AtendimentoDashboard />} />
              <Route path="atendimento/relatorios" element={<RelatoriosAtendimento />} />
              <Route path="atendimento/departamentos" element={<DepartamentosAtendimento />} />
              <Route path="atendimento/templates" element={<TemplatesAtendimento />} />
              <Route path="atendimento/logs" element={<AtendimentoWebhookLogs />} />
              <Route path="atendimento/roteamento" element={<AtendimentoRoteamento />} />
              <Route path="atendimento/configuracoes" element={<ConfiguracoesWhatsApp />} />
              <Route path="atendimento/configuracoes-avancadas" element={<ConfiguracoesAvancadasAtendimento />} />
              <Route path="chatbot" element={<Chatbots />} />
              <Route path="chatbot/sessoes" element={<ChatbotSessoes />} />
              <Route path="chatbot/:id" element={<ChatbotEditor />} />
              <Route path="agenda" element={<Navigate to="/app/political/agenda" replace />} />
              <Route path="aniversariantes" element={<Navigate to="/app/political/birthdays" replace />} />
              <Route path="comunicacao" element={<Comunicacao />} />
              <Route path="configuracoes" element={<Configuracoes />} />
              <Route path="backup" element={<Backup />} />
              <Route path="webhooks" element={<Webhooks />} />
              <Route path="notificacoes" element={<Notificacoes />} />
              <Route path="cadastros" element={<Cadastros />} />
              <Route path="departamentos-gabinete" element={<Navigate to="/app/political/departments" replace />} />
              <Route path="departamentos-gabinete/:id" element={<DepartamentoGabineteDetalhe />} />
              <Route path="political" element={<PoliticalLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<PoliticalDashboard />} />
                <Route path="voters" element={<VotersList />} />
                <Route path="capture" element={<VoterCapture />} />
                <Route path="crm" element={<ElectoralCRM />} />
                <Route path="events" element={<SocialEvents />} />
                <Route path="agenda" element={<CabinetAgenda />} />
                <Route path="map" element={<ElectoralMap />} />
                <Route path="polls" element={<Polls />} />
                <Route path="birthdays" element={<Birthdays />} />
                <Route path="gamification" element={<Gamification />} />
                <Route path="predictions" element={<Predictions />} />
                <Route path="competitors" element={<Competitors />} />
                <Route path="segmentation" element={<Segmentation />} />
                <Route path="departments" element={<CabinetDepartments />} />
                <Route path="liderancas" element={<Liderancas />} />
                <Route path="cabos" element={<CabosEleitorais />} />
                <Route path="meus-eleitores" element={<MeusEleitores />} />
                <Route path="hierarquia" element={<HierarquiaDashboard />} />
                <Route path="metas-gamificacao" element={<MetasGamificacao />} />
              </Route>
              <Route path="settings" element={<SettingsLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<SettingsDashboard />} />
                <Route path="users" element={<SettingsUsers />} />
                <Route path="user-company" element={<SettingsUserCompany />} />
                <Route path="companies" element={<SettingsCompanies />} />
                <Route path="profiles" element={<SettingsProfiles />} />
                <Route path="permissions" element={<SettingsPermissions />} />
                <Route path="audit" element={<SettingsAudit />} />
                <Route path="general" element={<SettingsGeneral />} />
              </Route>
              <Route path="whatsapp" element={<WhatsAppLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<WADashboard />} />
                <Route path="sessions" element={<WASessions />} />
                <Route path="conversations" element={<WAConversations />} />
                <Route path="chat" element={<WAChat />} />
                <Route path="contacts" element={<WAContacts />} />
                <Route path="campaigns" element={<WACampaigns />} />
                <Route path="bot" element={<WAChatbot />} />
                <Route path="queues" element={<WAQueues />} />
                <Route path="templates" element={<WATemplates />} />
                <Route path="integrations" element={<WAIntegrations />} />
                <Route path="logs" element={<WALogs />} />
                <Route path="settings" element={<WASettings />} />
              </Route>
              <Route path="wa/*" element={<WaLegacyRedirect />} />
              <Route path="tickets" element={<TicketsLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<TicketsDashboard />} />
                <Route path="list" element={<TicketsList />} />
                <Route path="view/:id" element={<TicketDetail />} />
                <Route path="calendar" element={<TicketsCalendar />} />
                <Route path="queues" element={<TicketsQueues />} />
                <Route path="categories" element={<TicketsCategories />} />
                <Route path="sla" element={<TicketsSLA />} />
                <Route path="settings" element={<TicketsSettings />} />
              </Route>
              <Route path="wa-meta/oauth-callback" element={<MetaOAuthCallback />} />
              <Route path="wa-meta" element={<MetaLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<MetaDashboard />} />
                <Route path="connect" element={<MetaConnect />} />
                <Route path="sessions" element={<MetaSessions />} />
                <Route path="templates" element={<MetaTemplates />} />
                <Route path="campaigns" element={<MetaCampaigns />} />
                <Route path="leads" element={<MetaLeads />} />
              </Route>
              <Route path="perfil" element={<Perfil />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </CompanyProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
