import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Webhook público chamado pelo Z-API quando o status de uma mensagem muda.
 * Configure no painel Z-API em Webhooks → "Ao receber status da mensagem":
 *   https://<project>.supabase.co/functions/v1/webhook-zapi
 * Tipos relevantes: SENT, RECEIVED, READ, DELIVERY_ACK
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const payload = await req.json().catch(() => ({}));
    const messageId: string | undefined = payload?.messageId || payload?.id;
    const status: string | undefined = (payload?.status || payload?.type || "").toString().toUpperCase();

    if (!messageId) {
      return new Response(JSON.stringify({ ok: true, ignored: "no messageId" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const map: Record<string, { status?: string; field?: string }> = {
      SENT: { status: "Enviado", field: "enviado_em" },
      RECEIVED: { status: "Entregue", field: "entregue_em" },
      DELIVERY_ACK: { status: "Entregue", field: "entregue_em" },
      READ: { status: "Lido", field: "lido_em" },
      "READ-SELF": { status: "Lido", field: "lido_em" },
      PLAYED: { status: "Lido", field: "lido_em" },
    };
    const m = map[status] ?? {};
    const update: Record<string, unknown> = { metadata: payload };
    if (m.status) update.status = m.status;
    if (m.field) update[m.field] = new Date().toISOString();

    await admin.from("mensagem_envios")
      .update(update)
      .eq("provedor_message_id", messageId);

    await admin.from("mensagens_externas")
      .update(update)
      .eq("provedor_message_id", messageId);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("webhook-zapi:", e);
    return new Response(JSON.stringify({ ok: false }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});