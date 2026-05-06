import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Smartphone, Trash2, Copy, BadgeCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useTenantGate } from "../hooks/useTenantGate";
import { waService } from "../services/waService";
import { supabase } from "@/integrations/supabase/client";

const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;

export default function WASessions() {
  const { companyId } = useTenantGate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "meta" ? "meta" : "zapi";

  if (!companyId) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Selecione uma empresa para gerenciar as conexões WhatsApp.
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })} className="space-y-4">
      <TabsList>
        <TabsTrigger value="zapi">WhatsApp</TabsTrigger>
        <TabsTrigger value="meta">API Oficial</TabsTrigger>
      </TabsList>
      <TabsContent value="zapi"><ZapiTab companyId={companyId} /></TabsContent>
      <TabsContent value="meta"><MetaTab companyId={companyId} /></TabsContent>
    </Tabs>
  );
}

/* ============================================================
   ABA 1 — Z-API
   ============================================================ */
function ZapiTab({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", instance_id: "", token: "", client_token: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["wa", "sessions", companyId, "zapi"],
    queryFn: async () => (await waService.listSessions(companyId)).filter((s) => s.provider === "zapi"),
  });

  async function handleCreate() {
    if (!form.name.trim()) return toast.error("Informe um nome");
    try {
      await waService.createSession(companyId, {
        name: form.name.trim(),
        provider: "zapi",
        credentials: {
          instance_id: form.instance_id,
          token: form.token,
          client_token: form.client_token,
        },
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-lg">WhatsApp</CardTitle>
          <p className="text-sm text-muted-foreground">Conecte números via Z-API para atendimento e disparos</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />Nova Conexão Z-API
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
        {data?.length === 0 && (
          <div className="text-sm text-muted-foreground">Nenhuma conexão Z-API. Clique em "Nova Conexão Z-API".</div>
        )}
        {data?.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-md border p-3">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.phone_number ?? "sem número"}</div>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Conexão Z-API</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome da Conexão</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Atendimento Principal" />
            </div>
            <div>
              <Label>Instance ID</Label>
              <Input value={form.instance_id} onChange={(e) => setForm({ ...form, instance_id: e.target.value })} />
            </div>
            <div>
              <Label>Token</Label>
              <Input value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} />
            </div>
            <div>
              <Label>Client Token</Label>
              <Input value={form.client_token} onChange={(e) => setForm({ ...form, client_token: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Salvar e Conectar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
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
