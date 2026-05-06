import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: claims } = await supabase.auth.getClaims(auth.replace("Bearer ", ""));
    if (!claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { session_id } = await req.json().catch(() => ({}));
    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: session } = await supabase
      .from("whatsapp_meta_sessions").select("*").eq("id", session_id).maybeSingle();
    if (!session?.access_token || !session.waba_id) {
      return new Response(JSON.stringify({ error: "Sessão sem credenciais" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `https://graph.facebook.com/v20.0/${session.waba_id}/message_templates?limit=200`;
    const res = await fetch(url, {
      headers: { "Authorization": `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: json }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const templates = json.data ?? [];
    let synced = 0;
    for (const t of templates) {
      const components = t.components ?? [];
      const header = components.find((c: any) => c.type === "HEADER");
      const bodyC = components.find((c: any) => c.type === "BODY");
      const footer = components.find((c: any) => c.type === "FOOTER");
      const buttons = components.find((c: any) => c.type === "BUTTONS");
      await supabase.from("whatsapp_meta_templates").upsert(
        {
          company_id: session.company_id,
          session_id: session.id,
          template_id: t.id,
          name: t.name,
          category: t.category ?? "MARKETING",
          language: t.language ?? "pt_BR",
          header_type: header?.format ?? null,
          header_text: header?.text ?? null,
          body_text: bodyC?.text ?? "",
          footer_text: footer?.text ?? null,
          buttons: buttons?.buttons ?? [],
          status: t.status ?? "PENDING",
          rejection_reason: t.rejected_reason ?? null,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "session_id,name,language" },
      );
      synced++;
    }
    return new Response(JSON.stringify({ synced_count: synced }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});