import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ProviderStatus = {
  id: string;
  nome: string;
  categoria: string;
  configurado: boolean;
  conectado: boolean;
  detalhe: string;
  testado_em: string;
  ultimas_consultas?: number;
};

const now = () => new Date().toISOString();

const getErrorMessage = (body: unknown) => {
  if (typeof body === "string") return body;
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const msg = record.error ?? record.message;
    if (typeof msg === "string") return msg;
  }
  return "";
};

const isCredentialsError = (body: unknown) => {
  const message = getErrorMessage(body);
  return message === "NOT_FOUND"
    || /Client-Token\s+.+\s+not allowed/i.test(message)
    || /client-token/i.test(message)
    || /token inválido|token invalido|unauthorized|forbidden/i.test(message);
};

async function statusInfosimples(): Promise<ProviderStatus> {
  const token = Deno.env.get("INFOSIMPLES_TOKEN");
  const base: ProviderStatus = {
    id: "infosimples",
    nome: "Infosimples · TSE Título de Eleitor",
    categoria: "Análise Eleitoral",
    configurado: !!token,
    conectado: false,
    detalhe: "Token não configurado",
    testado_em: now(),
  };
  if (!token) return base;
  try {
    // Endpoint leve de verificação — ajusta-se ao retorno real da Infosimples.
    const resp = await fetch("https://api.infosimples.com/api/v2/account/balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await resp.json().catch(() => ({}));
    const code = (data as any)?.code ?? resp.status;
    if (resp.ok && (code === 200 || code === 600)) {
      const saldo = (data as any)?.data?.[0]?.saldo ?? (data as any)?.saldo;
      return {
        ...base,
        conectado: true,
        detalhe: saldo !== undefined ? `Conectado · saldo: ${saldo}` : "Conectado",
      };
    }
    return {
      ...base,
      conectado: false,
      detalhe: `Token inválido ou sem permissão (código ${code})`,
    };
  } catch (e) {
    return {
      ...base,
      conectado: false,
      detalhe: `Erro de conexão: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

async function statusEnriquecimento(): Promise<ProviderStatus> {
  const key = Deno.env.get("ANALISE_ELEITORAL_API_KEY");
  const url = Deno.env.get("ANALISE_ELEITORAL_API_URL");
  return {
    id: "enriquecimento",
    nome: "API de Enriquecimento Cadastral",
    categoria: "Análise Eleitoral",
    configurado: !!key,
    conectado: !!key && !!url,
    detalhe: !key
      ? "API key não configurada"
      : !url
        ? "Configurada (modo simulado — sem URL do provedor)"
        : "Configurada e pronta",
    testado_em: now(),
  };
}

async function statusZapi(supabase: ReturnType<typeof createClient>, userId: string): Promise<ProviderStatus> {
  let id = "";
  let token = "";
  let client = "";
  let sourceLabel = "conexão salva";

  try {
    const { data: companyId } = await supabase.rpc("user_default_company", { _user_id: userId });
    if (companyId) {
      const { data: sess } = await supabase
        .from("whatsapp_sessions")
        .select("credentials")
        .eq("company_id", companyId)
        .eq("provider", "zapi")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      const credentials = (sess?.credentials ?? {}) as Record<string, string>;
      const sessionId = credentials.instance_id?.trim();
      const sessionToken = credentials.token?.trim();
      const sessionClient = credentials.client_token?.trim();

      if (sessionId && sessionToken && sessionClient) {
        id = sessionId;
        token = sessionToken;
        client = sessionClient;
        sourceLabel = "conexão salva";
      }
    }
  } catch (_error) {
    // sem conexão salva
  }

  const base: ProviderStatus = {
    id: "zapi",
    nome: "Z-API · WhatsApp",
    categoria: "WhatsApp",
    configurado: !!(id && token && client),
    conectado: false,
    detalhe: "Credenciais ausentes (instance, token e client-token)",
    testado_em: now(),
  };
  if (!base.configurado) return base;
  try {
    const fetchStatus = async (instanceId: string, instanceToken: string, clientToken: string) => {
      const resp = await fetch(`https://api.z-api.io/instances/${instanceId}/token/${instanceToken}/status`, {
        headers: { "Client-Token": clientToken },
      });
      const data = await resp.json().catch(() => ({}));
      return { resp, data };
    };

    let { resp, data } = await fetchStatus(id, token, client);
    const conectado = resp.ok && (data?.connected === true || data?.smartphoneConnected === true);

    return {
      ...base,
      conectado,
      detalhe: conectado
        ? "Instância Z-API conectada ao WhatsApp"
        : `Instância configurada mas WhatsApp não conectado (${getErrorMessage(data) || resp.status})`,
    };
  } catch (e) {
    return { ...base, detalhe: `Erro de conexão: ${e instanceof Error ? e.message : String(e)} · ${sourceLabel}` };
  }
}

async function statusMetaWhatsapp(): Promise<ProviderStatus> {
  const appId = Deno.env.get("META_APP_ID");
  const appSecret = Deno.env.get("META_APP_SECRET");
  return {
    id: "meta_whatsapp",
    nome: "Meta · WhatsApp Cloud API",
    categoria: "WhatsApp",
    configurado: !!(appId && appSecret),
    conectado: !!(appId && appSecret),
    detalhe: appId && appSecret
      ? "App Meta configurado (OAuth disponível)"
      : "Configure META_APP_ID e META_APP_SECRET",
    testado_em: now(),
  };
}

async function statusLovableAI(): Promise<ProviderStatus> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  return {
    id: "lovable_ai",
    nome: "Lovable AI Gateway",
    categoria: "IA",
    configurado: !!key,
    conectado: !!key,
    detalhe: key ? "Chave gerenciada pelo Lovable Cloud" : "LOVABLE_API_KEY ausente",
    testado_em: now(),
  };
}

async function statusTwilio(): Promise<ProviderStatus> {
  const key = Deno.env.get("TWILIO_API_KEY");
  return {
    id: "twilio",
    nome: "Twilio",
    categoria: "Mensageria",
    configurado: !!key,
    conectado: !!key,
    detalhe: key ? "API key configurada" : "TWILIO_API_KEY ausente",
    testado_em: now(),
  };
}

async function statusGoogleTickets(): Promise<ProviderStatus> {
  // Tickets Google usa OAuth do usuário; o secret real vem do provedor Lovable.
  return {
    id: "google_tickets",
    nome: "Google Workspace · Tickets",
    categoria: "Produtividade",
    configurado: true,
    conectado: true,
    detalhe: "OAuth Google disponível (autenticação por usuário)",
    testado_em: now(),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const [info, enriq, zapi, meta, ai, twilio, google] = await Promise.all([
      statusInfosimples(),
      statusEnriquecimento(),
      statusZapi(supabase, userId),
      statusMetaWhatsapp(),
      statusLovableAI(),
      statusTwilio(),
      statusGoogleTickets(),
    ]);

    // contagem de consultas recentes por provedor (últimos 30 dias)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: rows } = await supabase
      .from("analise_api_consultas")
      .select("provedor")
      .gte("created_at", since)
      .limit(5000);
    const counts: Record<string, number> = {};
    for (const r of rows ?? []) counts[(r as any).provedor] = (counts[(r as any).provedor] ?? 0) + 1;
    info.ultimas_consultas =
      (counts["infosimples"] ?? 0) +
      (counts["api.infosimples.com"] ?? 0);
    enriq.ultimas_consultas =
      (counts["enriquecimento"] ?? 0) +
      (counts["mock"] ?? 0) +
      (counts["placeholder"] ?? 0);

    return new Response(JSON.stringify({
      providers: [info, enriq, zapi, meta, ai, twilio, google],
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});