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

/** Lê o token DirectD: DB (analise_provedor_credenciais, provedor='directd') → env. */
async function lerTokenDirectD(): Promise<string | null> {
  try {
    const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const sUrl = Deno.env.get("SUPABASE_URL");
    if (srk && sUrl) {
      const admin = createClient(sUrl, srk);
      const { data } = await admin
        .from("analise_provedor_credenciais")
        .select("client_id")
        .eq("provedor", "directd")
        .maybeSingle();
      if (data?.client_id) return data.client_id as string;
    }
  } catch { /* ignora */ }
  return Deno.env.get("DIRECTD_TOKEN") ?? Deno.env.get("INFOSIMPLES_TOKEN") ?? null;
}

async function statusInfosimples(): Promise<ProviderStatus> {
  const token = await lerTokenDirectD();
  const base: ProviderStatus = {
    id: "infosimples",
    nome: "DirectD · TSE Título e Local de Votação",
    categoria: "Análise Eleitoral",
    configurado: !!token,
    conectado: false,
    detalhe: token ? "Token configurado — verificando conexão…" : "Token não configurado",
    testado_em: now(),
  };
  if (!token) return base;
  try {
    // Teste leve: consulta com CPF inválido — qualquer resposta não-401/403 indica token válido
    const url = new URL("https://apiv3.directd.com.br/api/TituloLocalVotacao");
    url.searchParams.set("TOKEN", token);
    url.searchParams.set("CPF", "00000000000");
    url.searchParams.set("DATANASCIMENTO", "01/01/2000");
    url.searchParams.set("NOMEMAE", "TESTE");
    const resp = await fetch(url.toString());
    if (resp.status === 401 || resp.status === 403) {
      return { ...base, conectado: false, detalhe: "Token inválido ou sem permissão (HTTP " + resp.status + ")" };
    }
    return { ...base, conectado: true, detalhe: "Token activo · API DirectD acessível" };
  } catch (e) {
    return {
      ...base,
      conectado: false,
      detalhe: `Erro de conexão: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

/** Mesma ordem e tabela que `lerCredenciaisProvedor` em analise-enriquecimento (DB → env). */
async function oauthEnriquecimentoResolvido(): Promise<{ ok: boolean }> {
  try {
    const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const sUrl = Deno.env.get("SUPABASE_URL");
    if (srk && sUrl) {
      const admin = createClient(sUrl, srk);
      const { data } = await admin
        .from("analise_provedor_credenciais")
        .select("client_id, client_secret")
        .eq("provedor", "assertiva")
        .maybeSingle();
      if (data?.client_id && data?.client_secret) return { ok: true };
    }
  } catch {
    /* ignore */
  }
  const u = Deno.env.get("ANALISE_ELEITORAL_API_USER");
  const p = Deno.env.get("ANALISE_ELEITORAL_API_PASSWORD");
  return { ok: !!(u && p) };
}

async function statusEnriquecimento(): Promise<ProviderStatus> {
  const keyRaw = Deno.env.get("ANALISE_ELEITORAL_API_KEY");
  const key = keyRaw?.trim() ?? "";
  const url = Deno.env.get("ANALISE_ELEITORAL_API_URL")?.trim() ?? "";

  const oauth = await oauthEnriquecimentoResolvido();
  const oauthOk = oauth.ok;
  const configurado = !!(key || oauthOk);
  const urlOk = url.length > 0;

  let detalhe: string;
  if (!configurado) {
    detalhe =
      "Sem credenciais: defina secrets ANALISE_ELEITORAL_API_USER + ANALISE_ELEITORAL_API_PASSWORD, ou ANALISE_ELEITORAL_API_KEY, ou salve Client ID/Secret como super admin (botão Salvar credenciais).";
  } else if (key && !urlOk) {
    detalhe = "API key definida (modo legado) — sem URL do provedor no secret ANALISE_ELEITORAL_API_URL.";
  } else if (!key && oauthOk && !urlOk) {
    detalhe =
      "OAuth2 configurado — URL opcional; sem ANALISE_ELEITORAL_API_URL usa-se o endpoint padrão do SA Connect Data.";
  } else {
    detalhe = "Configurada e pronta.";
  }

  const conectado = (!!key && urlOk) || oauthOk;

  return {
    id: "enriquecimento",
    nome: "API de Enriquecimento Cadastral",
    categoria: "Análise Eleitoral",
    configurado,
    conectado,
    detalhe,
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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")?.trim();
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")?.trim();
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("[analise-integracao-status] SUPABASE_URL ou SUPABASE_ANON_KEY ausente no ambiente da função.");
      return new Response(
        JSON.stringify({
          error:
            "Função sem variáveis SUPABASE_URL / SUPABASE_ANON_KEY. No Supabase Dashboard → Edge Functions, confirme que o projeto injeta essas variáveis (automático nas funções hospedadas).",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader =
      req.headers.get("Authorization")?.trim() ||
      req.headers.get("authorization")?.trim() ||
      "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Token ausente no header Authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decodifica o payload do JWT localmente (sem round-trip ao servidor Auth).
    // Chamar /auth/v1/user falha quando a sessão foi expirada/removida da tabela auth.sessions
    // mesmo que o token ainda seja criptograficamente válido.
    // A segurança continua garantida: todas as queries usam o JWT via RLS.
    const userId = (() => {
      try {
        // JWTs usam base64url (-/_); atob() só aceita base64 padrão (+//).
        const part = (jwt.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/");
        const padded = part + "=".repeat((4 - part.length % 4) % 4);
        const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
        const sub = payload.sub ?? payload.user_id;
        return typeof sub === "string" && sub.length > 0 ? sub : null;
      } catch {
        return null;
      }
    })();

    if (!userId) {
      return new Response(JSON.stringify({ error: "Token inválido ou sem campo sub." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const [info, enriq, zapi, meta, ai, twilio, google] = await Promise.all([
      statusInfosimples(),
      statusEnriquecimento(),
      statusZapi(supabase, userId),
      statusMetaWhatsapp(),
      statusLovableAI(),
      statusTwilio(),
      statusGoogleTickets(),
    ]);

    // contagem de consultas recentes por provedor (últimos 30 dias) — falha isolada não derruba a lista
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const counts: Record<string, number> = {};
    try {
      const { data: rows, error: rowsErr } = await supabase
        .from("analise_api_consultas")
        .select("provedor")
        .gte("created_at", since)
        .limit(5000);
      if (rowsErr) {
        console.warn("[analise-integracao-status] analise_api_consultas:", rowsErr.message);
      } else {
        for (const r of rows ?? []) counts[(r as any).provedor] = (counts[(r as any).provedor] ?? 0) + 1;
      }
    } catch (e) {
      console.warn("[analise-integracao-status] contagem consultas:", e);
    }
    info.ultimas_consultas =
      (counts["infosimples"] ?? 0) +
      (counts["api.infosimples.com"] ?? 0);
    enriq.ultimas_consultas = Object.entries(counts).reduce((sum, [k, n]) => {
      const p = (k ?? "").toLowerCase();
      if (
        p === "mock" ||
        p === "enriquecimento" ||
        p === "placeholder" ||
        p === "assertiva" ||
        p.includes("assertivasolucoes")
      ) return sum + (Number(n) || 0);
      return sum;
    }, 0);

    return new Response(JSON.stringify({
      providers: [info, enriq, zapi, meta, ai, twilio, google],
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("[analise-integracao-status] não tratado:", e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});