import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, ExternalLink, KeyRound, Pencil, QrCode, Unplug, FlaskConical, ShieldCheck, Phone } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { QRCodeSVG } from "qrcode.react";
import SAConnectDataTesteTelefone from "@/modules/configuracoes/components/AssertivaTesteTelefone";

type Provider = {
  id: string;
  nome: string;
  categoria: string;
  configurado: boolean;
  conectado: boolean;
  detalhe: string;
  testado_em: string;
  ultimas_consultas?: number;
};

const docs: Record<string, { url: string; secret: string; comoObter: string }> = {
  infosimples: {
    url: "https://api.infosimples.com",
    secret: "INFOSIMPLES_TOKEN",
    comoObter:
      "Crie/entre na conta em api.infosimples.com → Configurações → Token de Acesso e copie o valor.",
  },
  enriquecimento: {
    url: "",
    secret: "ANALISE_ELEITORAL_API_KEY",
    comoObter: "Solicite a API key do provedor de enriquecimento contratado.",
  },
  zapi: {
    url: "https://app.z-api.io",
    secret: "ZAPI_INSTANCE_ID, ZAPI_INSTANCE_TOKEN, ZAPI_CLIENT_TOKEN",
    comoObter:
      "No painel Z-API, copie Instance ID, Token e Client-Token da instância e configure os 3 secrets.",
  },
  meta_whatsapp: {
    url: "https://developers.facebook.com/apps",
    secret: "META_APP_ID, META_APP_SECRET",
    comoObter:
      "Em developers.facebook.com, abra seu App → Configurações → Básico e copie App ID e App Secret.",
  },
  lovable_ai: {
    url: "",
    secret: "LOVABLE_API_KEY",
    comoObter: "Gerenciado automaticamente pelo Lovable Cloud — não precisa configurar.",
  },
  twilio: {
    url: "https://console.twilio.com",
    secret: "TWILIO_API_KEY",
    comoObter: "No Console Twilio → Account → API Keys, gere uma chave e cole aqui.",
  },
  google_tickets: {
    url: "https://console.cloud.google.com",
    secret: "OAuth (gerenciado)",
    comoObter:
      "Autenticação por usuário via OAuth Google, feita no módulo de Tickets — sem secret manual.",
  },
};

export function IntegracoesPanel() {
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["analise-integracoes"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("analise-integracao-status", {
        body: {},
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { providers: Provider[] };
    },
  });

  const conectar = (secret: string) => {
    toast.message(
      `Para conectar, configure o secret ${secret} em Lovable Cloud → Secrets.`,
      { description: "Após salvar o token, clique em 'Testar conexão' abaixo." },
    );
  };

  const [testando, setTestando] = useState<string | null>(null);
  // Teste manual de enriquecimento por CPF
  const [enrichTestOpen, setEnrichTestOpen] = useState(false);
  const [enrichPhoneTestOpen, setEnrichPhoneTestOpen] = useState(false);
  // Validação de credenciais OAuth2 (Client ID/Secret) sem precisar salvar
  const [credValidateOpen, setCredValidateOpen] = useState(false);
  const [credClientId, setCredClientId] = useState("");
  const [credClientSecret, setCredClientSecret] = useState("");
  const [credLoading, setCredLoading] = useState(false);
  const [credResult, setCredResult] = useState<any>(null);
  const [credSaving, setCredSaving] = useState(false);
  const [credSaved, setCredSaved] = useState(false);
  const [enrichCpf, setEnrichCpf] = useState("");
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [enrichResult, setEnrichResult] = useState<any>(null);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [enrichErrorMeta, setEnrichErrorMeta] = useState<{
    http_status?: number;
    oauth_endpoint?: string | null;
    provedor?: string | null;
    dica?: string | null;
    details?: unknown;
  } | null>(null);
  const [zapiEditOpen, setZapiEditOpen] = useState(false);
  const [zapiDisconnectOpen, setZapiDisconnectOpen] = useState(false);
  const [zapiForm, setZapiForm] = useState({ instance_id: "", token: "", client_token: "" });
  const [zapiSaving, setZapiSaving] = useState(false);
  const [zapiTestOpen, setZapiTestOpen] = useState(false);
  const [zapiTestResult, setZapiTestResult] = useState<{
    ok: boolean;
    title: string;
    message: string;
    state: "success" | "warning" | "error";
    canRefreshQr?: boolean;
    raw: unknown;
  } | null>(null);
  const [zapiQrOpen, setZapiQrOpen] = useState(false);
  const [zapiQrLoading, setZapiQrLoading] = useState(false);
  const [zapiQrResult, setZapiQrResult] = useState<{
    ok: boolean;
    connected: boolean;
    message: string;
    qrImage: string | null;
    qrCode: string | null;
    raw: unknown;
  } | null>(null);
  const REFRESH_INTERVAL_SECONDS = 8;
  const [zapiQrCountdown, setZapiQrCountdown] = useState(REFRESH_INTERVAL_SECONDS);
  const [zapiAutoRefresh, setZapiAutoRefresh] = useState(true);
  const zapiRefreshingRef = useRef(false);

  const getCompanyId = async (): Promise<string | null> => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const { data } = await supabase.rpc("user_default_company", { _user_id: u.user.id });
    return (data as string) ?? null;
  };

  const openZapiEdit = async () => {
    const companyId = await getCompanyId();
    if (!companyId) {
      toast.error("Empresa não encontrada");
      return;
    }
    const { data: sess } = await (supabase as any)
      .from("whatsapp_sessions")
      .select("credentials")
      .eq("company_id", companyId)
      .eq("provider", "zapi")
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle();
    const c = (sess?.credentials ?? {}) as Record<string, string>;
    setZapiForm({
      instance_id: c.instance_id ?? "",
      token: c.token ?? "",
      client_token: c.client_token ?? "",
    });
    setZapiEditOpen(true);
  };

  const saveZapi = async () => {
    if (!zapiForm.instance_id.trim() || !zapiForm.token.trim() || !zapiForm.client_token.trim()) {
      toast.error("Preencha Instance ID, Token e Client-Token");
      return;
    }
    setZapiSaving(true);
    try {
      const companyId = await getCompanyId();
      if (!companyId) throw new Error("Empresa não encontrada");
      const credentials = {
        instance_id: zapiForm.instance_id.trim(),
        token: zapiForm.token.trim(),
        client_token: zapiForm.client_token.trim(),
      };
      const { data: existing } = await (supabase as any)
        .from("whatsapp_sessions")
        .select("id")
        .eq("company_id", companyId)
        .eq("provider", "zapi")
        .order("is_default", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing?.id) {
        const { error } = await (supabase as any)
          .from("whatsapp_sessions")
          .update({ credentials, status: "disconnected" })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("whatsapp_sessions")
          .insert({
            company_id: companyId,
            name: "Z-API",
            provider: "zapi",
            status: "disconnected",
            credentials,
            is_default: true,
          });
        if (error) throw error;
      }
      toast.success("Credenciais salvas");
      setZapiEditOpen(false);
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setZapiSaving(false);
    }
  };

  const disconnectZapi = async () => {
    try {
      const companyId = await getCompanyId();
      if (!companyId) throw new Error("Empresa não encontrada");

      // Best-effort: tenta desconectar a instância no Z-API antes de remover as credenciais.
      try { await callZapiStatusAction("disconnect"); } catch { /* ignora — pode já estar inválida */ }

      const { error } = await (supabase as any)
        .from("whatsapp_sessions")
        .delete()
        .eq("company_id", companyId)
        .eq("provider", "zapi");
      if (error) throw error;

      // Limpa estados locais para a UI ficar realmente "zerada".
      setZapiForm({ instance_id: "", token: "", client_token: "" });
      setZapiTestResult(null);
      setZapiQrResult(null);
      setZapiQrOpen(false);
      setZapiTestOpen(false);

      toast.success("Conexão Z-API excluída. Configuração limpa.");
      setZapiDisconnectOpen(false);
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao desconectar");
    }
  };

  const callZapiStatusAction = async (action: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Sessão expirada. Faça login novamente.");

    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zapi-status?action=${action}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    });

    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const message = (json as any)?.error ?? (json as any)?.message ?? (json as any)?.data?.error ?? `Falha (${resp.status})`;
      throw new Error(message);
    }

    return json as any;
  };

  const normalizeQrImage = (value: unknown) => {
    if (typeof value === "string" && value.length > 0) {
      return value.startsWith("data:") ? value : `data:image/png;base64,${value}`;
    }
    if (value && typeof value === "object") {
      const raw = (value as Record<string, unknown>).value;
      if (typeof raw === "string" && raw.length > 0) {
        return raw.startsWith("data:") ? raw : `data:image/png;base64,${raw}`;
      }
    }
    return null;
  };

  const getZapiDisplayMessage = (payload: any, fallback: string) => {
    const rawMessage = payload?.status?.message ?? payload?.status?.error ?? payload?.message;

    if (typeof rawMessage === "string" && /you are not connected\.?/i.test(rawMessage)) {
      return "A instância respondeu, mas o WhatsApp ainda não está conectado. Atualize e escaneie o QR Code para continuar.";
    }

    return typeof rawMessage === "string" && rawMessage.trim().length > 0 ? rawMessage : fallback;
  };

  const atualizarQrCodeZapi = async (opts?: { silent?: boolean; openDialog?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (zapiRefreshingRef.current) return;
    zapiRefreshingRef.current = true;
    if (opts?.openDialog ?? !silent) setZapiQrOpen(true);
    if (!silent) {
      setZapiQrLoading(true);
      setZapiQrResult(null);
    }

    try {
      let status = await callZapiStatusAction("status");

      if (status?.credentialsError) {
        setZapiQrResult({
          ok: false,
          connected: false,
          message: status?.message ?? "Credenciais Z-API inválidas.",
          qrImage: null,
          qrCode: null,
          raw: status,
        });
        return;
      }

      if (status?.connected) {
        setZapiQrResult({
          ok: true,
          connected: true,
          message: "O WhatsApp já está conectado nesta instância.",
          qrImage: null,
          qrCode: null,
          raw: status,
        });
        return;
      }

      let qrImage = normalizeQrImage(status?.qrImage);

      if (!qrImage) {
        await callZapiStatusAction("restart");

        for (let tentativa = 0; tentativa < 3; tentativa += 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          status = await callZapiStatusAction("status");
          if (status?.connected || status?.credentialsError || status?.qrImage) break;
        }

        if (status?.credentialsError) {
          setZapiQrResult({
            ok: false,
            connected: false,
            message: status?.message ?? "Credenciais Z-API inválidas.",
            qrImage: null,
            qrCode: null,
            raw: status,
          });
          return;
        }

        qrImage = normalizeQrImage(status?.qrImage);
      }

      if (!qrImage && !status?.connected) {
        const qrResponse = await callZapiStatusAction("qr-code-image");
        qrImage = normalizeQrImage(qrResponse?.data);

        setZapiQrResult({
          ok: !!(qrImage || status?.qrCode),
          connected: false,
          message: (qrImage || status?.qrCode)
            ? "Escaneie o QR Code atualizado no WhatsApp para reconectar."
            : getZapiDisplayMessage(status, "Não foi possível gerar um novo QR Code agora."),
          qrImage,
          qrCode: typeof status?.qrCode === "string" ? status.qrCode : null,
          raw: { status, qrResponse },
        });
        return;
      }

      setZapiQrResult({
        ok: true,
        connected: false,
        message: "Escaneie o QR Code atualizado no WhatsApp para reconectar.",
        qrImage,
        qrCode: typeof status?.qrCode === "string" ? status.qrCode : null,
        raw: status,
      });
    } catch (e) {
      setZapiQrResult({
        ok: false,
        connected: false,
        message: e instanceof Error ? e.message : "Falha ao atualizar o QR Code.",
        qrImage: null,
        qrCode: null,
        raw: e,
      });
    } finally {
      setZapiQrLoading(false);
      setZapiQrCountdown(REFRESH_INTERVAL_SECONDS);
      zapiRefreshingRef.current = false;
      await refetch();
    }
  };

  // Auto-refresh do QR Code a cada N segundos enquanto o modal está aberto e não conectado
  useEffect(() => {
    if (!zapiQrOpen) return;
    if (!zapiAutoRefresh) return;
    if (zapiQrResult?.connected) return;

    const interval = setInterval(() => {
      setZapiQrCountdown((prev) => {
        if (prev <= 1) {
          atualizarQrCodeZapi({ silent: true });
          return REFRESH_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zapiQrOpen, zapiAutoRefresh, zapiQrResult?.connected]);

  // Reseta contador ao abrir o modal
  useEffect(() => {
    if (zapiQrOpen) setZapiQrCountdown(REFRESH_INTERVAL_SECONDS);
  }, [zapiQrOpen]);

  const testarConexao = async (providerId: string) => {
    setTestando(providerId);
    try {
      if (providerId === "enriquecimento") {
        const { data, error } = await supabase.functions.invoke("analise-enriquecimento", {
          body: { ping: true },
        });
        if (error) throw error;
        const r = data as any;
        if (r?.ok) {
          const provLabel = (r.provedor ?? "").toString().toLowerCase() === "assertiva" ? "SA Connect Data" : r.provedor;
          toast.success(r.mensagem ?? "Conexão validada", {
            description: `Modo: ${r.modo} · ${provLabel} · ${r.duracao_ms}ms`,
          });
        } else {
          const provLabel = (r?.provedor ?? "").toString().toLowerCase() === "assertiva" ? "SA Connect Data" : r?.provedor;
          toast.error(r?.erro ?? r?.mensagem ?? "Falha ao validar conexão", {
            description: r?.provedor ? `${provLabel} · HTTP ${r.http_status ?? "?"}` : undefined,
          });
        }
      }
      if (providerId === "zapi") {
        const { data, error } = await supabase.functions.invoke("zapi-status", {
          body: {},
        });
        const r = (data ?? {}) as any;
        if (error) {
          setZapiTestResult({
            ok: false,
            title: "Falha ao chamar zapi-status",
            message: error.message ?? "Erro desconhecido",
            state: "error",
            raw: error,
          });
        } else if (r?.credentialsError) {
          setZapiTestResult({
            ok: false,
            title: "Credenciais Z-API inválidas",
            message: r?.message ?? "Verifique Instance ID, Token e Client-Token.",
            state: "error",
            raw: r,
          });
        } else if (r?.connected) {
          setZapiTestResult({
            ok: true,
            title: "Conectado ✅",
            message: "A instância Z-API está conectada e respondendo.",
            state: "success",
            raw: r,
          });
        } else {
          setZapiTestResult({
            ok: false,
            title: "Aguardando conexão",
            message: getZapiDisplayMessage(
              r,
              "A instância respondeu, mas o WhatsApp ainda não está conectado. Atualize e escaneie o QR Code para continuar.",
            ),
            state: "warning",
            canRefreshQr: true,
            raw: r,
          });
        }
        setZapiTestOpen(true);
      }
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao testar conexão");
    } finally {
      setTestando(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">APIs externas</h2>
          <p className="text-sm text-muted-foreground">
            Conecte e teste manualmente as integrações usadas pelo sistema.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>
      {(() => {
        const grupos: Record<string, Provider[]> = {};
        for (const p of data?.providers ?? []) {
          (grupos[p.categoria] ??= []).push(p);
        }
        const ordem = Object.keys(grupos);
        if (ordem.length === 0) {
          return (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                {isFetching ? "Verificando integrações…" : "Nenhuma integração disponível."}
              </CardContent>
            </Card>
          );
        }
        return ordem.map((cat) => (
          <div key={cat} className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {cat}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {grupos[cat].map((p) => {
          const meta = docs[p.id];
          const StatusIcon = p.conectado
            ? CheckCircle2
            : p.configurado
              ? AlertCircle
              : XCircle;
          const statusColor = p.conectado
            ? "text-green-600"
            : p.configurado
              ? "text-amber-600"
              : "text-destructive";
          return (
            <Card key={p.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-base">{p.nome}</CardTitle>
                  <p className="text-xs text-muted-foreground break-all">
                    Secret(s): <code className="font-mono">{meta?.secret ?? "—"}</code>
                  </p>
                </div>
                <Badge variant={p.conectado ? "default" : p.configurado ? "secondary" : "outline"}>
                  <StatusIcon className={`h-3 w-3 mr-1 ${statusColor}`} />
                  {p.conectado ? "Conectado" : p.configurado ? "Pendente" : "Desconectado"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className={`text-sm ${statusColor}`}>{p.detalhe}</p>
                {meta?.comoObter && (
                  <p className="text-xs text-muted-foreground leading-snug">{meta.comoObter}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (p.id === "zapi") return openZapiEdit();
                      if (p.id === "enriquecimento") {
                        setCredResult(null);
                        setCredSaved(false);
                        setCredClientId("");
                        setCredClientSecret("");
                        setCredValidateOpen(true);
                        return;
                      }
                      conectar(meta?.secret ?? "");
                    }}
                  >
                    <KeyRound className="h-3 w-3 mr-1" />
                    {p.configurado ? "Atualizar token" : "Conectar"}
                  </Button>
                  {p.id === "zapi" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => atualizarQrCodeZapi()}
                        disabled={zapiQrLoading}
                      >
                        <QrCode className={`h-3 w-3 mr-1 ${zapiQrLoading ? "animate-pulse" : ""}`} />
                        {zapiQrLoading ? "Atualizando QR…" : "Atualizar QR Code"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={openZapiEdit}>
                        <Pencil className="h-3 w-3 mr-1" />
                        Editar dados
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => testarConexao("zapi")}
                        disabled={testando === "zapi"}
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${testando === "zapi" ? "animate-spin" : ""}`} />
                        {testando === "zapi" ? "Testando…" : "Testar conexão Z-API"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setZapiDisconnectOpen(true)}
                      >
                        <Unplug className="h-3 w-3 mr-1" />
                        Excluir conexão
                      </Button>
                    </>
                  )}
                  {p.id !== "zapi" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testarConexao(p.id)}
                      disabled={testando === p.id}
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${testando === p.id ? "animate-spin" : ""}`} />
                      {testando === p.id ? "Testando…" : "Testar conexão"}
                    </Button>
                  )}
                  {p.id === "enriquecimento" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEnrichResult(null);
                        setEnrichError(null);
                        setEnrichTestOpen(true);
                      }}
                    >
                      <FlaskConical className="h-3 w-3 mr-1" />
                      Testar com CPF
                    </Button>
                  )}
                  {p.id === "enriquecimento" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEnrichPhoneTestOpen(true)}
                    >
                      <Phone className="h-3 w-3 mr-1" />
                      Testar com telefone
                    </Button>
                  )}
                  {p.id === "enriquecimento" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCredResult(null);
                        setCredClientId("");
                        setCredClientSecret("");
                        setCredValidateOpen(true);
                      }}
                    >
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Validar credenciais
                    </Button>
                  )}
                  {meta?.url && (
                    <Button size="sm" variant="ghost" asChild>
                      <a href={meta.url} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3 w-3 mr-1" /> Abrir provedor
                      </a>
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {p.ultimas_consultas !== undefined && (
                    <>Consultas (30d): <strong>{p.ultimas_consultas}</strong> · </>
                  )}
                  Testado em {new Date(p.testado_em).toLocaleString("pt-BR")}
                </p>
              </CardContent>
            </Card>
          );
              })}
            </div>
          </div>
        ));
      })()}

      <Dialog open={zapiEditOpen} onOpenChange={setZapiEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar credenciais Z-API</DialogTitle>
            <DialogDescription>
              Cole os 3 valores da sua instância no painel Z-API.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="zapi-instance">Instance ID</Label>
              <Input
                id="zapi-instance"
                value={zapiForm.instance_id}
                onChange={(e) => setZapiForm((f) => ({ ...f, instance_id: e.target.value }))}
                placeholder="3xxxxxxxxxxxxxx"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="zapi-token">Instance Token</Label>
              <Input
                id="zapi-token"
                value={zapiForm.token}
                onChange={(e) => setZapiForm((f) => ({ ...f, token: e.target.value }))}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="zapi-client">Client-Token</Label>
              <Input
                id="zapi-client"
                value={zapiForm.client_token}
                onChange={(e) => setZapiForm((f) => ({ ...f, client_token: e.target.value }))}
                placeholder="Fxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setZapiEditOpen(false)} disabled={zapiSaving}>
              Cancelar
            </Button>
            <Button onClick={saveZapi} disabled={zapiSaving}>
              {zapiSaving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={zapiDisconnectOpen} onOpenChange={setZapiDisconnectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conexão Z-API?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove a sessão e as credenciais salvas (Instance ID, Token e Client-Token) desta integração.
              Você poderá configurar a Z-API do zero em seguida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={disconnectZapi}>Excluir conexão</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={zapiQrOpen} onOpenChange={setZapiQrOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>QR Code da Z-API</DialogTitle>
            <DialogDescription>
              Atualize e escaneie este QR Code no WhatsApp para reconectar a instância.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {zapiQrResult?.connected ? (
              <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-lg border border-green-500/40 bg-green-500/10 p-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
                <p className="text-base font-semibold text-green-700">WhatsApp conectado com sucesso! ✅</p>
                <p className="text-sm text-muted-foreground">
                  {zapiQrResult.message}
                </p>
              </div>
            ) : zapiQrLoading && !zapiQrResult ? (
              <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/30 p-6 text-center">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <p className="text-sm text-muted-foreground">Gerando um novo QR Code…</p>
              </div>
            ) : zapiQrResult?.qrImage || zapiQrResult?.qrCode ? (
              <div className="grid gap-4 md:grid-cols-[280px,1fr] md:items-center">
                <div className="flex justify-center">
                  {zapiQrResult.qrImage ? (
                    <img
                      src={zapiQrResult.qrImage}
                      alt="QR Code atualizado da instância Z-API"
                      className="h-64 w-64 rounded-lg border bg-white p-2"
                    />
                  ) : (
                    <div className="rounded-lg border bg-white p-3">
                      <QRCodeSVG value={zapiQrResult.qrCode ?? ""} size={240} />
                    </div>
                  )}
                </div>
                <div className="space-y-3 text-sm">
                  <p>{zapiQrResult.message}</p>
                  <ol className="list-inside list-decimal space-y-1 text-muted-foreground">
                    <li>Abra o WhatsApp no celular.</li>
                    <li>Entre em <strong>Aparelhos conectados</strong>.</li>
                    <li>Toque em <strong>Conectar um aparelho</strong>.</li>
                    <li>Escaneie o QR Code exibido aqui.</li>
                  </ol>
                  <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1.5 text-xs">
                    <RefreshCw className={`h-3 w-3 ${zapiQrLoading ? "animate-spin" : ""}`} />
                    {zapiAutoRefresh ? (
                      <span>
                        Atualizando em <strong>{zapiQrCountdown}s</strong>… aguardando conexão.
                      </span>
                    ) : (
                      <span>Auto-atualização pausada.</span>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto h-6 px-2 text-xs"
                      onClick={() => setZapiAutoRefresh((v) => !v)}
                    >
                      {zapiAutoRefresh ? "Pausar" : "Retomar"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border p-4">
                <p className="text-sm text-foreground">{zapiQrResult?.message ?? "Nenhum QR Code disponível."}</p>
                {zapiQrResult?.connected && (
                  <p className="text-sm text-muted-foreground">A instância já está conectada, então não foi necessário gerar um novo QR.</p>
                )}
                {!zapiQrResult?.connected && (
                  <div className="space-y-1">
                    <Label>Resposta detalhada</Label>
                    <pre className="max-h-56 overflow-auto rounded border bg-muted p-2 text-xs">
{JSON.stringify(zapiQrResult?.raw ?? {}, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setZapiQrOpen(false)}>Fechar</Button>
            <Button onClick={() => atualizarQrCodeZapi()} disabled={zapiQrLoading}>
              <QrCode className="h-4 w-4 mr-1" />
              {zapiQrLoading ? "Atualizando…" : "Gerar novamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={zapiTestOpen} onOpenChange={setZapiTestOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {zapiTestResult?.state === "success"
                ? "Teste Z-API · Sucesso"
                : zapiTestResult?.state === "warning"
                  ? "Teste Z-API · Aguardando conexão"
                  : "Teste Z-API · Falha"}
            </DialogTitle>
            <DialogDescription>{zapiTestResult?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className={`text-sm ${zapiTestResult?.state === "error" ? "text-destructive" : "text-foreground"}`}>
              {zapiTestResult?.message}
            </p>
            {(() => {
              const raw = zapiTestResult?.raw as any;
              const qrImage = normalizeQrImage(raw?.qrImage);
              if (zapiTestResult?.state === "warning" && qrImage) {
                return (
                  <div className="flex flex-col items-center gap-2 rounded border bg-background p-3">
                    <Label>QR Code · escaneie no WhatsApp</Label>
                    <img
                      src={qrImage}
                      alt="QR Code Z-API"
                      className="h-56 w-56 rounded border bg-white p-2"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Abra o WhatsApp → Aparelhos conectados → Conectar um aparelho.
                    </p>
                  </div>
                );
              }
              return null;
            })()}
            <div className="space-y-1">
              <Label>Resposta detalhada</Label>
              <pre className="max-h-72 overflow-auto rounded border bg-muted p-2 text-xs">
{JSON.stringify(zapiTestResult?.raw ?? {}, null, 2)}
              </pre>
            </div>
          </div>
          <DialogFooter>
            {zapiTestResult?.canRefreshQr ? (
              <Button
                onClick={() => {
                  setZapiTestOpen(false);
                  atualizarQrCodeZapi({ openDialog: true });
                }}
              >
                <QrCode className="h-4 w-4 mr-1" />
                Atualizar QR Code
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setZapiTestOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Teste manual de enriquecimento por CPF */}
      <Dialog open={enrichTestOpen} onOpenChange={setEnrichTestOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Testar enriquecimento por CPF</DialogTitle>
            <DialogDescription>
              Consulta a API SA Connect Data em modo preview (não cria eleitor, não cobra de cota se já houver cache).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="enrich-cpf">CPF</Label>
                <Input
                  id="enrich-cpf"
                  placeholder="000.000.000-00"
                  value={enrichCpf}
                  onChange={(e) => setEnrichCpf(e.target.value)}
                  disabled={enrichLoading}
                />
              </div>
              <Button
                onClick={async () => {
                  const cpf = enrichCpf.replace(/\D/g, "");
                  if (cpf.length !== 11) {
                    toast.error("Informe um CPF com 11 dígitos");
                    return;
                  }
                  setEnrichLoading(true);
                  setEnrichError(null);
                  setEnrichErrorMeta(null);
                  setEnrichResult(null);
                  try {
                    const { data, error } = await supabase.functions.invoke<any>(
                      "analise-enriquecimento",
                      { body: { cpf } },
                    );
                    // Edge function returns 502 com JSON estruturado em caso de falha
                    const ctx = (error as any)?.context;
                    if (ctx) {
                      let parsed: any = null;
                      try {
                        parsed = await ctx.json();
                      } catch {
                        try { parsed = { error: await ctx.text() }; } catch { /* ignore */ }
                      }
                      setEnrichError(parsed?.error ?? parsed?.erro ?? (error as any).message ?? "Falha na consulta");
                      setEnrichErrorMeta({
                        http_status: parsed?.http_status,
                        oauth_endpoint: parsed?.oauth_endpoint,
                        provedor: parsed?.provedor,
                        dica: parsed?.dica,
                        details: parsed?.details,
                      });
                    } else if (error) {
                      throw error;
                    } else if (data?.erro || data?.error) {
                      setEnrichError(data.erro ?? data.error);
                      setEnrichErrorMeta({
                        http_status: data?.http_status,
                        oauth_endpoint: data?.oauth_endpoint,
                        provedor: data?.provedor,
                        dica: data?.dica,
                        details: data?.details,
                      });
                    } else {
                      setEnrichResult(data);
                    }
                  } catch (e) {
                    setEnrichError(e instanceof Error ? e.message : String(e));
                  } finally {
                    setEnrichLoading(false);
                  }
                }}
                disabled={enrichLoading}
              >
                {enrichLoading ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <FlaskConical className="h-4 w-4 mr-1" />
                )}
                Consultar
              </Button>
            </div>

            {enrichError && (
              <div className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm space-y-2">
                <div className="font-medium text-destructive">{enrichError}</div>
                {enrichErrorMeta?.http_status ? (
                  <div className="text-xs text-muted-foreground">
                    HTTP {enrichErrorMeta.http_status}
                    {enrichErrorMeta.provedor ? ` · provedor: ${enrichErrorMeta.provedor}` : ""}
                  </div>
                ) : null}
                {enrichErrorMeta?.oauth_endpoint && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Endpoint OAuth2: </span>
                    <code className="bg-muted px-1 py-0.5 rounded">{enrichErrorMeta.oauth_endpoint}</code>
                  </div>
                )}
                {enrichErrorMeta?.dica && (
                  <div className="text-xs rounded border bg-background/60 p-2 text-foreground">
                    💡 {enrichErrorMeta.dica}
                  </div>
                )}
                {enrichErrorMeta?.details ? (
                  <details className="text-xs">
                    <summary className="cursor-pointer select-none text-muted-foreground">Detalhes da resposta</summary>
                    <pre className="mt-1 max-h-48 overflow-auto bg-muted/40 p-2 rounded">
{JSON.stringify(enrichErrorMeta.details, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </div>
            )}

            {enrichResult && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    ["Nome", enrichResult?.dados?.nome_completo],
                    ["CPF", enrichResult?.dados?.cpf],
                    ["Data nasc.", enrichResult?.dados?.data_nascimento],
                    ["Nome da mãe", enrichResult?.dados?.nome_mae],
                    ["Título eleitoral", enrichResult?.dados?.titulo_eleitoral],
                    ["Município eleitoral", enrichResult?.dados?.municipio_eleitoral],
                    ["E-mail", enrichResult?.dados?.email],
                    ["Logradouro", enrichResult?.dados?.endereco?.logradouro],
                    ["Número", enrichResult?.dados?.endereco?.numero],
                    ["Bairro", enrichResult?.dados?.endereco?.bairro],
                    ["Cidade", enrichResult?.dados?.endereco?.cidade],
                    ["UF", enrichResult?.dados?.endereco?.uf],
                    ["CEP", enrichResult?.dados?.endereco?.cep],
                  ].map(([label, value]) => (
                    <div key={label as string} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{label}</Label>
                      <Input value={(value as string) ?? ""} readOnly placeholder="—" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">Chave: {enrichResult?.chave_busca ?? "?"}</Badge>
                  {enrichResult?.divergencia?.score !== undefined && (
                    <Badge variant="secondary">Score: {enrichResult.divergencia.score}</Badge>
                  )}
                  {enrichResult?.divergencia?.status_sugerido && (
                    <Badge>{enrichResult.divergencia.status_sugerido}</Badge>
                  )}
                  {enrichResult?.oauth_endpoint && (
                    <Badge variant="outline" className="font-mono">
                      OAuth: {new URL(enrichResult.oauth_endpoint).host}
                    </Badge>
                  )}
                </div>
                <details className="rounded border bg-muted/40 p-2 text-xs">
                  <summary className="cursor-pointer select-none">Resposta bruta</summary>
                  <pre className="mt-2 max-h-72 overflow-auto">
{JSON.stringify(enrichResult, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrichTestOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Testar enriquecimento por telefone */}
      <Dialog open={enrichPhoneTestOpen} onOpenChange={setEnrichPhoneTestOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Testar SA Connect Data por telefone</DialogTitle>
            <DialogDescription>
              Consulta o provedor em tempo real e mostra os dados retornados. Nenhum eleitor é alterado.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <SAConnectDataTesteTelefone />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrichPhoneTestOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validar credenciais OAuth2 sem precisar salvar */}
      <Dialog open={credValidateOpen} onOpenChange={setCredValidateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validar credenciais SA Connect Data</DialogTitle>
            <DialogDescription>
              Cole o Client ID e o Client Secret do painel da SA Connect Data para testar o OAuth2 na hora.
              Os valores não são salvos — após validar, peça ao Lovable para atualizar os secrets
              <code className="mx-1">ANALISE_ELEITORAL_API_USER</code> e
              <code className="ml-1">ANALISE_ELEITORAL_API_PASSWORD</code>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="cred-client-id">Client ID</Label>
              <Input
                id="cred-client-id"
                value={credClientId}
                onChange={(e) => setCredClientId(e.target.value)}
                placeholder="ANALISE_ELEITORAL_API_USER"
                autoComplete="off"
                spellCheck={false}
                disabled={credLoading}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cred-client-secret">Client Secret</Label>
              <Input
                id="cred-client-secret"
                type="password"
                value={credClientSecret}
                onChange={(e) => setCredClientSecret(e.target.value)}
                placeholder="ANALISE_ELEITORAL_API_PASSWORD"
                autoComplete="off"
                spellCheck={false}
                disabled={credLoading}
              />
            </div>
            <Button
              className="w-full"
              disabled={credLoading || !credClientId.trim() || !credClientSecret.trim()}
              onClick={async () => {
                setCredLoading(true);
                setCredResult(null);
                setCredSaved(false);
                try {
                  const { data, error } = await supabase.functions.invoke<any>(
                    "analise-enriquecimento",
                    {
                      body: {
                        validate: true,
                        client_id: credClientId.trim(),
                        client_secret: credClientSecret.trim(),
                      },
                    },
                  );
                  if (error) throw error;
                  setCredResult(data);
                  if (data?.ok) {
                    toast.success("Credenciais válidas!");
                  } else {
                    toast.error(data?.erro ?? "Credenciais inválidas");
                  }
                } catch (e) {
                  setCredResult({
                    ok: false,
                    erro: e instanceof Error ? e.message : String(e),
                  });
                  toast.error("Falha ao validar");
                } finally {
                  setCredLoading(false);
                }
              }}
            >
              {credLoading ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4 mr-1" />
              )}
              Validar agora
            </Button>

            {credResult && (
              <div
                className={`rounded border p-3 text-sm space-y-2 ${
                  credResult.ok
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-destructive/40 bg-destructive/10"
                }`}
              >
                <div className="font-medium flex items-center gap-2">
                  {credResult.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  {credResult.ok
                    ? credResult.mensagem ?? "Credenciais válidas"
                    : credResult.erro ?? "Falha na validação"}
                </div>
                {credResult.http_status ? (
                  <div className="text-xs text-muted-foreground">
                    HTTP {credResult.http_status}
                    {credResult.duracao_ms ? ` · ${credResult.duracao_ms}ms` : ""}
                  </div>
                ) : null}
                {credResult.oauth_endpoint && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Endpoint: </span>
                    <code className="bg-muted px-1 py-0.5 rounded">{credResult.oauth_endpoint}</code>
                  </div>
                )}
                {credResult.expires_in && (
                  <div className="text-xs text-muted-foreground">
                    Token expira em {credResult.expires_in}s
                  </div>
                )}
                {credResult.dica && !credResult.ok && (
                  <div className="text-xs rounded border bg-background/60 p-2 text-foreground">
                    💡 {credResult.dica}
                  </div>
                )}
                {credResult.detalhes ? (
                  <details className="text-xs">
                    <summary className="cursor-pointer select-none text-muted-foreground">
                      Resposta do provedor
                    </summary>
                    <pre className="mt-1 max-h-48 overflow-auto bg-muted/40 p-2 rounded">
{JSON.stringify(credResult.detalhes, null, 2)}
                    </pre>
                  </details>
                ) : null}
                {credResult.ok && !credSaved && (
                  <Button
                    className="w-full mt-2"
                    variant="default"
                    disabled={credSaving}
                    onClick={async () => {
                      setCredSaving(true);
                      try {
                        const { data, error } = await supabase.functions.invoke<any>(
                          "analise-enriquecimento",
                          {
                            body: {
                              save_credentials: true,
                              client_id: credClientId.trim(),
                              client_secret: credClientSecret.trim(),
                            },
                          },
                        );
                        if (error) throw error;
                        if (data?.ok) {
                          setCredSaved(true);
                          toast.success("Credenciais salvas! A API já vai usar esses valores.");
                        } else {
                          toast.error(data?.error ?? "Falha ao salvar");
                        }
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Falha ao salvar");
                      } finally {
                        setCredSaving(false);
                      }
                    }}
                  >
                    {credSaving ? (
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <KeyRound className="h-4 w-4 mr-1" />
                    )}
                    Salvar credenciais
                  </Button>
                )}
                {credSaved && (
                  <div className="text-xs text-emerald-700 dark:text-emerald-400 border-t pt-2 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Credenciais salvas e ativas no provedor.
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCredValidateOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default IntegracoesPanel;