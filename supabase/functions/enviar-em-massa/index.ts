import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function renderTemplate(tpl: string, vars: Record<string, string | null | undefined>) {
  return tpl.replace(/\{(\w+)\}/g, (_m, k) => (vars[k] ?? "").toString());
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID");
    const ZAPI_INSTANCE_TOKEN = Deno.env.get("ZAPI_INSTANCE_TOKEN");
    const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: ud, error: ue } = await supabaseUser.auth.getUser();
    if (ue || !ud.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json();
    const {
      mensagem_id,
      template,
      destinatarios,
    } = body as {
      mensagem_id: string;
      template: string;
      destinatarios: { eleitor_id?: string | null; nome?: string | null; telefone: string }[];
    };

    if (!mensagem_id || !template || !Array.isArray(destinatarios) || destinatarios.length === 0) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ZAPI_INSTANCE_ID || !ZAPI_INSTANCE_TOKEN || !ZAPI_CLIENT_TOKEN) {
      return new Response(JSON.stringify({ error: "Credenciais Z-API ausentes" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const zapiUrl = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_INSTANCE_TOKEN}/send-text`;

    let enviados = 0;
    let falhas = 0;

    for (const d of destinatarios) {
      const phone = (d.telefone || "").replace(/\D/g, "");
      if (!phone) {
        falhas++;
        await admin.from("mensagem_envios").insert({
          mensagem_id, eleitor_id: d.eleitor_id ?? null,
          destinatario_nome: d.nome ?? null, destinatario_telefone: d.telefone || "",
          canal: "WhatsApp", conteudo: template,
          status: "Falhou", erro: "Telefone vazio/ inválido", tentativas: 1,
        });
        continue;
      }
      const conteudo = renderTemplate(template, { nome: d.nome ?? "", telefone: phone });
      try {
        const r = await fetch(zapiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Client-Token": ZAPI_CLIENT_TOKEN },
          body: JSON.stringify({ phone, message: conteudo }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          falhas++;
          await admin.from("mensagem_envios").insert({
            mensagem_id, eleitor_id: d.eleitor_id ?? null,
            destinatario_nome: d.nome ?? null, destinatario_telefone: phone,
            canal: "WhatsApp", conteudo, status: "Falhou", provedor: "Z-API",
            erro: data?.error || data?.message || `HTTP ${r.status}`, tentativas: 1,
            metadata: { response: data },
          });
        } else {
          enviados++;
          await admin.from("mensagem_envios").insert({
            mensagem_id, eleitor_id: d.eleitor_id ?? null,
            destinatario_nome: d.nome ?? null, destinatario_telefone: phone,
            canal: "WhatsApp", conteudo, status: "Enviado", provedor: "Z-API",
            provedor_message_id: data?.messageId || data?.id || null,
            enviado_em: new Date().toISOString(), tentativas: 1,
            metadata: { response: data },
          });
        }
        // pequeno delay para não estourar rate limit Z-API
        await new Promise((res) => setTimeout(res, 350));
      } catch (e) {
        falhas++;
        await admin.from("mensagem_envios").insert({
          mensagem_id, eleitor_id: d.eleitor_id ?? null,
          destinatario_nome: d.nome ?? null, destinatario_telefone: phone,
          canal: "WhatsApp", conteudo, status: "Falhou", provedor: "Z-API",
          erro: e instanceof Error ? e.message : "Erro desconhecido", tentativas: 1,
        });
      }
    }

    await admin.from("mensagens").update({
      status: falhas === 0 ? "Enviada" : enviados === 0 ? "Falhou" : "Parcial",
      total_destinatarios: destinatarios.length,
    }).eq("id", mensagem_id);

    return new Response(JSON.stringify({ enviados, falhas, total: destinatarios.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    console.error("enviar-em-massa:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});