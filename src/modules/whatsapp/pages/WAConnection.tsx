import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smartphone, RefreshCw, Power, QrCode, KeyRound, Edit3, Loader2, User, CheckCircle2, XCircle, ListMusic, PhoneCall, Trash2 as Trash } from "lucide-react";
import { toast } from "sonner";
import { whatsappService } from "../services/whatsappService";

export default function WAConnection() {
  const [activeTab, setActiveTab] = useState("actions");
  const status = useQuery({
    queryKey: ["wa-status"],
    queryFn: () => whatsappService.status(),
    refetchInterval: (q) => {
      const d = q.state.data as { connected?: boolean } | undefined;
      // Quando aba Par está aberta e desconectado, refresh do QR a cada 15s
      if (activeTab === "pairing" && !d?.connected) return 15000;
      return d?.connected ? 30000 : 10000;
    },
  });

  useEffect(() => {
    if (activeTab === "pairing") status.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);
  
  const connected = !!status.data?.connected;
  const credentialsError = !!status.data?.credentialsError;
  const canLoadDetails = !!status.data && !credentialsError && connected;

  const me = useQuery({ queryKey: ["wa-me"], queryFn: () => whatsappService.me(), enabled: canLoadDetails });
  const device = useQuery({ queryKey: ["wa-device"], queryFn: () => whatsappService.device(), enabled: canLoadDetails });
  const queue = useQuery({ queryKey: ["wa-queue"], queryFn: () => whatsappService.getQueue(), enabled: connected });

  const [busy, setBusy] = useState<string | null>(null);
  const [phoneForCode, setPhoneForCode] = useState("");
  const [phoneCode, setPhoneCode] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const wrap = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try { await fn(); if (ok) toast.success(ok); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  const refreshAll = () => {
    status.refetch();
    if (canLoadDetails) {
      me.refetch();
      device.refetch();
    }
    if (connected) {
      queue.refetch();
    }
  };

  const handleDisconnect = () => wrap("disc", async () => {
    if (!confirm("Tem certeza que deseja desconectar?\n\nVocê precisará escanear o QR Code novamente para reconectar.")) return;
    await whatsappService.disconnect(); refreshAll();
  }, "Desconectado");
  const handleRestart = () => wrap("rest", async () => {
    await whatsappService.restart();
    setTimeout(refreshAll, 5000);
  }, "Instância reiniciada. Verificando reconexão...");
  const handlePhoneCode = () => wrap("pcode", async () => {
    if (!phoneForCode.trim()) return toast.error("Informe o número (com DDI/DDD)");
    const r: any = await whatsappService.phoneCode(phoneForCode.replace(/\D/g, ""));
    setPhoneCode(r?.data?.code ?? r?.data?.value ?? JSON.stringify(r?.data));
  });
  const handleRename = () => wrap("ren", async () => {
    if (!newName.trim()) return toast.error("Informe o novo nome");
    await whatsappService.rename(newName.trim()); setNewName("");
  }, "Instância renomeada");

  const meData = me.data?.data ?? me.data;
  const dev = device.data?.data ?? device.data;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" /> Status da Conexão
            </CardTitle>
            <CardDescription>Informações em tempo real da instância Z-API</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {connected ? (
              <Badge className="gap-1 bg-green-500 hover:bg-green-600"><CheckCircle2 className="h-3 w-3" /> Conectado</Badge>
            ) : (
              <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Desconectado</Badge>
            )}
            <Button size="sm" variant="outline" onClick={refreshAll}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <InfoBlock title="Conta (me)" loading={canLoadDetails && me.isLoading} empty={!canLoadDetails || !meData}>
            {meData && (
              <div className="space-y-1 text-sm">
                <Row label="Nome" value={meData?.name ?? meData?.pushname ?? "—"} />
                <Row label="Número" value={meData?.id ?? meData?.phone ?? "—"} />
                <Row label="Negócio" value={String(meData?.isBusiness ?? "—")} />
              </div>
            )}
          </InfoBlock>
          <InfoBlock title="Dispositivo" loading={canLoadDetails && device.isLoading} empty={!canLoadDetails || !dev}>
            {dev && (
              <div className="space-y-1 text-sm">
                <Row label="Modelo" value={dev?.deviceManufacturer ? `${dev.deviceManufacturer} ${dev.deviceModel ?? ""}` : (dev?.device ?? "—")} />
                <Row label="Plataforma" value={dev?.platform ?? "—"} />
                <Row label="Bateria" value={dev?.battery != null ? `${dev.battery}%` : "—"} />
                <Row label="Conectado" value={String(dev?.connected ?? "—")} />
              </div>
            )}
          </InfoBlock>
        </CardContent>
        {credentialsError && (
          <CardContent className="pt-0">
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-muted-foreground">
              A conexão cadastrada para esta empresa está com <strong>Client Token inválido</strong>. Verifique as credenciais no menu Conexões.
            </div>
          </CardContent>
        )}
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="actions"><Power className="h-4 w-4 mr-1" />Ações</TabsTrigger>
          <TabsTrigger value="pairing"><QrCode className="h-4 w-4 mr-1" />Par</TabsTrigger>
          <TabsTrigger value="queue"><ListMusic className="h-4 w-4 mr-1" />Fila</TabsTrigger>
          <TabsTrigger value="calls"><PhoneCall className="h-4 w-4 mr-1" />Ligar</TabsTrigger>
          <TabsTrigger value="rename"><Edit3 className="h-4 w-4 mr-1" />Nome</TabsTrigger>
        </TabsList>

        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Controle da instância</CardTitle>
              <CardDescription>Reinicie ou desconecte o número remotamente.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button onClick={handleRestart} disabled={busy === "rest"} variant="outline">
                {busy === "rest" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Reiniciar
              </Button>
              <Button onClick={handleDisconnect} disabled={busy === "disc"} variant="destructive">
                {busy === "disc" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Power className="h-4 w-4 mr-2" />}
                Desconectar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pairing">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pareamento</CardTitle>
              <CardDescription>QR Code ou código numérico de 8 dígitos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {connected ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                  <p className="font-medium">WhatsApp já está conectado!</p>
                  <p className="text-sm text-muted-foreground">Não é necessário escanear QR Code.</p>
                </div>
              ) : status.data?.qrImage ? (
                <div className="flex flex-col items-center gap-2">
                  <img src={status.data.qrImage} alt="QR Code" className="h-56 w-56 rounded border bg-white p-2" />
                  <p className="text-xs text-muted-foreground">Escaneie pelo WhatsApp → Aparelhos conectados</p>
                  <p className="text-xs text-muted-foreground">O QR Code é atualizado automaticamente a cada 15 segundos.</p>
                </div>
              ) : (
                <div className="flex h-56 flex-col items-center justify-center gap-2 rounded border border-dashed text-sm text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Gerando QR Code...
                </div>
              )}
              <div className="space-y-2 border-t pt-4">
                <Label className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Pareamento por código</Label>
                <div className="flex gap-2">
                  <Input value={phoneForCode} onChange={(e) => setPhoneForCode(e.target.value)} placeholder="5511999999999" />
                  <Button onClick={handlePhoneCode} disabled={busy === "pcode"}>
                    {busy === "pcode" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerar"}
                  </Button>
                </div>
                {phoneCode && (
                  <div className="rounded-md bg-muted p-3 text-center">
                    <p className="font-mono text-2xl tracking-widest font-bold">{phoneCode}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Fila de Mensagens</CardTitle>
                <CardDescription>Mensagens aguardando envio na Z-API.</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => wrap("delQ", () => whatsappService.deleteQueue(), "Fila limpa")}>
                <Trash className="h-4 w-4 mr-2" /> Limpar
              </Button>
            </CardHeader>
            <CardContent>
              {queue.isLoading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : (
                <div className="space-y-2">
                  {(!queue.data || (Array.isArray(queue.data) && queue.data.length === 0)) ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma mensagem na fila</p>
                  ) : (
                    <div className="rounded-md border divide-y overflow-hidden">
                      {(Array.isArray(queue.data) ? queue.data : []).map((q: any, i: number) => (
                        <div key={i} className="p-3 text-xs flex justify-between items-center bg-card hover:bg-muted/50 transition-colors">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold">{q.phone}</div>
                            <div className="text-muted-foreground truncate">{q.content || "Mensagem de mídia/outro"}</div>
                          </div>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => wrap("delQId", () => whatsappService.deleteQueueId(q.id), "Mensagem removida")}>
                            <Trash className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calls">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chamadas de Voz</CardTitle>
              <CardDescription>Inicie uma chamada de voz para um número.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Número (55 + DDD + Telefone)</Label>
                <div className="flex gap-2">
                  <Input value={phoneForCode} onChange={(e) => setPhoneForCode(e.target.value)} placeholder="5511999999999" />
                  <Button onClick={() => wrap("call", () => whatsappService.sendCall(phoneForCode), "Chamada iniciada")}>
                    <PhoneCall className="h-4 w-4 mr-2" /> Ligar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rename">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Renomear instância</CardTitle>
              <CardDescription>Altera o nome da instância na Z-API.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label>Novo nome</Label>
              <div className="flex gap-2">
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Atendimento Principal" />
                <Button onClick={handleRename} disabled={busy === "ren"}>
                  {busy === "ren" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoBlock({ title, loading, empty, children }: { title: string; loading?: boolean; empty?: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-md border p-3 bg-muted/5">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <User className="h-3 w-3" />{title}
      </div>
      {loading ? <div className="flex justify-center p-2"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div> :
        empty ? <p className="text-xs text-muted-foreground italic">Sem dados disponíveis</p> : children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: unknown }) {
  let display: string;
  if (value === null || value === undefined || value === "") {
    display = "—";
  } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    display = String(value);
  } else if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // Heurísticas para objetos comuns vindos da Z-API
    display =
      (obj.sessionName as string) ??
      (obj.device_model as string) ??
      (obj.deviceModel as string) ??
      (obj.name as string) ??
      (obj.id as string) ??
      (obj.phone as string) ??
      JSON.stringify(value);
  } else {
    display = String(value);
  }
  return (
    <div className="flex justify-between gap-2 border-b border-border/50 py-1 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{display}</span>
    </div>
  );
}
