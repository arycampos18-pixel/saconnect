// Submete um template HSM ao WhatsApp Business da Meta (Graph API).
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
    const { data: userData, error: userErr } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { template_id, api_id } = body as { template_id?: string; api_id?: string };
    if (!template_id || !api_id) {
      return new Response(JSON.stringify({ error: "template_id e api_id obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tpl } = await admin.from("wa_bulk_templates").select("*").eq("id", template_id).maybeSingle();
    if (!tpl) {
      return new Response(JSON.stringify({ error: "Template não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: api } = await admin.from("wa_bulk_apis").select("*").eq("id", api_id).maybeSingle();
    if (!api?.waba_id || !api?.access_token) {
      return new Response(JSON.stringify({ error: "API sem WABA ID ou token" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Monta componentes
    const components: any[] = [];
    if (tpl.header_content) {
      components.push({ type: "HEADER", format: "TEXT", text: tpl.header_content });
    }
    components.push({ type: "BODY", text: tpl.body_text });
    if (tpl.footer_text) {
      components.push({ type: "FOOTER", text: tpl.footer_text });
    }

    const payload = {
      name: tpl.nome,
      language: tpl.idioma || "pt_BR",
      category: (tpl.categoria || "UTILITY").toUpperCase(),
      components,
    };

    const url = `https://graph.facebook.com/v20.0/${api.waba_id}/message_templates`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${api.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      const metaErr = json?.error ?? {};
      let msg = metaErr.error_user_msg || metaErr.message || "Erro ao enviar para Meta";
      const subcode = metaErr.error_subcode;
      // 2388025 = categoria não pode ser alterada enquanto o conteúdo anterior está sendo excluído
      if (subcode === 2388025) {
        msg = `Já existe um template "${tpl.nome}" em ${tpl.idioma} sendo excluído na Meta. Aguarde ~1 minuto e tente novamente, ou use a categoria MARKETING, ou escolha outro nome.`;
      }
      await admin.from("wa_bulk_templates").update({
        status: "rejeitado",
        rejected_reason: msg,
      }).eq("id", template_id);
      // Retorna 200 com ok:false para não quebrar o cliente (supabase-js lança em não-2xx).
      return new Response(JSON.stringify({ ok: false, error: msg, code: subcode ?? null, meta: metaErr }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("wa_bulk_templates").update({
      api_id,
      meta_template_id: json.id ?? null,
      status: statusMap(json.status ?? "PENDING"),
      rejected_reason: null,
    }).eq("id", template_id);

    return new Response(JSON.stringify({ ok: true, meta_id: json.id, status: json.status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});