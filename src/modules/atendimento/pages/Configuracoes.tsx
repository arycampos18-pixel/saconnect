import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Loader2, Settings, Clock, MessageSquare, Bell, MoonStar, Hand, PlayCircle, Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { configService, type WhatsAppConfig } from "../services/configService";
import { chatbotService } from "@/modules/chatbot/services/chatbotService";
import { useNavigate } from "react-router-dom";

const DIAS = [
  { v: 0, l: "Dom" }, { v: 1, l: "Seg" }, { v: 2, l: "Ter" }, { v: 3, l: "Qua" },
  { v: 4, l: "Qui" }, { v: 5, l: "Sex" }, { v: 6, l: "Sáb" },
];

export default function ConfiguracoesWhatsApp() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: cfg, isLoading } = useQuery({
    queryKey: ["whatsapp-config"], queryFn: () => configService.obter(),
  });
  const { data: fluxos } = useQuery({
    queryKey: ["chatbot-fluxos"], queryFn: () => chatbotService.listarFluxos(),
  });
  const [form, setForm] = useState<WhatsAppConfig | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [executando, setExecutando] = useState(false);

  useEffect(() => { if (cfg) setForm(cfg); }, [cfg]);

  const salvar = async () => {
    if (!form) return;
    setSalvando(true);
    try {
      const { id, chave, ...patch } = form;
      await configService.atualizar(patch);
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["whatsapp-config"] });
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao salvar");
    } finally { setSalvando(false); }
  };

  const rodarManutencao = async () => {
    setExecutando(true);
    try {
      const r = await configService.executarManutencao();
      toast.success(`OK · 1ª resp: ${r.sla_1a} · Resol: ${r.sla_res} · Encerradas: ${r.encerradas}`);
    } catch (e: any) {
      toast.error(e.message ?? "Erro");
    } finally { setExecutando(false); }
  };

  if (isLoading || !form) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const set = <K extends keyof WhatsAppConfig>(k: K, v: WhatsAppConfig[K]) => setForm({ ...form, [k]: v });
  const toggleDia = (d: number) => {
    const arr = form.expediente_dias_semana.includes(d)
      ? form.expediente_dias_semana.filter((x) => x !== d)
      : [...form.expediente_dias_semana, d].sort();
    set("expediente_dias_semana", arr);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Settings className="h-6 w-6" /> Configurações do WhatsApp
          </h1>
          <p className="text-sm text-muted-foreground">
            SLAs, encerramento automático, boas-vindas, expediente e notificações.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={rodarManutencao} disabled={executando}>
            {executando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
            Rodar manutenção agora
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="sla">
        <TabsList>
          <TabsTrigger value="sla"><Clock className="mr-1 h-3 w-3" />SLA</TabsTrigger>
          <TabsTrigger value="encerramento"><MoonStar className="mr-1 h-3 w-3" />Encerramento</TabsTrigger>
          <TabsTrigger value="boasvindas"><Hand className="mr-1 h-3 w-3" />Boas-vindas</TabsTrigger>
          <TabsTrigger value="expediente"><Clock className="mr-1 h-3 w-3" />Expediente</TabsTrigger>
          <TabsTrigger value="chatbot"><Bot className="mr-1 h-3 w-3" />Chatbot</TabsTrigger>
          <TabsTrigger value="notif"><Bell className="mr-1 h-3 w-3" />Notificações</TabsTrigger>
        </TabsList>

        {/* SLA */}
        <TabsContent value="sla" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Acordos de Nível de Serviço</CardTitle>
              <CardDescription>
                Conversas que passarem do limite são marcadas como SLA violado e aparecem destacadas na inbox.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Bloco
                titulo="1ª resposta"
                desc="Tempo máximo entre o contato escrever e o atendente responder."
                checked={form.sla_primeira_resposta_alerta}
                onCheck={(v) => set("sla_primeira_resposta_alerta", v)}
              >
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label>Tempo (minutos)</Label>
                    <Input type="number" min={1} value={form.sla_primeira_resposta_min}
                      onChange={(e) => set("sla_primeira_resposta_min", Number(e.target.value))} />
                  </div>
                  <Badge variant="secondary">{Math.round(form.sla_primeira_resposta_min / 60 * 10) / 10}h</Badge>
                </div>
              </Bloco>

              <Bloco
                titulo="Resolução"
                desc="Tempo máximo entre o início e a finalização do atendimento."
                checked={form.sla_resolucao_alerta}
                onCheck={(v) => set("sla_resolucao_alerta", v)}
              >
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label>Tempo (minutos)</Label>
                    <Input type="number" min={1} value={form.sla_resolucao_min}
                      onChange={(e) => set("sla_resolucao_min", Number(e.target.value))} />
                  </div>
                  <Badge variant="secondary">{Math.round(form.sla_resolucao_min / 60 * 10) / 10}h</Badge>
                </div>
              </Bloco>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Encerramento */}
        <TabsContent value="encerramento" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Encerramento automático</CardTitle>
              <CardDescription>
                Conversas inativas serão finalizadas e o contato receberá uma mensagem de despedida.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Bloco
                titulo="Ativar encerramento automático"
                desc="Roda a cada 5 minutos."
                checked={form.auto_encerrar_ativo}
                onCheck={(v) => set("auto_encerrar_ativo", v)}
              >
                <div>
                  <Label>Horas sem resposta</Label>
                  <Input type="number" min={1} value={form.auto_encerrar_horas}
                    onChange={(e) => set("auto_encerrar_horas", Number(e.target.value))} />
                </div>
                <div>
                  <Label>Mensagem de despedida</Label>
                  <Textarea rows={3} value={form.auto_encerrar_mensagem}
                    onChange={(e) => set("auto_encerrar_mensagem", e.target.value)} />
                </div>
              </Bloco>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Boas-vindas */}
        <TabsContent value="boasvindas" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Mensagem de boas-vindas</CardTitle>
              <CardDescription>Enviada automaticamente quando um novo contato escrever pela primeira vez.</CardDescription>
            </CardHeader>
            <CardContent>
              <Bloco
                titulo="Enviar boas-vindas"
                desc=""
                checked={form.boas_vindas_ativo}
                onCheck={(v) => set("boas_vindas_ativo", v)}
              >
                <Textarea rows={3} value={form.boas_vindas_mensagem}
                  onChange={(e) => set("boas_vindas_mensagem", e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  Suporta variáveis: <code>{"{nome}"}</code>, <code>{"{primeiro_nome}"}</code>.
                </p>
              </Bloco>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expediente */}
        <TabsContent value="expediente" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Fora de expediente</CardTitle>
              <CardDescription>
                Mensagem automática para contatos que escreverem fora do horário definido.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Bloco
                titulo="Ativar resposta fora de expediente"
                desc=""
                checked={form.fora_expediente_ativo}
                onCheck={(v) => set("fora_expediente_ativo", v)}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Início</Label>
                    <Input type="time" value={form.expediente_inicio}
                      onChange={(e) => set("expediente_inicio", e.target.value)} />
                  </div>
                  <div>
                    <Label>Fim</Label>
                    <Input type="time" value={form.expediente_fim}
                      onChange={(e) => set("expediente_fim", e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">Dias da semana</Label>
                  <div className="flex flex-wrap gap-1">
                    {DIAS.map((d) => (
                      <button key={d.v} onClick={() => toggleDia(d.v)}
                        className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                          form.expediente_dias_semana.includes(d.v)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}>{d.l}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Mensagem</Label>
                  <Textarea rows={3} value={form.fora_expediente_mensagem}
                    onChange={(e) => set("fora_expediente_mensagem", e.target.value)} />
                </div>
              </Bloco>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chatbot */}
        <TabsContent value="chatbot" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Chatbot / Menu URA</CardTitle>
              <CardDescription>
                Atende automaticamente os contatos antes de transferir para um atendente humano.
                Os fluxos são gerenciados em <button className="underline" onClick={() => navigate("/app/chatbot")}>Chatbot</button>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Bloco
                titulo="Ativar chatbot"
                desc="Quando ativo, o fluxo selecionado roda em toda nova conversa sem atendente."
                checked={form.chatbot_ativo}
                onCheck={(v) => set("chatbot_ativo", v)}
              >
                <div>
                  <Label>Fluxo padrão</Label>
                  <Select
                    value={form.chatbot_fluxo_id ?? "__none__"}
                    onValueChange={(v) => set("chatbot_fluxo_id", v === "__none__" ? null : v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione um fluxo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— nenhum —</SelectItem>
                      {(fluxos ?? []).filter((f) => f.ativo).map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Apenas fluxos ativos aparecem aqui. Crie ou ative um fluxo na seção Chatbot.
                  </p>
                </div>
              </Bloco>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Notificações */}
        <TabsContent value="notif" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notificações</CardTitle>
              <CardDescription>Como o time é avisado de novas mensagens.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Som ao chegar mensagem</Label>
                  <p className="text-xs text-muted-foreground">Toca um beep no navegador.</p>
                </div>
                <Switch checked={form.notif_som} onCheckedChange={(v) => set("notif_som", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Email para o atendente</Label>
                  <p className="text-xs text-muted-foreground">Em breve.</p>
                </div>
                <Switch checked={form.notif_email} onCheckedChange={(v) => set("notif_email", v)} disabled />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Bloco({
  titulo, desc, checked, onCheck, children,
}: {
  titulo: string; desc: string;
  checked: boolean; onCheck: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label className="text-sm font-semibold">{titulo}</Label>
          {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
        </div>
        <Switch checked={checked} onCheckedChange={onCheck} />
      </div>
      {checked && children && <div className="space-y-3 pt-2">{children}</div>}
    </div>
  );
}
