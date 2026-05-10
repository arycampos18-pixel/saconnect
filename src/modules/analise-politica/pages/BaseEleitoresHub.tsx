import { useSearchParams } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserCheck, Network, Filter, Kanban, ShieldCheck } from "lucide-react";

const Todos = lazy(() => import("./AnaliseEleitores"));
const Meus = lazy(() => import("@/modules/political/pages/MeusEleitores"));
const PorLideranca = lazy(() => import("@/modules/political/pages/VotersList"));
const Segmentacoes = lazy(() => import("@/modules/political/pages/Segmentation"));
const CRM = lazy(() => import("@/modules/political/pages/ElectoralCRM"));
const Validacao = lazy(() => import("./AnaliseValidacao"));

const TABS = [
  { value: "todos", label: "Todos", icon: Users },
  { value: "meus", label: "Meus Eleitores", icon: UserCheck },
  { value: "lideranca", label: "Por Liderança", icon: Network },
  { value: "segmentacoes", label: "Segmentações", icon: Filter },
  { value: "crm", label: "CRM", icon: Kanban },
  { value: "validacao", label: "Validação", icon: ShieldCheck },
] as const;

export default function BaseEleitoresHub() {
  const [params, setParams] = useSearchParams();
  const aba = (params.get("aba") ?? "todos") as (typeof TABS)[number]["value"];

  const onChange = (v: string) => {
    const next = new URLSearchParams(params);
    next.set("aba", v);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Base de Eleitores</h1>
        <p className="text-sm text-muted-foreground">
          Gestão completa: filtre, segmente e acompanhe interações.
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
          <TabsContent value="todos" className="mt-0"><Todos /></TabsContent>
          <TabsContent value="meus" className="mt-0"><Meus /></TabsContent>
          <TabsContent value="lideranca" className="mt-0"><PorLideranca /></TabsContent>
          <TabsContent value="segmentacoes" className="mt-0"><Segmentacoes /></TabsContent>
          <TabsContent value="crm" className="mt-0"><CRM /></TabsContent>
          <TabsContent value="validacao" className="mt-0"><Validacao /></TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}