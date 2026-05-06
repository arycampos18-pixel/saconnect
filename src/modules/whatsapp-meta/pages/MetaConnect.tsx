import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { metaService, MetaSession } from "@/modules/whatsapp-meta/services/whatsappMetaService";
import { toast } from "sonner";
import { Copy, ExternalLink, ShieldCheck, Plug, KeyRound, Webhook, CheckCircle2, AlertTriangle } from "lucide-react";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const WEBHOOK_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/whatsapp-meta-webhook`;

function CopyField({ label, value }: { label: string; value: string }) {
  const copy = () => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copiado`);
  };
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={value} className="font-mono text-xs" />
        <Button type="button" variant="outline" size="icon" onClick={copy}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function MetaConnect() {
  const qc = useQueryClient();
  const { data: sessions = [] } = useQuery({
    queryKey: ["meta-sessions"],
    queryFn: () => metaService.listSessions(),
  });

  const [selectedId, setSelectedId] = useState<string>("");
  const selected = useMemo<MetaSession | undefined>(
    () => sessions.find((s) => s.id === selectedId),
    [sessions, selectedId],
  );

  const [form, setForm] = useState({
    name: "",
    phone_number_id: "",
    waba_id: "",
    app_id: "",
    app_secret: "",
  });
  const [saving, setSaving] = useState(false);

  const redirectUri = `${window.location.origin}/app/wa-meta/oauth-callback`;

  const fillFromSelected = (s?: MetaSession) => {
    if (!s) return;
    setForm({
      name: s.name,
      phone_number_id: s.phone_number_id,
      waba_id: s.waba_id,
      app_id: s.app_id ?? "",
      app_secret: s.app_secret ?? "",
    });
  };

  const onPickSession = (id: string) => {
    setSelectedId(id);
    fillFromSelected(sessions.find((s) => s.id === id));
  };

  const save = async () => {
    if (!form.name || !form.phone_number_id || !form.waba_id || !form.app_id || !form.app_secret) {
      toast.error("Preencha todos os campos antes de salvar");
      return;
    }
    setSaving(true);
    try {
      if (selected) {
        await metaService.updateSession(selected.id, form);
        toast.success("Credenciais atualizadas");
      } else {
        const created = await metaService.createSession(form);
        setSelectedId(created.id);
        toast.success("Sessão criada");
      }
      qc.invalidateQueries({ queryKey: ["meta-sessions"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const startOAuth = () => {
    if (!selected) {
      toast.error("Salve a sessão antes de autorizar");
      return;
    }
    if (!selected.app_id) {
      toast.error("App ID é obrigatório");
      return;
    }
    sessionStorage.setItem("meta_oauth_session_id", selected.id);
    sessionStorage.setItem("meta_oauth_redirect", redirectUri);
    window.location.href = metaService.buildOAuthUrl(selected.app_id, redirectUri, selected.id);
  };

  const testSend = async () => {
    if (!selected) return;
    const phone = prompt("Número de teste (com DDI, ex: 5511999999999)");
    if (!phone) return;
    try {
      await metaService.sendMessage({
        session_id: selected.id,
        phone_number: phone,
        message_type: "text",
        text: "Teste de conexão Meta WhatsApp ✅",
      });
      toast.success("Mensagem de teste enviada");
    } catch (e: any) {
      toast.error(e.message ?? "Falha no envio");
    }
  };

  const connected = selected?.status === "verified" || selected?.status === "active";

  return (
    <div className="space-y-4">
      {/* Cabeçalho com seletor de sessão */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Plug className="h-5 w-5" /> Conexão WhatsApp Oficial (Meta)
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure as credenciais da Meta, autorize o app e ative o webhook.
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Sessão existente</Label>
              <Select value={selectedId} onValueChange={onPickSession}>
                <SelectTrigger className="w-[260px]">
                  <SelectValue placeholder="Selecionar ou criar nova…" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — {s.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedId("");
                setForm({ name: "", phone_number_id: "", waba_id: "", app_id: "", app_secret: "" });
              }}
            >
              + Nova
            </Button>
          </div>
        </div>

        {selected && (
          <div className="mt-3 flex items-center gap-2">
            <Badge variant={connected ? "default" : "secondary"}>
              {connected ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Conectado
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 mr-1" /> {selected.status}
                </>
              )}
            </Badge>
            {selected.connected_at && (
              <span className="text-xs text-muted-foreground">
                desde {new Date(selected.connected_at).toLocaleString()}
              </span>
            )}
          </div>
        )}
      </Card>

      {/* Passo 1: URLs Meta */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Passo 1 — URLs para configurar no Meta for Developers</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Cole estas URLs no painel do seu App Meta (App Settings → WhatsApp → Configuration e Facebook Login → Settings).
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <CopyField label="OAuth Redirect URI" value={redirectUri} />
          <CopyField label="Webhook Callback URL" value={WEBHOOK_URL} />
        </div>
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Verify Token</AlertTitle>
          <AlertDescription>
            O Verify Token é gerado automaticamente para cada sessão. Você pode vê-lo após criar uma sessão abaixo, ou na aba <b>Sessões</b>.
            Cole o mesmo valor no campo "Verify Token" do webhook na Meta.
          </AlertDescription>
        </Alert>
        <a
          href="https://developers.facebook.com/apps/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center text-sm text-primary hover:underline"
        >
          Abrir Meta for Developers <ExternalLink className="ml-1 h-3 w-3" />
        </a>
      </Card>

      {/* Passo 2: Credenciais */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Passo 2 — Credenciais da sua empresa</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Nome da conexão</Label>
            <Input
              placeholder="Ex: Atendimento Principal"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label>App ID (Meta)</Label>
            <Input value={form.app_id} onChange={(e) => setForm({ ...form, app_id: e.target.value })} />
          </div>
          <div>
            <Label>App Secret</Label>
            <Input
              type="password"
              value={form.app_secret}
              onChange={(e) => setForm({ ...form, app_secret: e.target.value })}
            />
          </div>
          <div>
            <Label>WABA ID</Label>
            <Input value={form.waba_id} onChange={(e) => setForm({ ...form, waba_id: e.target.value })} />
          </div>
          <div>
            <Label>Phone Number ID</Label>
            <Input
              value={form.phone_number_id}
              onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando…" : selected ? "Atualizar credenciais" : "Salvar e criar sessão"}
          </Button>
        </div>
      </Card>

      {/* Passo 3: OAuth + verify token */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Passo 3 — Autorizar e ativar webhook</h3>
        </div>
        {!selected ? (
          <Alert>
            <AlertDescription>Salve a sessão acima para liberar a autorização.</AlertDescription>
          </Alert>
        ) : (
          <>
            <CopyField label="Verify Token desta sessão" value={selected.verify_token} />
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Button onClick={startOAuth}>
                <ExternalLink className="h-4 w-4 mr-2" /> Autorizar com Meta
              </Button>
              <Button variant="outline" onClick={testSend} disabled={!connected}>
                Enviar mensagem de teste
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  try {
                    const r = await metaService.syncTemplates(selected.id);
                    toast.success(`Templates sincronizados: ${r.synced_count}`);
                  } catch (e: any) {
                    toast.error(e.message ?? "Falha ao sincronizar");
                  }
                }}
                disabled={!connected}
              >
                Sincronizar templates
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}