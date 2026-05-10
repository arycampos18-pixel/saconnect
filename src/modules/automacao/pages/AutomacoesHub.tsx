import { useSearchParams } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, Bot, Workflow, CalendarClock } from "lucide-react";

const Overview = lazy(() => import("./AutomacoesOverview"));
const Chatbot = lazy(() => import("@/modules/chatbot/pages/Chatbots"));
const Fluxos = lazy(() => import("./Automacoes"));
const Agendamentos = lazy(() => import("./AutomacaoHistorico"));

const TABS = [
  { value: "overview", label: "Visão Geral", icon: LayoutGrid },
  { value: "chatbot", label: "Chatbot", icon: Bot },
  { value: "fluxos", label: "Fluxos", icon: Workflow },
  { value: "agendamentos", label: "Agendamentos", icon: CalendarClock },
] as const;

export default function AutomacoesHub() {
  const [params, setParams] = useSearchParams();
  const aba = (params.get("aba") ?? "overview") as (typeof TABS)[number]["value"];

  const onChange = (v: string) => {
    const next = new URLSearchParams(params);
    next.set("aba", v);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Automações</h1>
        <p className="text-sm text-muted-foreground">
          Chatbots, fluxos automatizados e agendamentos em um único lugar.
        </p>
      </div>

      <Tabs value={aba} onValueChange={onChange} className="space-y-4">
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
          <TabsContent value="chatbot" className="mt-0"><Chatbot /></TabsContent>
          <TabsContent value="fluxos" className="mt-0"><Fluxos /></TabsContent>
          <TabsContent value="agendamentos" className="mt-0"><Agendamentos /></TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}