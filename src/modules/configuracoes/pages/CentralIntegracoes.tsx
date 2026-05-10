import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Plug, Webhook, Activity, DollarSign, ShieldCheck, Sparkles, Mail, FileText } from "lucide-react";
import { lazy, Suspense } from "react";
import { IntegracoesPanel } from "@/modules/analise-politica/pages/AnaliseIntegracoes";
import { useUserRole } from "@/modules/auth/hooks/useUserRole";

const Webhooks = lazy(() => import("@/modules/webhooks/pages/Webhooks"));
const AnaliseLogs = lazy(() => import("@/modules/analise-politica/pages/AnaliseLogs"));
const AnaliseCustosApi = lazy(() => import("@/modules/analise-politica/pages/AnaliseCustosApi"));
const EmailDominioPanel = lazy(() => import("@/modules/configuracoes/components/EmailDominioPanel"));
const FormulariosPublicosPanel = lazy(() => import("@/modules/configuracoes/components/FormulariosPublicosPanel"));

const Loader = () => (
  <div className="py-12 text-center text-sm text-muted-foreground">Carregando…</div>
);

export default function CentralIntegracoes() {
  const { isAdmin } = useUserRole();

  return (
    <div className="space-y-6">
      {/* Header premium */}
      <Card className="overflow-hidden border-none shadow-elegant-sm">
        <div className="relative bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-elegant-sm">
              <Plug className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Central de Integrações</h1>
                <span className="hidden items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary md:inline-flex">
                  <Sparkles className="h-3 w-3" /> Premium
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Gerencie APIs, serviços externos, autenticações, webhooks e conexões do sistema em um único lugar.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border bg-background/60 px-2 py-0.5">WhatsApp & Mensageria</span>
                <span className="rounded-full border bg-background/60 px-2 py-0.5">APIs de Consulta</span>
                <span className="rounded-full border bg-background/60 px-2 py-0.5">Eleitoral · TSE</span>
                <span className="rounded-full border bg-background/60 px-2 py-0.5">Automação</span>
                <span className="rounded-full border bg-background/60 px-2 py-0.5">Segurança</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="conexoes" className="space-y-4">
        <TabsList className="h-11 bg-card p-1 shadow-elegant-sm">
          <TabsTrigger value="conexoes" className="gap-2">
            <Plug className="h-4 w-4" /> Conexões
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2">
            <Webhook className="h-4 w-4" /> Webhooks
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Activity className="h-4 w-4" /> Logs
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" /> Domínio de E-mail
          </TabsTrigger>
          <TabsTrigger value="formularios" className="gap-2">
            <FileText className="h-4 w-4" /> Formulário Público
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="custos" className="gap-2">
              <DollarSign className="h-4 w-4" /> Custos
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="conexoes">
          <IntegracoesPanel />
        </TabsContent>

        <TabsContent value="webhooks">
          <Suspense fallback={<Loader />}>
            <Webhooks />
          </Suspense>
        </TabsContent>

        <TabsContent value="logs">
          <Suspense fallback={<Loader />}>
            <AnaliseLogs />
          </Suspense>
        </TabsContent>

        <TabsContent value="email">
          <Suspense fallback={<Loader />}>
            <EmailDominioPanel />
          </Suspense>
        </TabsContent>

        <TabsContent value="formularios">
          <Suspense fallback={<Loader />}>
            <FormulariosPublicosPanel />
          </Suspense>
        </TabsContent>

        {isAdmin ? (
          <TabsContent value="custos">
            <Suspense fallback={<Loader />}>
              <AnaliseCustosApi />
            </Suspense>
          </TabsContent>
        ) : (
          <TabsContent value="custos">
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
                <ShieldCheck className="h-6 w-6 text-primary" />
                Visível apenas para Super Admin.
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
