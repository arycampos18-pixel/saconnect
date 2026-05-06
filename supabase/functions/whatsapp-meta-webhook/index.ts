import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);

  // Meta webhook verification
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token) {
      const { data: s } = await admin
        .from("whatsapp_meta_sessions")
        .select("id")
        .eq("verify_token", token)
        .maybeSingle();
      if (s) {
        await admin
          .from("whatsapp_meta_sessions")
          .update({ webhook_verified_at: new Date().toISOString() })
          .eq("id", s.id);
        return new Response(challenge ?? "ok", { status: 200 });
      }
    }
    return new Response("forbidden", { status: 403 });
  }

  try {
    const body = await req.json();
    const entries = body?.entry ?? [];
    for (const entry of entries) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};
        const phoneId = value.metadata?.phone_number_id;
        if (!phoneId) continue;

        const { data: session } = await admin
          .from("whatsapp_meta_sessions")
          .select("id, company_id")
          .eq("phone_number_id", phoneId)
          .maybeSingle();
        if (!session) continue;

        // Inbound messages → leads
        for (const msg of value.messages ?? []) {
          const phone = msg.from;
          await admin.from("whatsapp_meta_leads").insert({
            company_id: session.company_id,
            session_id: session.id,
            phone_number: phone,
            name: value.contacts?.[0]?.profile?.name ?? null,
            interaction_type: msg.type ?? "message_received",
            interaction_data: msg,
            status: "new",
            first_interaction_at: new Date().toISOString(),
            last_interaction_at: new Date().toISOString(),
          });
        }

        // Status updates
        for (const st of value.statuses ?? []) {
          const updates: Record<string, unknown> = { status: st.status };
          const ts = new Date(Number(st.timestamp) * 1000).toISOString();
          if (st.status === "sent") updates.sent_at = ts;
          if (st.status === "delivered") updates.delivered_at = ts;
          if (st.status === "read") updates.read_at = ts;
          if (st.status === "failed") {
            updates.status = "error";
            updates.error_message = JSON.stringify(st.errors ?? {});
          }

          const { data: contact } = await admin
            .from("whatsapp_meta_campaign_contacts")
            .update(updates)
            .eq("message_id", st.id)
            .select("campaign_id")
            .maybeSingle();

          if (contact?.campaign_id) {
            const colMap: Record<string, string> = {
              sent: "sent_count",
              delivered: "delivered_count",
              read: "read_count",
              error: "error_count",
            };
            const col = colMap[updates.status as string];
            if (col) {
              await admin.rpc("increment_meta_campaign_counter", {
                _campaign_id: contact.campaign_id,
                _column: col,
              }).catch(() => null);
            }
          }
        }
      }
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});