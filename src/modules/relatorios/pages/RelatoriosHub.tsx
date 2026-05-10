import { useSearchParams } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, MessageCircle, Users, Calendar, BarChart3 } from "lucide-react";

const Overview = lazy(() => import("./RelatoriosOverview"));
const WA = lazy(() => import("@/modules/atendimento/pages/Relatorios"));
const Eleitores = lazy(() => import("@/modules/analise-politica/pages/AnaliseRelatorios"));
const Geral = lazy(() => import("./Relatorios"));

const TABS = [
  { value: "overview", label: "Visão Geral", icon: LayoutGrid },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "eleitores", label: "Eleitores", icon: Users },
  { value: "eventos", label: "Eventos", icon: Calendar },
  { value: "geral", label: "Geral", icon: BarChart3 },
] as const;

export default function RelatoriosHub() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") ?? "overview") as (typeof TABS)[number]["value"];

  const onChange = (v: string) => {
    const next = new URLSearchParams(params);
    next.set("tab", v);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
        <p className="text-sm text-muted-foreground">
          Relatórios consolidados de WhatsApp, Eleitores, Eventos e indicadores gerais.
        </p>
      </div>

      <Tabs value={tab} onValueChange={onChange} className="space-y-4">
        <TabsList className="flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-2">
              <t.icon className="h-4 w-4" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <Suspense fallback={<div className="text-sm text-muted-foreground">Carregando…</div>}>
          <TabsContent value="overview" className="mt-0"><Overview /></TabsContent>
          <TabsContent value="whatsapp" className="mt-0"><WA /></TabsContent>
          <TabsContent value="eleitores" className="mt-0"><Eleitores /></TabsContent>
          <TabsContent value="eventos" className="mt-0">
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Relatórios de Eventos (presença, check-in, pesquisas) serão adicionados em breve.
            </div>
          </TabsContent>
          <TabsContent value="geral" className="mt-0"><Geral /></TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}