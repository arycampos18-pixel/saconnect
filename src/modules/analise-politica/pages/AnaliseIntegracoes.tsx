import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, ExternalLink, KeyRound, Pencil, QrCode, Unplug, FlaskConical, ShieldCheck, Phone, Webhook } from "lucide-react";
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
import { zapiInstanceService } from "@/modules/whatsapp/services/zapiInstanceService";

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

function mensagemErroCarregarIntegracoes(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/** Corpo JSON de functions.invoke quando a Edge devolve 4xx/5xx (Supabase exp?e em error.context). */
async function corpoErroEdgeFunction(err: unknown): Promise<string | null> {
  const ctx = (err as any)?.context;
  if (!ctx) return null;
  try {
    if (typeof ctx.json === "function") {
      const j = await ctx.json();
      if (j && typeof j === "object" && typeof (j as any).error === "string") return (j as any).error;
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof ctx.text === "function") {
      const t = await ctx.text();
      if (t) {
        try {
          const j = JSON.parse(t);
          if (typeof j?.error === "string") return j.error;
        } catch {
          return t.slice(0, 500);
        }
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** R?tulo amig?vel e sem expor hostname comercial do provedor de enriquecimento. */
function rotuloProvedorEnriquecimentoUi(provedor: unknown): string {
  const raw = (provedor ?? "").toString().trim();
  const p = raw.toLowerCase();
  if (!p) return "SA Connect";
  if (p === "assertiva" || p === "mock" || p.includes("assertivasolucoes") || p.includes("provedor-cadastral") || p.includes("sa connect")) {
    return "SA Connect";
  }
  return raw;
}

/** JSON exibido ao usu?rio: remove substring comercial do host do provedor. */
function sanitizarJsonTextoCliente(obj: unknown): string {
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") {
      return /assertivasolucoes/i.test(v) ? v.replace(/assertivasolucoes/gi, "SA Connect") : v;
    }
    if (v === null || typeof v !== "object") return v;
    if (Array.isArray(v)) return v.map(walk);
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, walk(val)]),
    );
  };
  try {
    return JSON.stringify(walk(obj), null, 2);
  } catch {
    return "{}";
  }
}

function ocultarAssertivaEmTextoUi(s: string): string {
  return s.replace(/assertivasolucoes/gi, "SA Connect");
}

const docs: Record<string, { url: string; secret: string; comoObter: string }> = {
  infosimples: {
    url: "",
    secret: "DIRECTD_TOKEN (ou configurado pelo bot˜o Conectar)",
    comoObter:
      "No painel da integra˜˜o ? hist˜rico de consultas ? URL da consulta ? copie o valor do par˜metro TOKEN. Cole abaixo e clique em Salvar token.",
  },
  enriquecimento: {
    url: "",
    secret: "ANALISE_ELEITORAL_API_USER + ANALISE_ELEITORAL_API_PASSWORD (ou tabela analise_provedor_credenciais)",
    comoObter:
      "OAuth2 SA Connect Data / Assertiva: Client ID e Secret no painel do provedor. Pode validar no modal e salvar como super admin, ou definir os secrets em Supabase ? Edge Functions ? Secrets.",
  },
  zapi: {
    url: "https://app.z-api.io",
    secret: "ZAPI_INSTANCE_ID, ZAPI_INSTANCE_TOKEN, ZAPI_CLIENT_TOKEN",
    comoObter:
      "No painel Z-API, copie Instance ID, Token e Client-Token da inst?ncia e configure os 3 secrets.",
  },
  meta_whatsapp: {
    url: "https://developers.facebook.com/apps",
    secret: "META_APP_ID, META_APP_SECRET",
    comoObter:
      "Em developers.facebook.com, abra seu App ? Configura??es ? B?sico e copie App ID e App Secret.",
  },
  lovable_ai: {
    url: "",
    secret: "LOVABLE_API_KEY",
    comoObter: "Gerenciado automaticamente pelo Lovable Cloud ? n?o precisa configurar.",
  },
  twilio: {
    url: "https://console.twilio.com",
    secret: "TWILIO_API_KEY",
    comoObter: "No Console Twilio ? Account ? API Keys, gere uma chave e cole aqui.",
  },
  google_tickets: {
    url: "https://console.cloud.google.com",
    secret: "OAuth (gerenciado)",
    comoObter:
      "Autentica??o por usu?rio via OAuth Google, feita no m?dulo de Tickets ? sem secret manual.",
  },
};

export function IntegracoesPanel() {
  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["analise-integracoes"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("analise-integracao-status", {
        body: {},
      });
      if (error) {
        const detalhe = await corpoErroEdgeFunction(error);
        const base = error.message || "Falha ao chamar analise-integracao-status";
        throw new Error(detalhe ? `${base} ? ${detalhe}` : base);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { providers: Provider[] };
    },
  });

  const conectar = (secret: string) => {
    toast.message(
      `Para conectar, configure o secret ${secret} em Supabase ? Project Settings ? Edge Functions ? Secrets.`,
      { description: "Ap?s salvar o token, clique em 'Testar conex?o' abaixo." },
    );
  };

  const [testando, setTestando] = useState<string | null>(null);
  // Teste manual de enriquecimento por CPF
  const [enrichTestOpen, setEnrichTestOpen] = useState(false);
  const [enrichPhoneTestOpen, setEnrichPhoneTestOpen] = useState(false);
  // Valida??o de credenciais OAuth2 (Client ID/Secret) sem precisar salvar
  const [credValidateOpen, setCredValidateOpen] = useState(false);
  const [credClientId, setCredClientId] = useState("");
  const [credClientSecret, setCredClientSecret] = useState("");
  const [credFinalidade, setCredFinalidade] = useState<number>(1);
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
  // Infosimples token modal
  const [infoTokenOpen, setInfoTokenOpen] = useState(false);
  const [infoToken, setInfoToken] = useState("");
  const [infoTokenSaving, setInfoTokenSaving] = useState(false);
  const [infoTokenResult, setInfoTokenResult] = useState<{ ok: boolean; mensagem?: string; erro?: string } | null>(null);

  // Teste real DirectD TSE
  const [tseTestOpen, setTseTestOpen] = useState(false);
  const [tseCpf, setTseCpf] = useState("");
  const [tseTitulo, setTseTitulo] = useState("");
  const [tseNasc, setTseNasc] = useState("");
  const [tseMae, setTseMae] = useState("");
  const [tseLoading, setTseLoading] = useState(false);
  const [tseResult, setTseResult] = useState<any>(null);
  const [tseError, setTseError] = useState<string | null>(null);

  const salvarInfosimplesToken = async () => {
    const tok = infoToken.trim();
    if (!tok) { toast.error("Informe o token Infosimples."); return; }
    setInfoTokenSaving(true);
    setInfoTokenResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("analise-validacao-eleitoral", {
        body: { save_token: true, token: tok },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setInfoTokenResult({ ok: true, mensagem: (data as any)?.mensagem ?? "Token salvo!" });
      toast.success("Token Infosimples salvo. A conex?o ser? validada ao actualizar.");
      await refetch();
    } catch (e: any) {
      const msg = e?.message ?? "Erro ao salvar token";
      setInfoTokenResult({ ok: false, erro: msg });
      toast.error(msg);
    } finally {
      setInfoTokenSaving(false);
    }
  };

  const [zapiWebhookLoading, setZapiWebhookLoading] = useState(false);
  const [zapiWebhookOk, setZapiWebhookOk] = useState<boolean | null>(null);
  const [zapiWebhookOpen, setZapiWebhookOpen] = useState(false);
  const zapiWebhookUrlReceptivo = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-zapi-receptivo`;
  const zapiWebhookUrlStatus   = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-zapi`;

  const copiarUrl = (url: string, label: string) => {
    navigator.clipboard.writeText(url).then(() => toast.success(`URL "${label}" copiada!`));
  };

  const configurarZapiWebhook = async () => {
    setZapiWebhookLoading(true);
    setZapiWebhookOk(null);
    try {
      const res = await zapiInstanceService.configurarTodosWebhooks(zapiWebhookUrlReceptivo, zapiWebhookUrlStatus);
      if (res.erros === 0) {
        setZapiWebhookOk(true);
        toast.success("Todos os webhooks configurados! O Z-API agora envia eventos ao SA Connect.");
      } else {
        setZapiWebhookOk(false);
        toast.warning(`${res.erros}/${res.total} webhooks falharam. Copie as URLs abaixo e configure manualmente no Z-API.`);
        setZapiWebhookOpen(true);
      }
    } catch (e: any) {
      setZapiWebhookOk(false);
      toast.error("Falha ao configurar: " + (e?.message ?? "Erro desconhecido") + " ? copie as URLs abaixo.");
      setZapiWebhookOpen(true);
    } finally {
      setZapiWebhookLoading(false);
    }
  };

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
      toast.error("Empresa n?o encontrada");
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
      if (!companyId) throw new Error("Empresa n?o encontrada");
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
      if (!companyId) throw new Error("Empresa n?o encontrada");

      // Best-effort: tenta desconectar a inst?ncia no Z-API antes de remover as credenciais.
      try { await callZapiStatusAction("disconnect"); } catch { /* ignora ? pode j? estar inv?lida */ }

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

      toast.success("Conex?o Z-API exclu?da. Configura??o limpa.");
      setZapiDisconnectOpen(false);
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao desconectar");
    }
  };

  const callZapiStatusAction = async (action: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Sess?o expirada. Fa?a login novamente.");

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
      return "A inst?ncia respondeu, mas o WhatsApp ainda n?o est? conectado. Atualize e escaneie o QR Code para continuar.";
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
          message: status?.message ?? "Credenciais Z-API inv?lidas.",
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
          message: "O WhatsApp j? est? conectado nesta inst?ncia.",
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
            message: status?.message ?? "Credenciais Z-API inv?lidas.",
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
            : getZapiDisplayMessage(status, "N?o foi poss?vel gerar um novo QR Code agora."),
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

  // Auto-refresh do QR Code a cada N segundos enquanto o modal est? aberto e n?o conectado
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
      if (providerId === "infosimples") {
        const { data, error } = await supabase.functions.invoke("analise-validacao-eleitoral", {
          body: { ping: true },
        });
        if (error) throw error;
        const r = data as any;
        if (r?.ok) {
          toast.success(r.mensagem ?? "Infosimples conectado", {
            description: `${r.duracao_ms}ms`,
          });
        } else {
          toast.error(r?.erro ?? "Falha ao validar token Infosimples");
        }
        await refetch();
        return;
      }
      if (providerId === "enriquecimento") {
        const { data, error } = await supabase.functions.invoke("analise-enriquecimento", {
          body: { ping: true },
        });
        if (error) throw error;
        const r = data as any;
        if (r?.ok) {
          const provLabel = rotuloProvedorEnriquecimentoUi(r.provedor);
          toast.success(r.mensagem ?? "Conex?o validada", {
            description: `Modo: ${r.modo} ? ${provLabel} ? ${r.duracao_ms}ms`,
          });
        } else {
          const provLabel = rotuloProvedorEnriquecimentoUi(r?.provedor);
          toast.error(r?.erro ?? r?.mensagem ?? "Falha ao validar conex?o", {
            description: r?.provedor ? `${provLabel} ? HTTP ${r.http_status ?? "?"}` : undefined,
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
            title: "Credenciais Z-API inv?lidas",
            message: r?.message ?? "Verifique Instance ID, Token e Client-Token.",
            state: "error",
            raw: r,
          });
        } else if (r?.connected) {
          setZapiTestResult({
            ok: true,
            title: "Conectado ?",
            message: "A inst?ncia Z-API est? conectada e respondendo.",
            state: "success",
            raw: r,
          });
        } else {
          setZapiTestResult({
            ok: false,
            title: "Aguardando conex?o",
            message: getZapiDisplayMessage(
              r,
              "A inst?ncia respondeu, mas o WhatsApp ainda n?o est? conectado. Atualize e escaneie o QR Code para continuar.",
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
      toast.error(e instanceof Error ? e.message : "Erro ao testar conex?o");
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
            Conecte e teste manualmente as integra??es usadas pelo sistema.
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
          if (isFetching) {
            return (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  Verificando integra??es?
                </CardContent>
              </Card>
            );
          }
          if (isError) {
            const msg = mensagemErroCarregarIntegracoes(error);
            return (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertTitle>N?o foi poss?vel carregar as integra??es</AlertTitle>
                  <AlertDescription className="mt-2 space-y-2">
                    <p className="font-mono text-xs break-all">{msg}</p>
                    <p className="text-sm font-normal">
                      Esta lista vem da Edge Function{" "}
                      <code className="rounded bg-muted px-1">analise-integracao-status</code>. Se o
                      projecto Supabase for novo, fa?a o deploy das fun??es no reposit?rio:{" "}
                      <code className="rounded bg-muted px-1">
                        npx supabase functions deploy analise-integracao-status
                      </code>{" "}
                      (ou deploy de todas). No painel Supabase, configure os secrets que cada provedor
                      usa (ex.: INFOSIMPLES_TOKEN, META_APP_ID).
                    </p>
                  </AlertDescription>
                </Alert>
                <Button variant="outline" onClick={() => refetch()}>
                  Tentar novamente
                </Button>
              </div>
            );
          }
          return (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Nenhuma integra??o dispon?vel.
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
                    Secret(s): <code className="font-mono">{meta?.secret ?? "?"}</code>
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
                      if (p.id === "infosimples") {
                        setInfoToken("");
                        setInfoTokenResult(null);
                        setInfoTokenOpen(true);
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
                        {zapiQrLoading ? "Atualizando QR?" : "Atualizar QR Code"}
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
                        {testando === "zapi" ? "Testando?" : "Testar conex?o Z-API"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={configurarZapiWebhook}
                        disabled={zapiWebhookLoading}
                      >
                        {zapiWebhookLoading
                          ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          : zapiWebhookOk === true
                          ? <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                          : zapiWebhookOk === false
                          ? <XCircle className="h-3 w-3 mr-1 text-destructive" />
                          : <Webhook className="h-3 w-3 mr-1" />}
                        {zapiWebhookLoading ? "Configurando?" : "Gerar Webhook"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setZapiWebhookOpen(true)}
                        title="Ver URLs dos webhooks para copiar manualmente"
                      >
                        Ver URLs
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setZapiDisconnectOpen(true)}
                      >
                        <Unplug className="h-3 w-3 mr-1" />
                        Excluir conex?o
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
                      {testando === p.id ? "Testando?" : "Testar conex?o"}
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
                  {p.id === "infosimples" && p.conectado && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setTseCpf("");
                        setTseTitulo("");
                        setTseNasc("");
                        setTseMae("");
                        setTseResult(null);
                        setTseError(null);
                        setTseTestOpen(true);
                      }}
                    >
                      <FlaskConical className="h-3 w-3 mr-1" />
                      Testar consulta
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
                    <>Consultas (30d): <strong>{p.ultimas_consultas}</strong> ? </>
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
              Cole os 3 valores da sua inst?ncia no painel Z-API.
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
              {zapiSaving ? "Salvando?" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Teste TSE */}
      <Dialog open={tseTestOpen} onOpenChange={setTseTestOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4" /> Testar TSE ? T?tulo e Local de Vota??o
            </DialogTitle>
            <DialogDescription>
              Preencha os dados reais e clique em Consultar. A consulta exige <strong>Data de nascimento</strong> e <strong>Nome da m?e</strong> obrigatoriamente, mais CPF ou T?tulo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label htmlFor="tse-cpf">CPF <span className="text-muted-foreground text-xs">(ou T?tulo eleitoral abaixo)</span></Label>
                <Input
                  id="tse-cpf"
                  placeholder="000.000.000-00"
                  value={tseCpf}
                  onChange={(e) => setTseCpf(e.target.value)}
                  disabled={tseLoading}
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label htmlFor="tse-titulo">N? do T?tulo Eleitoral <span className="text-muted-foreground text-xs">(alternativa ao CPF)</span></Label>
                <Input
                  id="tse-titulo"
                  placeholder="000000000000"
                  value={tseTitulo ?? ""}
                  onChange={(e) => setTseTitulo(e.target.value)}
                  disabled={tseLoading}
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tse-nasc">
                  Data de nascimento <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tse-nasc"
                  type="date"
                  value={tseNasc}
                  onChange={(e) => setTseNasc(e.target.value)}
                  disabled={tseLoading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tse-mae">
                  Nome da m?e <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tse-mae"
                  placeholder="NOME COMPLETO DA M?E"
                  value={tseMae}
                  onChange={(e) => setTseMae(e.target.value.toUpperCase())}
                  disabled={tseLoading}
                />
              </div>
            </div>

            {tseLoading && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
                Consultando API TSE?
              </div>
            )}

            {tseError && !tseLoading && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm space-y-1">
                <div className="flex items-center gap-2 font-medium text-destructive">
                  <XCircle className="h-4 w-4 shrink-0" /> Erro na consulta
                </div>
                <p className="text-xs">{tseError}</p>
              </div>
            )}

                {tseResult && !tseLoading && (
              <div className="rounded-md border border-emerald-400/50 bg-emerald-50 dark:bg-emerald-950/20 p-3 space-y-3">
                <div className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0" /> Dados retornados pela API TSE
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ["Nome do eleitor",   tseResult.nome_eleitor],
                    ["T?tulo eleitoral",  tseResult.titulo_eleitoral],
                    ["Zona",              tseResult.zona_eleitoral],
                    ["Se??o",             tseResult.secao_eleitoral],
                    ["Munic?pio",         tseResult.municipio_eleitoral],
                    ["UF",                tseResult.uf_eleitoral],
                    ["Local de vota??o",  tseResult.local_votacao],
                    ["Logradouro",        tseResult.logradouro_local],
                    ["Bairro",            tseResult.bairro_local],
                    ["Pr?xima elei??o",   tseResult.proxima_eleicao],
                    ["Situa??o eleitoral", tseResult.situacao_eleitoral],
                    ["Biometria coletada", tseResult.biometria_coletada != null ? (tseResult.biometria_coletada ? "Sim" : "N?o") : null],
                  ].filter(([, v]) => v != null && String(v).trim() !== "").map(([label, value]) => (
                    <div key={String(label)} className="space-y-0.5">
                      <p className="text-muted-foreground uppercase tracking-wide text-[10px]">{label}</p>
                      <p className="font-medium text-foreground">{String(value)}</p>
                    </div>
                  ))}
                </div>
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground select-none">Resposta completa da API</summary>
                  <pre className="mt-2 max-h-48 overflow-auto bg-muted/40 rounded p-2 text-[10px]">
                    {JSON.stringify(tseResult, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTseTestOpen(false)}>Fechar</Button>
            <Button
              disabled={
                tseLoading ||
                (!tseCpf.trim() && !tseTitulo.trim()) ||
                !tseNasc ||
                !tseMae.trim()
              }
              title={
                !tseNasc ? "Preencha a data de nascimento (*)" :
                !tseMae.trim() ? "Preencha o nome da m?e (*)" :
                (!tseCpf.trim() && !tseTitulo.trim()) ? "Informe o CPF ou o n?mero do t?tulo" : ""
              }
              onClick={async () => {
                setTseLoading(true);
                setTseResult(null);
                setTseError(null);
                try {
                  const { data, error } = await supabase.functions.invoke("analise-validacao-eleitoral", {
                    body: {
                      cpf:    tseCpf.replace(/\D/g, "") || undefined,
                      titulo: tseTitulo.replace(/\D/g, "") || undefined,
                      data_nascimento: tseNasc,
                      nome_mae: tseMae.trim(),
                    },
                  });
                  if (error) {
                    const ctx = (error as any)?.context;
                    let msg = error.message;
                    try {
                      const p = typeof ctx?.json === "function" ? await ctx.json() : null;
                      if (p?.motivo) msg = p.motivo;
                      else if (p?.error) msg = p.error;
                      else if (p?.erro) msg = p.erro;
                    } catch { /* ignore */ }
                    throw new Error(msg);
                  }
                  const d = data as any;
                  if (d?.skipped) throw new Error(d.motivo ?? "Par?metros insuficientes para a consulta TSE.");
                  if (d?.ok === false) throw new Error(d.erro ?? d._msg ?? "API n?o retornou dados para estes par?metros.");
                  setTseResult(d?.dados ?? d);
                } catch (e: any) {
                  setTseError(e?.message ?? "Falha na consulta");
                } finally {
                  setTseLoading(false);
                }
              }}
            >
              {tseLoading ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-1" />}
              {tseLoading ? "Consultando?" : "Consultar TSE"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Token TSE */}
      <Dialog open={infoTokenOpen} onOpenChange={setInfoTokenOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar token ? TSE</DialogTitle>
            <DialogDescription>
              Cole o valor do par?metro <code className="bg-muted px-1 rounded">TOKEN</code> que aparece na URL das suas consultas (ex.: URL da consulta "TSE - T?tulo e Local de Vota??o"). O token ? guardado na base de dados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="info-token">Token de API</Label>
              <Input
                id="info-token"
                type="password"
                placeholder="Cole o token aqui?"
                value={infoToken}
                onChange={(e) => setInfoToken(e.target.value)}
                disabled={infoTokenSaving}
                autoComplete="off"
              />
            </div>
            {infoTokenResult && (
              <div className={`rounded border p-2 text-sm flex items-center gap-2 ${infoTokenResult.ok ? "border-emerald-400 bg-emerald-50 text-emerald-800" : "border-destructive/40 bg-destructive/10 text-destructive"}`}>
                {infoTokenResult.ok
                  ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                  : <XCircle className="h-4 w-4 shrink-0" />}
                {infoTokenResult.mensagem ?? infoTokenResult.erro}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInfoTokenOpen(false)}>Cancelar</Button>
            <Button onClick={salvarInfosimplesToken} disabled={infoTokenSaving || !infoToken.trim()}>
              {infoTokenSaving ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <KeyRound className="h-4 w-4 mr-1" />}
              {infoTokenSaving ? "Salvando?" : "Salvar token"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ?? Dialog: URLs dos webhooks Z-API ???????????????????????????????? */}
      <Dialog open={zapiWebhookOpen} onOpenChange={setZapiWebhookOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="h-4 w-4" /> Webhooks Z-API ? URLs para configurar
            </DialogTitle>
            <DialogDescription>
              No painel Z-API ? <strong>Webhooks e configura??es gerais</strong>, preencha os campos abaixo.
              Ative tamb?m <strong>"Notificar as enviadas por mim tamb?m"</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {[
              { label: "Ao enviar",                  url: zapiWebhookUrlReceptivo },
              { label: "Ao receber",                 url: zapiWebhookUrlReceptivo },
              { label: "Receber status da mensagem", url: zapiWebhookUrlStatus    },
              { label: "Ao desconectar",             url: zapiWebhookUrlReceptivo },
              { label: "Ao conectar",                url: zapiWebhookUrlReceptivo },
              { label: "Presen?a do chat",           url: zapiWebhookUrlReceptivo },
            ].map(({ label, url }) => (
              <div key={label} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <div className="flex gap-2 items-center">
                  <code className="flex-1 rounded bg-muted px-2 py-1 text-[11px] break-all leading-snug">{url}</code>
                  <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs px-2" onClick={() => copiarUrl(url, label)}>
                    Copiar
                  </Button>
                </div>
              </div>
            ))}
            <div className="rounded border border-primary/30 bg-primary/5 p-3 text-xs space-y-1">
              <p className="font-medium">Configura??o autom?tica</p>
              <p className="text-muted-foreground">Clique em <strong>"Gerar Webhook"</strong> no cart?o Z-API para preencher tudo automaticamente ? s? funciona quando a inst?ncia estiver conectada.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setZapiWebhookOpen(false)}>Fechar</Button>
            <Button onClick={async () => { setZapiWebhookOpen(false); await configurarZapiWebhook(); }} disabled={zapiWebhookLoading}>
              <Webhook className="h-3 w-3 mr-1" />
              Configurar automaticamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={zapiDisconnectOpen} onOpenChange={setZapiDisconnectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conex?o Z-API?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove a sess?o e as credenciais salvas (Instance ID, Token e Client-Token) desta integra??o.
              Voc? poder? configurar a Z-API do zero em seguida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={disconnectZapi}>Excluir conex?o</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={zapiQrOpen} onOpenChange={setZapiQrOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>QR Code da Z-API</DialogTitle>
            <DialogDescription>
              Atualize e escaneie este QR Code no WhatsApp para reconectar a inst?ncia.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {zapiQrResult?.connected ? (
              <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-lg border border-green-500/40 bg-green-500/10 p-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
                <p className="text-base font-semibold text-green-700">WhatsApp conectado com sucesso! ?</p>
                <p className="text-sm text-muted-foreground">
                  {zapiQrResult.message}
                </p>
              </div>
            ) : zapiQrLoading && !zapiQrResult ? (
              <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/30 p-6 text-center">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <p className="text-sm text-muted-foreground">Gerando um novo QR Code?</p>
              </div>
            ) : zapiQrResult?.qrImage || zapiQrResult?.qrCode ? (
              <div className="grid gap-4 md:grid-cols-[280px,1fr] md:items-center">
                <div className="flex justify-center">
                  {zapiQrResult.qrImage ? (
                    <img
                      src={zapiQrResult.qrImage}
                      alt="QR Code atualizado da inst?ncia Z-API"
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
                        Atualizando em <strong>{zapiQrCountdown}s</strong>? aguardando conex?o.
                      </span>
                    ) : (
                      <span>Auto-atualiza??o pausada.</span>
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
                <p className="text-sm text-foreground">{zapiQrResult?.message ?? "Nenhum QR Code dispon?vel."}</p>
                {zapiQrResult?.connected && (
                  <p className="text-sm text-muted-foreground">A inst?ncia j? est? conectada, ent?o n?o foi necess?rio gerar um novo QR.</p>
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
              {zapiQrLoading ? "Atualizando?" : "Gerar novamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={zapiTestOpen} onOpenChange={setZapiTestOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {zapiTestResult?.state === "success"
                ? "Teste Z-API ? Sucesso"
                : zapiTestResult?.state === "warning"
                  ? "Teste Z-API ? Aguardando conex?o"
                  : "Teste Z-API ? Falha"}
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
                    <Label>QR Code ? escaneie no WhatsApp</Label>
                    <img
                      src={qrImage}
                      alt="QR Code Z-API"
                      className="h-56 w-56 rounded border bg-white p-2"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Abra o WhatsApp ? Aparelhos conectados ? Conectar um aparelho.
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
              Consulta a API SA Connect Data em modo preview (n?o cria eleitor, n?o cobra de cota se j? houver cache).
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
                    toast.error("Informe um CPF com 11 d?gitos");
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
                    {enrichErrorMeta.provedor ? ` ? provedor: ${rotuloProvedorEnriquecimentoUi(enrichErrorMeta.provedor)}` : ""}
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
                    ?? {ocultarAssertivaEmTextoUi(String(enrichErrorMeta.dica))}
                  </div>
                )}
                {enrichErrorMeta?.details ? (
                  <details className="text-xs">
                    <summary className="cursor-pointer select-none text-muted-foreground">Detalhes da resposta</summary>
                    <pre className="mt-1 max-h-48 overflow-auto bg-muted/40 p-2 rounded">
{sanitizarJsonTextoCliente(enrichErrorMeta.details)}
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
                    ["Nome da m?e", enrichResult?.dados?.nome_mae],
                    ["T?tulo eleitoral", enrichResult?.dados?.titulo_eleitoral],
                    ["Munic?pio eleitoral", enrichResult?.dados?.municipio_eleitoral],
                    ["E-mail", enrichResult?.dados?.email],
                    ["Logradouro", enrichResult?.dados?.endereco?.logradouro],
                    ["N?mero", enrichResult?.dados?.endereco?.numero],
                    ["Bairro", enrichResult?.dados?.endereco?.bairro],
                    ["Cidade", enrichResult?.dados?.endereco?.cidade],
                    ["UF", enrichResult?.dados?.endereco?.uf],
                    ["CEP", enrichResult?.dados?.endereco?.cep],
                  ].map(([label, value]) => (
                    <div key={label as string} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{label}</Label>
                      <Input value={(value as string) ?? ""} readOnly placeholder="?" />
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
                    <Badge variant="outline" className="font-mono text-[10px] leading-tight max-w-full truncate" title={enrichResult.oauth_endpoint}>
                      OAuth: {enrichResult.oauth_endpoint.startsWith("http")
                        ? (() => {
                          try {
                            return `${new URL(enrichResult.oauth_endpoint).pathname} (SA Connect Data)`;
                          } catch {
                            return "SA Connect Data";
                          }
                        })()
                        : enrichResult.oauth_endpoint}
                    </Badge>
                  )}
                </div>
                <details className="rounded border bg-muted/40 p-2 text-xs">
                  <summary className="cursor-pointer select-none">Resposta bruta</summary>
                  <pre className="mt-2 max-h-72 overflow-auto">
{sanitizarJsonTextoCliente(enrichResult)}
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
              Consulta o provedor em tempo real e mostra os dados retornados. Nenhum eleitor ? alterado.
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
              Cole o Client ID e o Client Secret do painel da SA Connect Data para testar o OAuth2.
              <strong className="block mt-2"> Salvar credenciais</strong> grava na tabela{" "}
              <code className="rounded bg-muted px-1">analise_provedor_credenciais</code> (apenas{" "}
              <strong>super admin</strong>) e exige a vari?vel de ambiente{" "}
              <code className="rounded bg-muted px-1">SUPABASE_SERVICE_ROLE_KEY</code> na Edge Function{" "}
              <code className="rounded bg-muted px-1">analise-enriquecimento</code> (o Supabase costuma injetar
              automaticamente). Alternativa: defina os secrets{" "}
              <code className="mx-1">ANALISE_ELEITORAL_API_USER</code> e{" "}
              <code className="ml-1">ANALISE_ELEITORAL_API_PASSWORD</code> no painel do projeto.
              Depois de salvar, clique em <strong>Atualizar</strong> na lista de integra??es.
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
            <div className="space-y-1">
              <Label htmlFor="cred-finalidade">Finalidade LGPD</Label>
              <select
                id="cred-finalidade"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={credFinalidade}
                onChange={(e) => setCredFinalidade(Number(e.target.value))}
                disabled={credLoading}
              >
                <option value={1}>1 ˜ Confirma??o de Identidade</option>
                <option value={2}>2 ˜ Ciclo de Cr?dito</option>
                <option value={4}>4 ˜ Execu??o de Contrato</option>
                <option value={5}>5 ˜ Leg?timo Interesse</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Exigido pela LGPD em todas as consultas ? API.
              </p>
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
                    toast.success("Credenciais v?lidas!");
                  } else {
                    toast.error(data?.erro ?? "Credenciais inv?lidas");
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
                    ? credResult.mensagem ?? "Credenciais v?lidas"
                    : credResult.erro ?? "Falha na valida??o"}
                </div>
                {credResult.http_status ? (
                  <div className="text-xs text-muted-foreground">
                    HTTP {credResult.http_status}
                    {credResult.duracao_ms ? ` ? ${credResult.duracao_ms}ms` : ""}
                  </div>
                ) : null}
                {credResult.expires_in && (
                  <div className="text-xs text-muted-foreground">
                    Token expira em {credResult.expires_in}s
                  </div>
                )}
                {credResult.dica && !credResult.ok && (
                  <div className="text-xs rounded border bg-background/60 p-2 text-foreground">
                    ?? {ocultarAssertivaEmTextoUi(String(credResult.dica))}
                  </div>
                )}
                {credResult.detalhes ? (
                  <details className="text-xs">
                    <summary className="cursor-pointer select-none text-muted-foreground">
                      Resposta do provedor
                    </summary>
                    <pre className="mt-1 max-h-48 overflow-auto bg-muted/40 p-2 rounded">
{sanitizarJsonTextoCliente(credResult.detalhes)}
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
                              id_finalidade: credFinalidade,
                            },
                          },
                        );
                        if (error) throw error;
                        if (data?.ok) {
                          setCredSaved(true);
                          toast.success("Credenciais salvas na base. Clique em Atualizar se o cart?o n?o mudar.");
                          await refetch();
                        } else {
                          toast.error(data?.error ?? data?.erro ?? "Falha ao salvar");
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
