import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AnaliseConsultasApi from "./AnaliseConsultasApi";
import AnaliseCustosApi from "./AnaliseCustosApi";
import AnaliseEnriquecimentoConfig from "./AnaliseEnriquecimentoConfig";

const ABAS = ["consultas", "custos", "orcamento"] as const;
type Aba = (typeof ABAS)[number];

export default function AnaliseConsultasCustosHub() {
  const [params, setParams] = useSearchParams();
  const abaParam = (params.get("aba") ?? "consultas") as Aba;
  const aba: Aba = ABAS.includes(abaParam) ? abaParam : "consultas";

  const setAba = (v: string) => {
    const next = new URLSearchParams(params);
    next.set("aba", v);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Tabs value={aba} onValueChange={setAba} className="space-y-4">
        <TabsList>
          <TabsTrigger value="consultas">Consultas API</TabsTrigger>
          <TabsTrigger value="custos">Custos de API</TabsTrigger>
          <TabsTrigger value="orcamento">Orçamento & Consumo</TabsTrigger>
        </TabsList>
        <TabsContent value="consultas" className="m-0">
          <AnaliseConsultasApi />
        </TabsContent>
        <TabsContent value="custos" className="m-0">
          <AnaliseCustosApi />
        </TabsContent>
        <TabsContent value="orcamento" className="m-0">
          <AnaliseEnriquecimentoConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}