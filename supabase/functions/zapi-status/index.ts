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
    const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID");
    const ZAPI_INSTANCE_TOKEN = Deno.env.get("ZAPI_INSTANCE_TOKEN");
    const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!ZAPI_INSTANCE_ID || !ZAPI_INSTANCE_TOKEN || !ZAPI_CLIENT_TOKEN) {
      throw new Error("Credenciais Z-API ausentes");
    }

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

    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "status";
    const base = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_INSTANCE_TOKEN}`;
    const headers = { "Client-Token": ZAPI_CLIENT_TOKEN, "Content-Type": "application/json" };

    const callZapi = async (path: string) => {
      const r = await fetch(`${base}${path}`, { headers });
      const text = await r.text();
      let body: unknown = text;
      try { body = JSON.parse(text); } catch { /* keep as text */ }
      return { ok: r.ok, status: r.status, body };
    };

    if (action === "status") {
      const statusResp = await callZapi("/status");
      const s = statusResp.body as
        | { connected?: boolean; smartphoneConnected?: boolean; error?: string; message?: string }
        | undefined;

      // Detecta credenciais inválidas: Z-API responde 200 + { error: "NOT_FOUND" }
      if (s?.error === "NOT_FOUND") {
        return new Response(
          JSON.stringify({
            connected: false,
            qrImage: null,
            credentialsError: true,
            message:
              "Credenciais Z-API inválidas. Verifique ZAPI_INSTANCE_ID e ZAPI_INSTANCE_TOKEN no painel da Z-API.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const connected = !!s?.connected;
      let qrImage: string | null = null;
      if (!connected) {
        const qr = await callZapi("/qr-code/image");
        const qb = qr.body as { value?: string } | string | undefined;
        const raw = typeof qb === "string" ? qb : qb?.value;
        if (raw) {
          qrImage = raw.startsWith("data:") ? raw : `data:image/png;base64,${raw}`;
        }
      }

      return new Response(
        JSON.stringify({ connected, status: s, qrImage }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "disconnect") {
      const r = await callZapi("/disconnect");
      return new Response(JSON.stringify({ success: r.ok, response: r.body }), {
        status: r.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "restart") {
      const r = await callZapi("/restart");
      return new Response(JSON.stringify({ success: r.ok, response: r.body }), {
        status: r.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "action inválida (use status|disconnect|restart)" }), {
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