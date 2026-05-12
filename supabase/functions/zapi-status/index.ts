import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Endpoints Z-API usados:
 *  GET  /status                  -> { connected: bool, smartphoneConnected: bool, ... }
 *  GET  /qr-code/image           -> { value: "data:image/png;base64,..." }
 *  GET  /qr-code                 -> { value: "<raw qr string>" }   (fallback)
 *  GET  /disconnect              -> desconecta a sessão
 *  GET  /restart                 -> reinicia a instância
 */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
    const credentialsErrorResponse = (body: unknown) => json({
      success: false,
      connected: false,
      qrImage: null,
      qrCode: null,
      credentialsError: true,
      data: null,
      message: getErrorMessage(body) || "Credenciais Z-API inválidas. Verifique a conexão cadastrada.",
    });

    // IMPORTANTE: as credenciais Z-API SÓ vêm do banco (whatsapp_sessions).
    // Não usamos mais ENV como fallback, para que "Excluir conexão" deixe a integração realmente limpa.
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decodifica o JWT localmente (evita round-trip ao servidor Auth que falha
    // com "Session from session_id claim in JWT does not exist").
    const _jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    const userId = (() => {
      try {
        // JWTs usam base64url (-/_); atob() só aceita base64 padrão (+//).
        const part = (_jwt.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/");
        const padded = part + "=".repeat((4 - part.length % 4) % 4);
        const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
        const sub = payload.sub ?? payload.user_id;
        return typeof sub === "string" && sub.length > 0 ? sub : null;
      } catch { return null; }
    })();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Token inválido ou ausente." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Resolve credenciais Z-API somente a partir da sessão default da empresa do usuário.
    let ZAPI_INSTANCE_ID = "";
    let ZAPI_INSTANCE_TOKEN = "";
    let ZAPI_CLIENT_TOKEN = "";
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
        const c = (sess?.credentials ?? {}) as Record<string, string>;
        if (c.instance_id) ZAPI_INSTANCE_ID = c.instance_id.trim();
        if (c.token) ZAPI_INSTANCE_TOKEN = c.token.trim();
        if (c.client_token) {
          // saneamento: se gravaram a URL inteira ou tiver espaço/quebras, extrai só o token
          const ct = c.client_token.trim();
          if (/^[A-Za-z0-9]{20,}$/.test(ct)) ZAPI_CLIENT_TOKEN = ct;
        }
      }
    } catch (_e) { /* sem credenciais */ }

    if (!ZAPI_INSTANCE_ID || !ZAPI_INSTANCE_TOKEN || !ZAPI_CLIENT_TOKEN) {
      return new Response(JSON.stringify({
        connected: false, qrImage: null, qrCode: null, credentialsError: true,
        message: "Nenhuma conexão Z-API configurada. Clique em \"Conectar\" para cadastrar Instance ID, Token e Client-Token.",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "status";
    const phoneParam = url.searchParams.get("phone") ?? "";
    const newName = url.searchParams.get("name") ?? "";

    const doFetch = async (instId: string, instTok: string, clientTok: string, path: string, init?: RequestInit) => {
      const r = await fetch(`https://api.z-api.io/instances/${instId}/token/${instTok}${path}`, {
        ...(init ?? {}),
        headers: { "Client-Token": clientTok, "Content-Type": "application/json", ...(init?.headers ?? {}) },
      });
      const text = await r.text();
      let body: unknown = text;
      try { body = JSON.parse(text); } catch { /* keep as text */ }
      return { ok: r.ok, status: r.status, body };
    };

    const callZapi = (path: string, init?: RequestInit) =>
      doFetch(ZAPI_INSTANCE_ID, ZAPI_INSTANCE_TOKEN, ZAPI_CLIENT_TOKEN, path, init);

    if (action === "status") {
      const statusResp = await callZapi("/status");
      const s = statusResp.body as
        | { connected?: boolean; smartphoneConnected?: boolean; error?: string; message?: string }
        | undefined;

      if (isCredentialsError(statusResp.body)) {
        return credentialsErrorResponse(statusResp.body);
      }

      const connected = !!s?.connected;
      let qrImage: string | null = null;
      let qrCode: string | null = null;
      if (!connected) {
        const qr = await callZapi("/qr-code/image");
        const qb = qr.body as { value?: string } | string | undefined;
        const raw = typeof qb === "string" ? qb : qb?.value;
        if (raw) {
          qrImage = raw.startsWith("data:") ? raw : `data:image/png;base64,${raw}`;
        } else {
          const rawQrResp = await callZapi("/qr-code");
          const rawQrBody = rawQrResp.body as { value?: string } | string | undefined;
          const rawQr = typeof rawQrBody === "string" ? rawQrBody : rawQrBody?.value;
          if (typeof rawQr === "string" && rawQr.trim().length > 0) {
            qrCode = rawQr.trim();
          }
        }
      }

      return new Response(
        JSON.stringify({ connected, status: s, qrImage, qrCode }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "disconnect") {
      const r = await callZapi("/disconnect");
      if (isCredentialsError(r.body)) return credentialsErrorResponse(r.body);
      return new Response(JSON.stringify({ success: r.ok, response: r.body }), {
        status: r.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "restart") {
      const r = await callZapi("/restart");
      if (isCredentialsError(r.body)) return credentialsErrorResponse(r.body);
      return new Response(JSON.stringify({ success: r.ok, response: r.body }), {
        status: r.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "device") {
      const r = await callZapi("/device");
      if (isCredentialsError(r.body)) return credentialsErrorResponse(r.body);
      return json({ success: r.ok, data: r.body }, r.ok ? 200 : 502);
    }

    if (action === "me") {
      const r = await callZapi("/me");
      if (isCredentialsError(r.body)) return credentialsErrorResponse(r.body);
      return json({ success: r.ok, data: r.body }, r.ok ? 200 : 502);
    }

    if (action === "qr-code") {
      const r = await callZapi("/qr-code");
      return new Response(JSON.stringify({ success: r.ok, data: r.body }), {
        status: r.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "qr-code-image") {
      const r = await callZapi("/qr-code/image");
      return new Response(JSON.stringify({ success: r.ok, data: r.body }), {
        status: r.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "phone-code") {
      // payload via query: phone=55XXXXXXXXXXX
      if (!phoneParam) {
        return new Response(JSON.stringify({ error: "phone obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const r = await callZapi(`/phone-code/${encodeURIComponent(phoneParam)}`);
      return new Response(JSON.stringify({ success: r.ok, data: r.body }), {
        status: r.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "rename") {
      if (!newName) {
        return new Response(JSON.stringify({ error: "name obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const r = await callZapi(`/rename-instance`, { method: "PUT", body: JSON.stringify({ value: newName }) });
      if (isCredentialsError(r.body)) return credentialsErrorResponse(r.body);
      return new Response(JSON.stringify({ success: r.ok, data: r.body }), {
        status: r.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "action inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("zapi-status error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});