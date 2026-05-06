import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageCircle, Inbox, History, Building2, Settings2 } from "lucide-react";
import Atendimento from "@/modules/atendimento/pages/Atendimento";
import Historico from "@/modules/atendimento/pages/Historico";
import Departamentos from "@/modules/atendimento/pages/Departamentos";
import ConfiguracoesAvancadas from "@/modules/atendimento/pages/ConfiguracoesAvancadas";

export default function WhatsAppHub() {
  const [tab, setTab] = useState("receptivo");
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">WhatsApp</h1>
          <p className="text-xs text-muted-foreground">Central de atendimento e configurações</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
          <TabsTrigger value="receptivo" className="gap-1.5 rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"><Inbox className="h-4 w-4" />Receptivo</TabsTrigger>
          <TabsTrigger value="historico" className="gap-1.5 rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"><History className="h-4 w-4" />Histórico</TabsTrigger>
          <TabsTrigger value="departamentos" className="gap-1.5 rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"><Building2 className="h-4 w-4" />Departamentos</TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5 rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"><Settings2 className="h-4 w-4" />Config. Avançadas</TabsTrigger>
        </TabsList>
        <TabsContent value="receptivo" className="mt-4"><Atendimento /></TabsContent>
        <TabsContent value="historico" className="mt-4"><Historico /></TabsContent>
        <TabsContent value="departamentos" className="mt-4"><Departamentos /></TabsContent>
        <TabsContent value="config" className="mt-4"><ConfiguracoesAvancadas /></TabsContent>
      </Tabs>
    </div>
  );
}