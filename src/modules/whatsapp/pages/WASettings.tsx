import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, User, Eye, PhoneOff, ShieldCheck, CheckCircle2, XCircle, Lock, Ban, Webhook } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zapiInstanceService } from "../services/zapiInstanceService";

const WEBHOOK_RECEPTIVO_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-zapi-receptivo`;

export default function WASettings() {
  // Perfil
  const [profileName, setProfileName] = useState("");
  const [profileDesc, setProfileDesc] = useState("");
  const [profilePic, setProfilePic] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Comportamento
  const [autoReadMsg, setAutoReadMsg] = useState(false);
  const [autoReadStatus, setAutoReadStatus] = useState(false);

  // Chamadas
  const [callReject, setCallReject] = useState(false);
  const [callRejectMsg, setCallRejectMsg] = useState(
    "Olá! Não atendemos por chamada. Por favor, descreva sua demanda por mensagem 🙏"
  );

  // Validador de números
  const [phonesInput, setPhonesInput] = useState("");
  const [validating, setValidating] = useState(false);
  const [validateResults, setValidateResults] = useState<Array<{ phone: string; exists: boolean }>>([]);

  // Contatos bloqueados
  const [blockedContacts, setBlockedContacts] = useState<string[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  // Webhook
  const [configuringWebhook, setConfiguringWebhook] = useState(false);
  const [webhookOk, setWebhookOk] = useState<boolean | null>(null);

  useEffect(() => {
    zapiInstanceService.getProfile().then((p: any) => {
      if (p?.profilePictureUrl || p?.value) setProfilePic(p.profilePictureUrl || p.value);
    }).catch(() => {});
  }, []);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const tasks: Promise<unknown>[] = [];
      if (profileName.trim()) tasks.push(zapiInstanceService.updateProfileName(profileName.trim()));
      if (profileDesc.trim()) tasks.push(zapiInstanceService.updateProfileDescription(profileDesc.trim()));
      if (profilePic.trim().startsWith("http")) tasks.push(zapiInstanceService.updateProfilePicture(profilePic.trim()));
      await Promise.all(tasks);
      toast.success("Perfil atualizado com sucesso");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar perfil");
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleAutoReadMsg = async (v: boolean) => {
    setAutoReadMsg(v);
    try { await zapiInstanceService.setAutoReadMessage(v); toast.success("Atualizado"); }
    catch (e) { setAutoReadMsg(!v); toast.error(e instanceof Error ? e.message : "Erro"); }
  };
  const toggleAutoReadStatus = async (v: boolean) => {
    setAutoReadStatus(v);
    try { await zapiInstanceService.setAutoReadStatus(v); toast.success("Atualizado"); }
    catch (e) { setAutoReadStatus(!v); toast.error(e instanceof Error ? e.message : "Erro"); }
  };
  const toggleCallReject = async (v: boolean) => {
    setCallReject(v);
    try { await zapiInstanceService.setCallRejectAuto(v); toast.success("Atualizado"); }
    catch (e) { setCallReject(!v); toast.error(e instanceof Error ? e.message : "Erro"); }
  };
  const saveCallMsg = async () => {
    try { await zapiInstanceService.setCallRejectMessage(callRejectMsg); toast.success("Mensagem salva"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
  };

  const validatePhones = async () => {
    const list = phonesInput.split(/[\s,;\n]+/).map(p => p.replace(/\D/g, "")).filter(p => p.length >= 10);
    if (!list.length) { toast.error("Informe ao menos um número"); return; }
    setValidating(true);
    try {
      const res = await zapiInstanceService.phoneExistsBatch(list);
      setValidateResults(res ?? []);
      const ativos = (res ?? []).filter(r => r.exists).length;
      toast.success(`${ativos}/${list.length} números têm WhatsApp`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao validar");
    } finally {
      setValidating(false);
    }
  };

  const loadBlocked = async () => {
    setLoadingBlocked(true);
    try {
      const res = await zapiInstanceService.getDisallowedContacts();
      setBlockedContacts(Array.isArray(res) ? res : []);
    } catch (e) {
      toast.error("Erro ao carregar contatos bloqueados");
    } finally {
      setLoadingBlocked(false);
    }
  };

  const unblock = async (phone: string) => {
    try {
      await zapiInstanceService.unblockContact(phone);
      toast.success("Contato desbloqueado");
      loadBlocked();
    } catch (e) {
      toast.error("Erro ao desbloquear");
    }
  };

  const configurarWebhook = async () => {
    setConfiguringWebhook(true);
    setWebhookOk(null);
    try {
      await zapiInstanceService.updateWebhookReceived(WEBHOOK_RECEPTIVO_URL);
      await zapiInstanceService.updateWebhookSend(true);
      setWebhookOk(true);
      toast.success("Webhook configurado! O Z-API agora enviará mensagens recebidas para o SA Connect.");
    } catch (e: any) {
      setWebhookOk(false);
      toast.error("Falha ao configurar webhook: " + (e?.message ?? "Erro desconhecido"));
    } finally {
      setConfiguringWebhook(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ─── Card de Webhook ─── */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Webhook className="h-4 w-4 text-primary" />
            Recebimento de Mensagens (Webhook)
          </CardTitle>
          <CardDescription>
            Para receber mensagens em tempo real, o Z-API precisa enviar os eventos para o SA Connect.
            Clique no botão abaixo para configurar automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs font-mono bg-muted rounded px-3 py-2 break-all select-all">
            {WEBHOOK_RECEPTIVO_URL}
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={configurarWebhook} disabled={configuringWebhook} className="gap-2">
              {configuringWebhook
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Webhook className="h-4 w-4" />}
              Configurar webhook agora
            </Button>
            {webhookOk === true && (
              <span className="flex items-center gap-1 text-sm text-emerald-600 font-medium">
                <CheckCircle2 className="h-4 w-4" /> Webhook activo
              </span>
            )}
            {webhookOk === false && (
              <span className="flex items-center gap-1 text-sm text-destructive font-medium">
                <XCircle className="h-4 w-4" /> Falhou — verifique a conexão Z-API
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Se já configurou manualmente no painel Z-API, apenas certifique-se de que a URL acima está correcta.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Centro de Controle da Instância</CardTitle>
          <CardDescription>
            Gerencie perfil, comportamento e chamadas do número WhatsApp diretamente daqui.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="perfil" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 h-auto py-1">
          <TabsTrigger value="perfil" className="px-2 py-1.5"><User className="h-3.5 w-3.5 mr-1" />Perfil</TabsTrigger>
          <TabsTrigger value="privacidade" className="px-2 py-1.5"><Lock className="h-3.5 w-3.5 mr-1" />Privacidade</TabsTrigger>
          <TabsTrigger value="comportamento" className="px-2 py-1.5"><Eye className="h-3.5 w-3.5 mr-1" />Ações</TabsTrigger>
          <TabsTrigger value="chamadas" className="px-2 py-1.5"><PhoneOff className="h-3.5 w-3.5 mr-1" />Chamadas</TabsTrigger>
          <TabsTrigger value="validador" className="px-2 py-1.5"><ShieldCheck className="h-3.5 w-3.5 mr-1" />Validar</TabsTrigger>
        </TabsList>

        {/* PERFIL */}
        <TabsContent value="perfil">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Perfil do WhatsApp</CardTitle>
              <CardDescription>Como o eleitor vê seu número.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profilePic} />
                  <AvatarFallback>WA</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Label>URL da foto de perfil (https://...)</Label>
                  <Input value={profilePic} onChange={(e) => setProfilePic(e.target.value)} placeholder="https://..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nome exibido</Label>
                <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Ex: Gabinete Vereador João" />
              </div>
              <div className="space-y-2">
                <Label>Descrição / Bio</Label>
                <Textarea value={profileDesc} onChange={(e) => setProfileDesc(e.target.value)} placeholder="Atendimento de seg a sex, 9h-18h" rows={3} />
              </div>
              <Button onClick={saveProfile} disabled={savingProfile}>
                {savingProfile && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar perfil
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PRIVACIDADE */}
        <TabsContent value="privacidade">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Visibilidade</CardTitle>
                <CardDescription>Quem pode ver suas informações.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Visto por último</Label>
                  <Select onValueChange={(v: any) => zapiInstanceService.setLastSeen(v).then(() => toast.success("Visto por último atualizado"))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="contacts">Meus contatos</SelectItem>
                      <SelectItem value="none">Ninguém</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Foto de perfil</Label>
                  <Select onValueChange={(v: any) => zapiInstanceService.setPhotoVisualization(v).then(() => toast.success("Foto de perfil atualizada"))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="contacts">Meus contatos</SelectItem>
                      <SelectItem value="none">Ninguém</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status (Online)</Label>
                  <Select onValueChange={(v: any) => zapiInstanceService.setPrivacyOnline(v).then(() => toast.success("Status online atualizado"))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="match_last_seen">Mesmo que visto por último</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Recado (Sobre)</Label>
                  <Select onValueChange={(v: any) => zapiInstanceService.setPrivacyDescription(v).then(() => toast.success("Privacidade do recado atualizada"))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="contacts">Meus contatos</SelectItem>
                      <SelectItem value="none">Ninguém</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Segurança e Mensagens</CardTitle>
                <CardDescription>Permissões e duração de conversas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Confirmação de leitura (✓✓ azul)</Label>
                  <Select onValueChange={(v: any) => zapiInstanceService.setReadReceipts(v).then(() => toast.success("Confirmação de leitura atualizada"))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Ativado (Todos)</SelectItem>
                      <SelectItem value="none">Desativado (Ninguém)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Mensagens temporárias (Duração padrão)</Label>
                  <Select onValueChange={(v: any) => zapiInstanceService.setMessagesDuration(v).then(() => toast.success("Duração de mensagens atualizada"))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OFF">Desativado</SelectItem>
                      <SelectItem value="24_HOURS">24 horas</SelectItem>
                      <SelectItem value="7_DAYS">7 dias</SelectItem>
                      <SelectItem value="90_DAYS">90 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quem pode me adicionar a grupos</Label>
                  <Select onValueChange={(v: any) => zapiInstanceService.setGroupAddPermission(v).then(() => toast.success("Permissão de grupo atualizada"))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="contacts">Meus contatos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Ban className="h-4 w-4" /> Contatos Bloqueados
                </CardTitle>
                <CardDescription>Números que não podem enviar mensagens para você.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadBlocked} disabled={loadingBlocked}>
                {loadingBlocked ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar lista"}
              </Button>
            </CardHeader>
            <CardContent>
              {blockedContacts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {blockedContacts.map((phone) => (
                    <div key={phone} className="flex items-center justify-between p-2 border rounded-md text-sm">
                      <span>{phone}</span>
                      <Button variant="ghost" size="sm" className="h-7 text-red-500 hover:text-red-700" onClick={() => unblock(phone)}>
                        Desbloquear
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                  Nenhum contato bloqueado encontrado.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMPORTAMENTO */}
        <TabsContent value="comportamento">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comportamento de Leitura</CardTitle>
              <CardDescription>Controla o "✓✓ azul" e visualização de status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Marcar mensagens como lidas automaticamente</Label>
                  <p className="text-xs text-muted-foreground">
                    Quando ATIVO, toda mensagem recebida fica com ✓✓ azul. Recomendado: DESATIVADO para gabinete poder triar.
                  </p>
                </div>
                <Switch checked={autoReadMsg} onCheckedChange={toggleAutoReadMsg} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Visualizar status (stories) automaticamente</Label>
                  <p className="text-xs text-muted-foreground">Quando ATIVO, marca status de contatos como visualizados.</p>
                </div>
                <Switch checked={autoReadStatus} onCheckedChange={toggleAutoReadStatus} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CHAMADAS */}
        <TabsContent value="chamadas">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gestão de Chamadas</CardTitle>
              <CardDescription>Direcione o eleitor para mensagem de texto, onde fica registrado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Rejeitar chamadas automaticamente</Label>
                  <p className="text-xs text-muted-foreground">Recusa qualquer chamada de voz ou vídeo recebida.</p>
                </div>
                <Switch checked={callReject} onCheckedChange={toggleCallReject} />
              </div>
              <div className="space-y-2">
                <Label>Mensagem automática após rejeitar chamada</Label>
                <Textarea value={callRejectMsg} onChange={(e) => setCallRejectMsg(e.target.value)} rows={3} />
                <Button onClick={saveCallMsg} variant="secondary" size="sm">Salvar mensagem</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VALIDADOR */}
        <TabsContent value="validador">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Validador de Números</CardTitle>
              <CardDescription>
                Antes de disparar uma campanha, descubra quais números têm WhatsApp ativo. Economiza créditos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Cole os números (um por linha, ou separados por vírgula)</Label>
                <Textarea
                  value={phonesInput}
                  onChange={(e) => setPhonesInput(e.target.value)}
                  rows={6}
                  placeholder="5511999999999&#10;5511888888888"
                />
              </div>
              <Button onClick={validatePhones} disabled={validating}>
                {validating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Validar
              </Button>
              {validateResults.length > 0 && (
                <div className="border rounded-md divide-y">
                  {validateResults.map((r) => (
                    <div key={r.phone} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="font-mono">{r.phone}</span>
                      {r.exists ? (
                        <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-4 w-4" />Tem WhatsApp</span>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground"><XCircle className="h-4 w-4" />Sem WhatsApp</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
