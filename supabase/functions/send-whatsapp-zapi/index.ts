import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const getErrorMessage = (body: unknown) => {
      if (typeof body === "string") return body;
      if (body && typeof body === "object") {
        const record = body as Record<string, unknown>;
        const msg = record.error ?? record.message;
        if (typeof msg === "string") return msg;
      }
      return "";
    };
    const isClientTokenNotAllowed = (body: unknown) => /Client-Token\s+.+\s+not allowed/i.test(getErrorMessage(body));

    const ENV_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID");
    const ENV_INSTANCE_TOKEN = Deno.env.get("ZAPI_INSTANCE_TOKEN");
    const ENV_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve credenciais Z-API
    let ZAPI_INSTANCE_ID = ENV_INSTANCE_ID ?? "";
    let ZAPI_INSTANCE_TOKEN = ENV_INSTANCE_TOKEN ?? "";
    let ZAPI_CLIENT_TOKEN = ENV_CLIENT_TOKEN ?? "";
    try {
      const { data: companyId } = await supabase.rpc("user_default_company", { _user_id: userData.user.id });
      if (companyId) {
        const { data: sess } = await supabase
          .from("whatsapp_sessions").select("credentials")
          .eq("company_id", companyId).eq("provider", "zapi")
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: true })
          .limit(1).maybeSingle();
        const c = (sess?.credentials ?? {}) as Record<string, string>;
        if (c.instance_id) ZAPI_INSTANCE_ID = c.instance_id.trim();
        if (c.token) ZAPI_INSTANCE_TOKEN = c.token.trim();
        if (c.client_token) {
          const ct = c.client_token.trim();
          if (/^[A-Za-z0-9]{20,}$/.test(ct)) ZAPI_CLIENT_TOKEN = ct;
        }
      }
    } catch (_e) { /* fallback */ }
    if (!ZAPI_INSTANCE_ID || !ZAPI_INSTANCE_TOKEN || !ZAPI_CLIENT_TOKEN) {
      return new Response(JSON.stringify({ error: "Credenciais Z-API ausentes (cadastre uma conexão Z-API)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { to, message, nome } = body as { to?: string; message?: string; nome?: string };

    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: to, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Z-API exige número apenas com dígitos (DDI+DDD+numero).
    // Normaliza para o formato brasileiro: se vier sem o DDI 55 (10 ou 11 dígitos), prefixa.
    const normalizePhoneBR = (raw: string) => {
      const d = raw.replace(/\D/g, "");
      if (d.length === 10 || d.length === 11) return `55${d}`;
      if (d.length === 12 || d.length === 13) return d;
      return d;
    };
    const phone = normalizePhoneBR(to);

    // Verifica se o número tem WhatsApp ativo antes de enviar (evita "Enviado" silencioso).
    try {
      const existsResp = await fetch(
        `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_INSTANCE_TOKEN}/phone-exists/${phone}`,
        { method: "GET", headers: { "Client-Token": ZAPI_CLIENT_TOKEN } },
      );
      const existsData = await existsResp.json().catch(() => ({} as Record<string, unknown>));
      const exists = (existsData as Record<string, unknown>)?.exists;
      if (existsResp.ok && exists === false) {
        await supabase.from("mensagens_externas").insert({
          user_id: userData.user.id,
          canal: "WhatsApp",
          destinatario: to,
          destinatario_nome: nome ?? null,
          conteudo: message,
          status: "Falhou",
          provedor: "Z-API",
          erro: "Número não possui WhatsApp ativo",
          metadata: { phone_exists: existsData },
        });
        return new Response(
          JSON.stringify({
            error: "Este número não possui WhatsApp ativo (verifique o DDI/DDD).",
            details: existsData,
          }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } catch (_e) {
      // Se a verificação falhar por instabilidade, segue o envio normal.
    }

    const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_INSTANCE_TOKEN}/send-text`;

    const sendText = async (instanceId: string, instanceToken: string, clientToken: string) => {
      const response = await fetch(`https://api.z-api.io/instances/${instanceId}/token/${instanceToken}/send-text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Client-Token": clientToken,
        },
        body: JSON.stringify({ phone, message }),
      });
      const data = await response.json().catch(() => ({}));
      return { response, data };
    };

    let { response: zapiResp, data: zapiData } = await sendText(ZAPI_INSTANCE_ID, ZAPI_INSTANCE_TOKEN, ZAPI_CLIENT_TOKEN);

    const canRetryWithEnv = !!ENV_INSTANCE_ID && !!ENV_INSTANCE_TOKEN && !!ENV_CLIENT_TOKEN
      && (ENV_INSTANCE_ID !== ZAPI_INSTANCE_ID || ENV_INSTANCE_TOKEN !== ZAPI_INSTANCE_TOKEN || ENV_CLIENT_TOKEN !== ZAPI_CLIENT_TOKEN);

    if (!zapiResp.ok && isClientTokenNotAllowed(zapiData) && canRetryWithEnv) {
      const retried = await sendText(ENV_INSTANCE_ID!, ENV_INSTANCE_TOKEN!, ENV_CLIENT_TOKEN!);
      zapiResp = retried.response;
      zapiData = retried.data;
    }

    if (!zapiResp.ok) {
      await supabase.from("mensagens_externas").insert({
        user_id: userData.user.id,
        canal: "WhatsApp",
        destinatario: to,
        destinatario_nome: nome ?? null,
        conteudo: message,
        status: "Falhou",
        provedor: "Z-API",
        erro: zapiData?.error || zapiData?.message || JSON.stringify(zapiData),
        metadata: { response: zapiData },
      });
      const errorMessage = isClientTokenNotAllowed(zapiData)
        ? "Client-Token da conexão Z-API não está autorizado para esta instância. Atualize o token da conexão cadastrada em WhatsApp > Sessões ou os secrets globais da Z-API."
        : `Z-API [${zapiResp.status}]: ${zapiData?.error || zapiData?.message || "erro"}`;
      return new Response(
        JSON.stringify({ error: errorMessage, details: zapiData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: inserted } = await supabase
      .from("mensagens_externas")
      .insert({
        user_id: userData.user.id,
        canal: "WhatsApp",
        destinatario: to,
        destinatario_nome: nome ?? null,
        conteudo: message,
        status: "Enviado",
        provedor: "Z-API",
        provedor_message_id: zapiData?.messageId || zapiData?.id || null,
        enviado_em: new Date().toISOString(),
        metadata: { response: zapiData },
      })
      .select()
      .single();

    // Espelha a mensagem na timeline da conversa (whatsapp_mensagens) — anti-perda
    try {
      const phoneDigits = phone;
      // Busca/cria conversa
      const { data: conv } = await supabase
        .from("whatsapp_conversas")
        .select("id")
        .eq("telefone_digits", phoneDigits)
        .maybeSingle();
      let conversaId = conv?.id as string | undefined;
      if (!conversaId) {
        const { data: created } = await supabase
          .from("whatsapp_conversas")
          .insert({
            telefone: to,
            telefone_digits: phoneDigits,
            contato_nome: nome ?? null,
            status: "Em atendimento",
          })
          .select("id")
          .single();
        conversaId = created?.id;
      }
      if (conversaId) {
        await supabase.from("whatsapp_mensagens").insert({
          conversa_id: conversaId,
          direcao: "saida",
          tipo: "texto",
          conteudo: message,
          provedor_message_id: zapiData?.messageId || zapiData?.id || null,
          status: "Enviado",
          enviado_por: userData.user.id,
          enviado_em: new Date().toISOString(),
          metadata: { response: zapiData, source: "send-whatsapp-zapi" },
        });

        // Marca primeira_resposta_em (se ainda não tiver) — usado para SLA
        await supabase.from("whatsapp_conversas")
          .update({ primeira_resposta_em: new Date().toISOString() })
          .eq("id", conversaId)
          .is("primeira_resposta_em", null);
      }
    } catch (mirrorErr) {
      console.warn("espelho whatsapp_mensagens falhou:", mirrorErr);
    }

    return new Response(
      JSON.stringify({ success: true, messageId: zapiData?.messageId, mensagem: inserted }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("send-whatsapp-zapi error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});