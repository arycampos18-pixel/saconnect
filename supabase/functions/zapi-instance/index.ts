import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  try {
    const ENV_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID");
    const ENV_INSTANCE_TOKEN = Deno.env.get("ZAPI_INSTANCE_TOKEN");
    const ENV_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Sessão inválida" }, 401);

    let ZAPI_INSTANCE_ID = ENV_INSTANCE_ID ?? "";
    let ZAPI_INSTANCE_TOKEN = ENV_INSTANCE_TOKEN ?? "";
    let ZAPI_CLIENT_TOKEN = ENV_CLIENT_TOKEN ?? "";
    try {
      const { data: companyId } = await supabase.rpc("user_default_company", { _user_id: userData.user.id });
      if (companyId) {
        const { data: sess } = await supabase
          .from("whatsapp_sessions").select("credentials")
          .eq("company_id", companyId).eq("provider", "zapi")
          .order("is_default", { ascending: false }).limit(1).maybeSingle();
        const c = (sess?.credentials ?? {}) as Record<string, string>;
        if (c.instance_id) ZAPI_INSTANCE_ID = c.instance_id.trim();
        if (c.token) ZAPI_INSTANCE_TOKEN = c.token.trim();
        if (c.client_token) {
          const ct = c.client_token.trim();
          if (/^[A-Za-z0-9]{20,}$/.test(ct)) ZAPI_CLIENT_TOKEN = ct;
        }
      }
    } catch (_e) { /* fallback env */ }

    const { action, payload = {} } = await req.json().catch(() => ({}));
    if (!action) return json({ error: "action é obrigatório" }, 400);

    // Partner não exige instance_id/token
    const isPartner = String(action).startsWith("partner-");
    if (!isPartner && (!ZAPI_INSTANCE_ID || !ZAPI_INSTANCE_TOKEN || !ZAPI_CLIENT_TOKEN)) {
      return json({ error: "Credenciais Z-API ausentes (cadastre uma conexão Z-API)" }, 400);
    }

    const base = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_INSTANCE_TOKEN}`;
    const headers = { "Client-Token": ZAPI_CLIENT_TOKEN, "Content-Type": "application/json" };

    const call = async (method: string, path: string, body?: unknown) => {
      const r = await fetch(`${base}${path}`, {
        method, headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await r.text();
      let data: unknown = text;
      try { data = JSON.parse(text); } catch { /* keep */ }
      return { ok: r.ok, status: r.status, data };
    };

    const callPartner = async (method: string, path: string, body?: unknown) => {
      const PARTNER_TOKEN = (Deno.env.get("ZAPI_PARTNER_TOKEN") || "").trim();
      if (!PARTNER_TOKEN) {
        return { ok: false, status: 400, data: { error: "ZAPI_PARTNER_TOKEN ausente. Cadastre o Partner Token (gerado no painel Z-API > Parceiros) nos secrets." } };
      }
      const r = await fetch(`https://api.z-api.io/partners${path}`, {
        method,
        headers: { "Partner-Token": PARTNER_TOKEN, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await r.text();
      let data: unknown = text;
      try { data = JSON.parse(text); } catch { /* keep */ }
      return { ok: r.ok, status: r.status, data };
    };

    let result;
    switch (action) {
      // ========= PARTNER =========
      case "partner-list-instances": result = await callPartner("GET", "/instances"); break;
      case "partner-create-instance": result = await callPartner("POST", "/instances", payload); break;
      case "partner-sign-instance": result = await callPartner("POST", "/instances/sign", payload); break;
      case "partner-unsubscribe-instance": result = await callPartner("POST", "/instances/unsubscribe", payload); break;
      case "partner-update-instance": result = await callPartner("PUT", "/instances", payload); break;

      // ========= PERFIL =========
      case "get-profile": result = await call("GET", "/profile-picture"); break;
      case "update-profile-name": result = await call("PUT", "/profile-name", { value: payload.value }); break;
      case "update-profile-description": result = await call("PUT", "/profile-description", { value: payload.value }); break;
      case "update-profile-picture": result = await call("PUT", "/profile-picture", { value: payload.value }); break;

      // ========= LEITURA AUTOMÁTICA =========
      case "update-auto-read-message": result = await call("PUT", "/update-auto-read-message", { value: !!payload.value }); break;
      case "update-auto-read-status": result = await call("PUT", "/update-auto-read-status", { value: !!payload.value }); break;

      // ========= CHAMADAS (config) =========
      case "update-call-reject-auto": result = await call("PUT", "/update-call-reject-auto", { value: !!payload.value }); break;
      case "update-call-reject-message": result = await call("PUT", "/update-call-reject-message", { value: payload.value ?? "" }); break;

      // ========= UTILITÁRIOS =========
      case "phone-exists": result = await call("GET", `/phone-exists/${encodeURIComponent(payload.phone)}`); break;

      // ========= MENSAGENS =========
      case "react-message": result = await call("POST", "/send-reaction", payload); break;
      case "remove-reaction": result = await call("POST", "/send-reaction-remove", payload); break;
      case "edit-message": result = await call("POST", "/edit-message", payload); break;
      case "delete-message":
        result = await call("DELETE",
          `/messages?phone=${encodeURIComponent(payload.phone)}&messageId=${encodeURIComponent(payload.messageId)}&owner=${encodeURIComponent(payload.owner ?? "true")}`);
        break;
      case "read-message": result = await call("POST", "/read-message", payload); break;
      case "pin-message": result = await call("POST", "/pin-message", payload); break;
      case "forward-message": result = await call("POST", "/forward-message", payload); break;
      case "reply-message": result = await call("POST", "/send-text", payload); break;

      // ========= MÍDIA / ENVIOS =========
      case "send-text": result = await call("POST", "/send-text", payload); break;
      case "send-image": result = await call("POST", "/send-image", payload); break;
      case "send-sticker": result = await call("POST", "/send-sticker", payload); break;
      case "send-gif": result = await call("POST", "/send-gif", payload); break;
      case "send-audio": result = await call("POST", "/send-audio", payload); break;
      case "send-video": result = await call("POST", "/send-video", payload); break;
      case "send-ptv": result = await call("POST", "/send-ptv", payload); break;
      case "send-document":
        result = await call("POST", `/send-document/${encodeURIComponent(payload.extension ?? "pdf")}`, payload);
        break;
      case "send-link": result = await call("POST", "/send-link", payload); break;
      case "send-location": result = await call("POST", "/send-location", payload); break;
      case "send-contact": result = await call("POST", "/send-contact", payload); break;
      case "send-multiple-contacts": result = await call("POST", "/send-contacts", payload); break;

      // ========= INTERATIVOS =========
      case "send-button-actions": result = await call("POST", "/send-button-actions", payload); break;
      case "send-button-list-image": result = await call("POST", "/send-button-list-image", payload); break;
      case "send-button-list-video": result = await call("POST", "/send-button-list-video", payload); break;
      case "send-option-list": result = await call("POST", "/send-option-list", payload); break;
      case "send-button-otp": result = await call("POST", "/send-button-otp", payload); break;
      case "send-button-pix": result = await call("POST", "/send-button-pix", payload); break;
      case "send-carousel": result = await call("POST", "/send-carousel", payload); break;
      case "send-poll": result = await call("POST", "/send-poll", payload); break;
      case "send-button-list": result = await call("POST", "/send-button-list", payload); break;

      // ========= CONTATO =========
      case "block-contact": result = await call("POST", "/modify-chat", { phone: payload.phone, action: "block" }); break;
      case "unblock-contact": result = await call("POST", "/modify-chat", { phone: payload.phone, action: "unblock" }); break;
      case "get-contacts":
        result = await call("GET", `/contacts?page=${payload.page ?? 1}&pageSize=${payload.pageSize ?? 20}`);
        break;
      case "add-contact": result = await call("POST", "/add-contact", payload); break;
      case "remove-contact": result = await call("DELETE", `/contacts/${encodeURIComponent(payload.phone)}`); break;
      case "get-metadata-contact": result = await call("GET", `/contacts/${encodeURIComponent(payload.phone)}`); break;
      case "get-profile-picture-contact": result = await call("GET", `/profile-picture/${encodeURIComponent(payload.phone)}`); break;

      // ========= CHATS =========
      case "get-chats":
        result = await call("GET", `/chats?page=${payload.page ?? 1}&pageSize=${payload.pageSize ?? 20}`);
        break;
      case "get-metadata-chat": result = await call("GET", `/chats/${encodeURIComponent(payload.phone)}`); break;
      case "read-chat": result = await call("POST", "/read-chat", { phone: payload.phone }); break;
      case "archive-chat": result = await call("POST", "/archive-chat", { phone: payload.phone, value: payload.value ?? true }); break;
      case "pin-chat": result = await call("POST", "/pin-chat", { phone: payload.phone, value: payload.value ?? true }); break;
      case "mute-chat": result = await call("POST", "/mute-chat", { phone: payload.phone, value: payload.value ?? true }); break;
      case "clear-chat": result = await call("POST", "/clear-chat", { phone: payload.phone }); break;
      case "delete-chat": result = await call("DELETE", `/chats/${encodeURIComponent(payload.phone)}`); break;
      case "send-chat-expiration":
        result = await call("POST", "/send-chat-expiration", { phone: payload.phone, expiration: payload.expiration ?? 0 });
        break;

      // ========= CALLS =========
      case "send-call": result = await call("POST", "/send-call", payload); break;
      case "get-call-token": result = await call("GET", "/call-token"); break;
      case "get-sip-token": result = await call("GET", "/sip-token"); break;
      case "get-sip-info": result = await call("GET", "/sip-info"); break;

      // ========= STATUS (STORIES) =========
      case "send-text-status": result = await call("POST", "/send-text-status", payload); break;
      case "send-image-status": result = await call("POST", "/send-image-status", payload); break;
      case "send-video-status": result = await call("POST", "/send-video-status", payload); break;
      case "reply-status-text": result = await call("POST", "/reply-status-text", payload); break;
      case "reply-status-gif": result = await call("POST", "/reply-status-gif", payload); break;
      case "reply-status-sticker": result = await call("POST", "/reply-status-sticker", payload); break;

      // ========= QUEUE =========
      case "get-queue": result = await call("GET", "/queue"); break;
      case "delete-queue": result = await call("DELETE", "/queue"); break;
      case "delete-queue-id": result = await call("DELETE", `/queue/${encodeURIComponent(payload.messageId)}`); break;
      case "update-queue-settings": result = await call("PUT", "/queue-settings", payload); break;

      // ========= WEBHOOKS =========
      // "Ao receber" — mensagens recebidas pelo número
      case "update-webhook": result = await call("PUT", "/update-webhook-received", { value: payload.value }); break;
      // "Ao enviar" — mensagens enviadas pelo dispositivo físico
      case "update-webhook-send-url": result = await call("PUT", "/update-webhook-send", { value: payload.value }); break;
      // Toggle "Notificar as enviadas por mim também"
      case "update-notify-sent-by-me": result = await call("PUT", "/update-webhook-notify-me", { value: !!payload.value }); break;
      // "Receber status da mensagem" (enviado, entregue, lido)
      case "update-webhook-status": result = await call("PUT", "/update-webhook-message-status", { value: payload.value }); break;
      // "Ao desconectar"
      case "update-webhook-disconnected": result = await call("PUT", "/update-webhook-disconnected", { value: payload.value }); break;
      // "Ao conectar"
      case "update-webhook-connected": result = await call("PUT", "/update-webhook-connected", { value: payload.value }); break;
      // "Presença do chat"
      case "update-webhook-presence": result = await call("PUT", "/update-webhook-chat-presence", { value: payload.value }); break;

      default:
        return json({ error: `Ação desconhecida: ${action}` }, 400);
    }

    return json({ success: result.ok, status: result.status, data: result.data }, result.ok ? 200 : 502);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("zapi-instance error:", msg);
    return json({ error: msg }, 500);
  }
});
