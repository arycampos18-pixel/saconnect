import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Recebe { evento, payload } e dispara para todos os webhooks_saida ativos
 * que tenham o evento na lista. Pode ser chamado pelo frontend ou por outras
 * edge functions (com service role).
 */
async function hmac(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json();
    const { evento, payload } = body as { evento: string; payload: unknown };
    if (!evento) return new Response(JSON.stringify({ error: "evento obrigatório" }), { status: 400, headers: corsHeaders });

    const { data: hooks } = await admin.from("webhooks_saida")
      .select("*").eq("ativo", true).contains("eventos", [evento]);

    let entregues = 0, falhas = 0;
    for (const h of hooks ?? []) {
      const json = JSON.stringify({ evento, payload, ts: new Date().toISOString() });
      const headers: Record<string, string> = { "Content-Type": "application/json", "User-Agent": "MandatoApp-Webhook" };
      if (h.secret) headers["X-Signature-256"] = await hmac(h.secret, json);
      let status_code: number | null = null, sucesso = false, resposta = "", erro: string | null = null;
      try {
        const r = await fetch(h.url, { method: "POST", headers, body: json });
        status_code = r.status;
        sucesso = r.ok;
        resposta = (await r.text()).slice(0, 500);
        if (r.ok) entregues++; else falhas++;
      } catch (e) {
        falhas++;
        erro = e instanceof Error ? e.message : "Erro de rede";
      }
      await admin.from("webhook_entregas").insert({
        webhook_id: h.id, evento, payload: payload as any,
        status_code, sucesso, resposta, erro,
      });
      await admin.from("webhooks_saida").update({
        total_disparos: (h.total_disparos ?? 0) + 1,
        ultimo_disparo_em: new Date().toISOString(),
      }).eq("id", h.id);
    }

    return new Response(JSON.stringify({ ok: true, entregues, falhas, total: (hooks ?? []).length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("webhook-dispatcher:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});