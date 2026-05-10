// Sincroniza templates aprovados da Meta WhatsApp Business para uma API do envio em massa.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function statusMap(s: string): string {
  const x = (s || "").toUpperCase();
  if (x === "APPROVED") return "aprovado";
  if (x === "REJECTED") return "rejeitado";
  return "pendente";
}

function extractBody(components: any[]): { body: string; header: string | null; footer: string | null; vars: number } {
  let body = "", header: string | null = null, footer: string | null = null;
  for (const c of components ?? []) {
    if (c.type === "BODY") body = c.text ?? "";
    if (c.type === "HEADER") header = c.text ?? c.format ?? null;
    if (c.type === "FOOTER") footer = c.text ?? null;
  }
  const matches = body.match(/\{\{\d+\}\}/g) ?? [];
  return { body, header, footer, vars: matches.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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
  const { data: userData, error: userErr } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { api_id } = await req.json().catch(() => ({}));
  if (!api_id) {
    return new Response(JSON.stringify({ error: "api_id obrigatório" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Carrega API com service role para acessar access_token bypassing RLS já validado
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: api } = await admin
    .from("wa_bulk_apis").select("*").eq("id", api_id).maybeSingle();
  if (!api) {
    return new Response(JSON.stringify({ error: "API não encontrada" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!api.waba_id || !api.access_token) {
    return new Response(JSON.stringify({ error: "API sem WABA ID ou token" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = `https://graph.facebook.com/v20.0/${api.waba_id}/message_templates?limit=200`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${api.access_token}` },
  });
  const json = await res.json();
  if (!res.ok) {
    return new Response(JSON.stringify({ error: json?.error?.message ?? "Erro Meta" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let inserted = 0, updated = 0;
  for (const t of json.data ?? []) {
    const ext = extractBody(t.components ?? []);
    const row = {
      company_id: api.company_id,
      api_id: api.id,
      nome: t.name,
      categoria: (t.category ?? "UTILITY").toUpperCase(),
      idioma: t.language ?? "pt_BR",
      status: statusMap(t.status),
      header_type: ext.header ? "TEXT" : null,
      header_content: ext.header,
      body_text: ext.body,
      footer_text: ext.footer,
      meta_template_id: t.id ?? null,
      variaveis: Array.from({ length: ext.vars }, (_, i) => `{{${i + 1}}}`),
    };
    const { data: exist } = await admin
      .from("wa_bulk_templates").select("id")
      .eq("company_id", api.company_id).eq("nome", t.name).eq("idioma", row.idioma)
      .maybeSingle();
    if (exist?.id) {
      await admin.from("wa_bulk_templates").update(row).eq("id", exist.id);
      updated++;
    } else {
      await admin.from("wa_bulk_templates").insert(row);
      inserted++;
    }
  }

  return new Response(JSON.stringify({ inserted, updated, total: (json.data ?? []).length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});