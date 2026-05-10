import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Megaphone, Send } from "lucide-react";
import Campanhas from "./Campanhas";
import Disparos from "@/modules/disparos/pages/Disparos";
import { useSearchParams } from "react-router-dom";

export default function CampanhasHub() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("tipo") === "rapido" ? "rapido" : "agendada";
  const [tab, setTab] = useState(initial);

  const onChange = (v: string) => {
    setTab(v);
    const next = new URLSearchParams(params);
    next.set("tipo", v);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Campanhas</h1>
        <p className="text-sm text-muted-foreground">
          Envie em massa de duas formas: disparo rápido ou campanha agendada.
        </p>
      </div>

      <Tabs value={tab} onValueChange={onChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="rapido" className="gap-2">
            <Send className="h-4 w-4" /> Disparo Rápido
          </TabsTrigger>
          <TabsTrigger value="agendada" className="gap-2">
            <Megaphone className="h-4 w-4" /> Campanha Agendada
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rapido" className="mt-0">
          <Disparos />
        </TabsContent>
        <TabsContent value="agendada" className="mt-0">
          <Campanhas />
        </TabsContent>
      </Tabs>
    </div>
  );
}