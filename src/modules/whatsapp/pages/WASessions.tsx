import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Smartphone, Trash2, Copy, BadgeCheck, RefreshCw, Info, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTenantGate } from "../hooks/useTenantGate";
import { waService } from "../services/waService";
import { whatsappService } from "../services/whatsappService";
import { supabase } from "@/integrations/supabase/client";
import WAConnection from "./WAConnection";

const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;

export default function WASessions() {
  const { companyId } = useTenantGate();

  if (!companyId) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Selecione uma empresa para gerenciar as conexões WhatsApp.
        </CardContent>
      </Card>
    );
  }

  return <ZapiTab companyId={companyId} />;
}

/* ============================================================
   ABA 1 — Z-API
   ============================================================ */
function ZapiTab({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", instance_id: "", token: "", client_token: "" });
  const [editing, setEditing] = useState<{ id: string; name: string; instance_id: string; token: string; client_token: string } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["wa", "sessions", companyId, "zapi"],
    queryFn: async () => (await waService.listSessions(companyId)).filter((s) => s.provider === "zapi"),
  });

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copiado");
  }

  async function handleCreate() {
    if (!form.name.trim()) return toast.error("Informe um nome");
    const inst = form.instance_id.trim();
    const tok = form.token.trim();
    const ct = form.client_token.trim();
    
    if (!/^[A-Za-z0-9-_]{10,}$/.test(inst)) return toast.error("Instance ID inválido");
    if (!/^[A-Za-z0-9-_]{10,}$/.test(tok)) return toast.error("Token inválido");
    if (!/^[A-Za-z0-9-_]{10,}$/.test(ct)) return toast.error("Client Token inválido");

    try {
      await waService.createSession(companyId, {
        name: form.name.trim(),
        provider: "zapi",
        credentials: { instance_id: inst, token: tok, client_token: ct },
        is_default: (data?.length ?? 0) === 0,
      } as any);
      toast.success("Conexão Z-API criada");
      setOpen(false);
      setForm({ name: "", instance_id: "", token: "", client_token: "" });
      qc.invalidateQueries({ queryKey: ["wa", "sessions", companyId, "zapi"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta conexão?")) return;
    await waService.deleteSession(id);
    qc.invalidateQueries({ queryKey: ["wa", "sessions", companyId, "zapi"] });
  }

  function openEdit(s: any) {
    setEditing({
      id: s.id,
      name: s.name ?? "",
      instance_id: s.credentials?.instance_id ?? "",
      token: s.credentials?.token ?? "",
      client_token: s.credentials?.client_token ?? "",
    });
  }

  async function handleSaveEdit() {
    if (!editing) return;
    const inst = editing.instance_id.trim();
    const tok = editing.token.trim();
    const ct = editing.client_token.trim();
    if (!/^[A-Za-z0-9-_]{10,}$/.test(inst)) return toast.error("Instance ID inválido");
    if (!/^[A-Za-z0-9-_]{10,}$/.test(tok)) return toast.error("Token inválido");
    if (!/^[A-Za-z0-9-_]{10,}$/.test(ct)) return toast.error("Client Token inválido");
    setSavingEdit(true);
    try {
      await waService.updateSession(editing.id, {
        name: editing.name.trim() || "Z-API",
        credentials: { instance_id: inst, token: tok, client_token: ct },
      } as any);
      toast.success("Token atualizado. Validando com a Z-API...");
      // Invalida e testa
      await qc.invalidateQueries({ queryKey: ["wa", "sessions", companyId, "zapi"] });
      try {
        const st: any = await whatsappService.status();
        if (st?.credentialsError) toast.error("Credenciais inválidas: " + (st.message ?? "verifique os tokens"));
        else if (st?.connected) toast.success("✅ Token validado e WhatsApp conectado!");
        else toast.warning("Token salvo. Instância desconectada — escaneie o QR Code.");
      } catch (e: any) {
        toast.error("Salvo, mas falhou ao validar: " + e.message);
      }
      qc.invalidateQueries({ queryKey: ["wa-status"] });
      qc.invalidateQueries({ queryKey: ["whatsapp"] });
      setEditing(null);
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="space-y-4">
      <WAConnection />
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Instâncias WhatsApp (Z-API)</CardTitle>
            <p className="text-sm text-muted-foreground">Cadastre múltiplos números para atendimento e campanhas</p>
          </div>
          <Button size="sm" onClick={() => setOpen(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />Nova Conexão
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <div className="text-sm text-muted-foreground animate-pulse py-4">Carregando instâncias…</div>}
          
          {data?.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-lg bg-muted/5">
              <Smartphone className="h-10 w-10 text-muted-foreground mb-3 opacity-20" />
              <p className="text-sm text-muted-foreground mb-4">Nenhuma conexão ativa</p>
              <Button onClick={() => setOpen(true)} variant="outline">
                <Plus className="mr-2 h-4 w-4" /> Configurar Primeiro Número
              </Button>
            </div>
          )}

          {data?.map((s) => (
            <div key={s.id} className="group flex items-center justify-between rounded-lg border p-4 bg-card hover:shadow-sm transition-all">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {s.name}
                    {s.is_default && <Badge variant="outline" className="text-[10px] h-4">Padrão</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    ID: {s.credentials?.instance_id?.substring(0, 8)}... • {s.phone_number ?? "Aguardando conexão"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={s.status} />
                <Button size="sm" variant="outline" onClick={() => openEdit(s)} className="gap-1">
                  <KeyRound className="h-3.5 w-3.5" /> Atualizar token
                </Button>
                <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 text-destructive transition-opacity" onClick={() => handleDelete(s.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Atualizar credenciais Z-API</DialogTitle>
            <p className="text-sm text-muted-foreground">Cole os novos valores e salve. Validamos com a Z-API automaticamente.</p>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Instance ID</Label>
                <Input value={editing.instance_id} onChange={(e) => setEditing({ ...editing, instance_id: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Instance Token</Label>
                <Input value={editing.token} onChange={(e) => setEditing({ ...editing, token: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Client Token (Account Security Token)</Label>
                <Input value={editing.client_token} onChange={(e) => setEditing({ ...editing, client_token: e.target.value })} />
                <p className="text-[10px] text-muted-foreground">Obrigatório para todas as chamadas Z-API.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={savingEdit}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : "Salvar e validar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Configuração de Webhook
          </CardTitle>
          <p className="text-sm text-muted-foreground">Copie e cole a URL abaixo no painel da Z-API para receber mensagens em tempo real</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL do Webhook (Global)</Label>
            <div className="flex gap-2">
              <Input readOnly value={WEBHOOK_URL} className="font-mono text-xs bg-muted/50" />
              <Button variant="outline" size="icon" onClick={() => copy(WEBHOOK_URL)}><Copy className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-700 space-y-2 border border-blue-100">
            <p className="font-bold uppercase tracking-wider">Passo a Passo na Z-API:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Acesse sua instância no painel da Z-API</li>
              <li>Vá no menu <strong>Webhooks</strong></li>
              <li>Cole a URL acima no campo <strong>URL do Webhook</strong></li>
              <li>Ative os eventos: <strong>on-message-received</strong>, <strong>on-message-send</strong> e <strong>on-whatsapp-disconnected</strong></li>
              <li>Clique em <strong>Salvar</strong></li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Nova Conexão Z-API</DialogTitle>
            <p className="text-sm text-muted-foreground">Insira as credenciais da sua instância Z-API</p>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome Amigável</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: WhatsApp Vendas" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inst">Instance ID</Label>
              <Input id="inst" value={form.instance_id} onChange={(e) => setForm({ ...form, instance_id: e.target.value })} placeholder="3B..." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tok">Instance Token</Label>
              <Input id="tok" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} placeholder="Token da Instância" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ct">Client Token (Account Token)</Label>
              <Input id="ct" value={form.client_token} onChange={(e) => setForm({ ...form, client_token: e.target.value })} placeholder="Faf..." />
              <p className="text-[10px] text-muted-foreground">Segurança → Account Security Token no painel Z-API</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Salvar Conexão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================================================
   ABA 2 — Meta Cloud API
   ============================================================ */
function genVerifyToken() {
  return "saconnect-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function MetaTab({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [lastVerify, setLastVerify] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone_number_id: "",
    waba_id: "",
    access_token: "",
    app_id: "",
    app_secret: "",
    webhook_verify_token: genVerifyToken(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["wa", "sessions", companyId, "meta"],
    queryFn: async () => (await waService.listSessions(companyId)).filter((s) => s.provider === "meta"),
  });

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copiado");
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.phone_number_id || !form.access_token) {
      return toast.error("Preencha nome, Phone Number ID e Access Token");
    }
    try {
      await waService.createSession(companyId, {
        name: form.name.trim(),
        provider: "meta",
        credentials: {
          phone_number_id: form.phone_number_id,
          waba_id: form.waba_id,
          access_token: form.access_token,
          app_id: form.app_id,
          app_secret: form.app_secret,
          webhook_verify_token: form.webhook_verify_token,
        },
      } as any);
      toast.success("Conexão Meta criada");
      setLastVerify(form.webhook_verify_token);
      setOpen(false);
      setForm({
        name: "", phone_number_id: "", waba_id: "", access_token: "",
        app_id: "", app_secret: "", webhook_verify_token: genVerifyToken(),
      });
      qc.invalidateQueries({ queryKey: ["wa", "sessions", companyId, "meta"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta conexão?")) return;
    await waService.deleteSession(id);
    qc.invalidateQueries({ queryKey: ["wa", "sessions", companyId, "meta"] });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">API Oficial</CardTitle>
            <p className="text-sm text-muted-foreground">
              Conecte números verificados pela Meta para envio de templates e atendimento oficial
            </p>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />Nova Conexão Meta
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
          {data?.length === 0 && (
            <div className="text-sm text-muted-foreground">Nenhuma conexão Meta. Clique em "Nova Conexão Meta".</div>
          )}
          {data?.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-3">
                <BadgeCheck className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Phone ID: {s.credentials?.phone_number_id ?? "—"} • WABA: {s.credentials?.waba_id ?? "—"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={s.status} />
                <Button size="icon" variant="ghost" onClick={() => handleDelete(s.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <WebhookInstructions
        verifyToken={lastVerify ?? data?.[0]?.credentials?.webhook_verify_token ?? "—"}
        onCopy={copy}
      />

      <MetaTemplatesCard companyId={companyId} sessionId={data?.[0]?.id ?? null} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Conexão Meta</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <Field label="Nome da Conexão" v={form.name} on={(v) => setForm({ ...form, name: v })} ph="Número Oficial SA CONNECT" />
            <Field label="Phone Number ID" v={form.phone_number_id} on={(v) => setForm({ ...form, phone_number_id: v })} />
            <Field label="WABA ID" v={form.waba_id} on={(v) => setForm({ ...form, waba_id: v })} />
            <Field label="Access Token" v={form.access_token} on={(v) => setForm({ ...form, access_token: v })} />
            <Field label="App ID" v={form.app_id} on={(v) => setForm({ ...form, app_id: v })} />
            <Field label="App Secret" v={form.app_secret} on={(v) => setForm({ ...form, app_secret: v })} />
            <Field label="Webhook Verify Token" v={form.webhook_verify_token} on={(v) => setForm({ ...form, webhook_verify_token: v })} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Salvar e Verificar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, v, on, ph }: { label: string; v: string; on: (v: string) => void; ph?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={v} onChange={(e) => on(e.target.value)} placeholder={ph} />
    </div>
  );
}

function WebhookInstructions({ verifyToken, onCopy }: { verifyToken: string; onCopy: (s: string) => void }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Configurar Webhook no Meta for Developers</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <Label>URL do Webhook</Label>
          <div className="flex gap-2">
            <Input readOnly value={WEBHOOK_URL} />
            <Button variant="outline" size="icon" onClick={() => onCopy(WEBHOOK_URL)}><Copy className="h-4 w-4" /></Button>
          </div>
        </div>
        <div>
          <Label>Verify Token</Label>
          <div className="flex gap-2">
            <Input readOnly value={verifyToken} />
            <Button variant="outline" size="icon" onClick={() => onCopy(verifyToken)}><Copy className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="text-muted-foreground">
          Campos para assinar: <code>messages</code>, <code>messaging_postbacks</code>
        </div>
      </CardContent>
    </Card>
  );
}

function MetaTemplatesCard({ companyId, sessionId }: { companyId: string; sessionId: string | null }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["wa", "meta_templates", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("whatsapp_meta_templates")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  async function sync() {
    if (!sessionId) return toast.error("Crie uma conexão Meta antes");
    toast.info("Sincronização disponível após configurar a edge function meta-sync-templates");
    qc.invalidateQueries({ queryKey: ["wa", "meta_templates", companyId] });
  }

  function badge(status: string) {
    const map: Record<string, "default" | "secondary" | "destructive"> = {
      APPROVED: "default", PENDING: "secondary", REJECTED: "destructive",
    };
    return <Badge variant={map[status] ?? "secondary"}>{status}</Badge>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Templates Aprovados (Meta)</CardTitle>
        <Button size="sm" variant="outline" onClick={sync}>
          <RefreshCw className="mr-2 h-4 w-4" />Sincronizar Templates
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
        {data?.length === 0 && <div className="text-sm text-muted-foreground">Nenhum template sincronizado.</div>}
        {data?.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="font-medium">{t.template_name}</div>
              <div className="text-xs text-muted-foreground">
                {t.category ?? "—"} • {t.language ?? "pt_BR"}
              </div>
            </div>
            {badge(t.status ?? "PENDING")}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { v: "default" | "secondary" | "destructive"; label: string }> = {
    connected: { v: "default", label: "Conectado" },
    disconnected: { v: "destructive", label: "Desconectado" },
    qr_pending: { v: "secondary", label: "QR Code" },
    connecting: { v: "secondary", label: "Conectando" },
  };
  const m = map[status] ?? { v: "secondary" as const, label: status };
  return <Badge variant={m.v}>{m.label}</Badge>;
}
