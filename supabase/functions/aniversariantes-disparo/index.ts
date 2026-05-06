import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function render(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (_m, k) => vars[k] ?? "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID")!;
    const ZAPI_INSTANCE_TOKEN = Deno.env.get("ZAPI_INSTANCE_TOKEN")!;
    const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Permite forçar via body (botão manual) — { force: true }
    const body = await req.json().catch(() => ({}));
    const force = body?.force === true;

    const { data: cfg } = await admin.from("aniversariantes_config").select("*").limit(1).single();
    if (!cfg) return new Response(JSON.stringify({ error: "Sem config" }), { status: 500, headers: corsHeaders });
    if (!cfg.ativo && !force) {
      return new Response(JSON.stringify({ ok: true, skipped: "desativado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Busca eleitores
    let q = admin.from("eleitores").select("id,nome,telefone,data_nascimento,consentimento_lgpd").not("data_nascimento", "is", null).limit(2000);
    const { data: rows } = await q;
    const hoje = new Date();
    const dia = hoje.getDate();
    const mes = hoje.getMonth() + 1;
    const aniversariantes = (rows ?? []).filter((e: any) => {
      if (!e.data_nascimento || !e.telefone) return false;
      if (cfg.apenas_lgpd && !e.consentimento_lgpd) return false;
      const d = new Date(e.data_nascimento);
      return d.getDate() === dia && (d.getMonth() + 1) === mes;
    });

    const zapiUrl = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_INSTANCE_TOKEN}/send-text`;
    let enviados = 0, falhas = 0, pulados = 0;

    for (const e of aniversariantes) {
      // dedupe pelo log do dia
      const { data: log } = await admin.from("aniversariantes_log")
        .select("id").eq("eleitor_id", e.id).eq("data_envio", new Date().toISOString().slice(0, 10)).maybeSingle();
      if (log) { pulados++; continue; }

      const phone = String(e.telefone).replace(/\D/g, "");
      const message = render(cfg.template, { nome: (e.nome || "").split(" ")[0] });
      try {
        const r = await fetch(zapiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Client-Token": ZAPI_CLIENT_TOKEN },
          body: JSON.stringify({ phone, message }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          falhas++;
          await admin.from("aniversariantes_log").insert({ eleitor_id: e.id, status: "Falhou", erro: data?.error || `HTTP ${r.status}` });
        } else {
          enviados++;
          await admin.from("aniversariantes_log").insert({ eleitor_id: e.id, status: "Enviado" });
          await admin.from("mensagens_externas").insert({
            user_id: cfg.id, // placeholder; trigger é sistema
            canal: "WhatsApp", destinatario: phone, destinatario_nome: e.nome,
            conteudo: message, status: "Enviado", provedor: "Z-API",
            provedor_message_id: data?.messageId || data?.id || null,
            enviado_em: new Date().toISOString(), metadata: { trigger: "aniversariante" },
          });
        }
        await new Promise((res) => setTimeout(res, 350));
      } catch (err) {
        falhas++;
        await admin.from("aniversariantes_log").insert({
          eleitor_id: e.id, status: "Falhou",
          erro: err instanceof Error ? err.message : "Erro",
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, total: aniversariantes.length, enviados, falhas, pulados }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("aniversariantes-disparo:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});