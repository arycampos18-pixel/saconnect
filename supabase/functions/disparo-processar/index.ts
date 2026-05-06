import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function render(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (_m, k) => vars[k] ?? "");
}

function saudacaoLocal(): string {
  const now = new Date();
  const local = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const h = local.getUTCHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function rand(min: number, max: number) {
  if (max <= min) return Math.max(0, min);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function dentroJanela(inicio: string | null, fim: string | null): boolean {
  if (!inicio || !fim) return true;
  const now = new Date();
  // UTC-3
  const local = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const hhmm = `${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}`;
  return hhmm >= inicio.slice(0, 5) && hhmm <= fim.slice(0, 5);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID");
    const ZAPI_INSTANCE_TOKEN = Deno.env.get("ZAPI_INSTANCE_TOKEN");
    const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");
    if (!ZAPI_INSTANCE_ID || !ZAPI_INSTANCE_TOKEN || !ZAPI_CLIENT_TOKEN) {
      return new Response(JSON.stringify({ error: "Z-API ausente" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { disparo_id } = await req.json();
    if (!disparo_id) return new Response(JSON.stringify({ error: "disparo_id obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: disp, error: e1 } = await admin.from("disparos").select("*").eq("id", disparo_id).single();
    if (e1 || !disp) return new Response(JSON.stringify({ error: "Disparo não encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (["concluido", "cancelado"].includes(disp.status)) {
      return new Response(JSON.stringify({ skip: true, status: disp.status }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (disp.agendado_para && new Date(disp.agendado_para) > new Date()) {
      return new Response(JSON.stringify({ skip: true, motivo: "agendado_futuro" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!dentroJanela(disp.janela_inicio, disp.janela_fim)) {
      return new Response(JSON.stringify({ skip: true, motivo: "fora_janela" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (disp.status !== "processando") {
      await admin.from("disparos").update({ status: "processando", iniciado_em: disp.iniciado_em ?? new Date().toISOString() }).eq("id", disparo_id);
    }

    // Reset contador diário se virou o dia
    const hoje = new Date().toISOString().slice(0, 10);
    if (disp.data_referencia_diaria !== hoje) {
      await admin.from("disparos").update({ enviados_hoje: 0, data_referencia_diaria: hoje }).eq("id", disparo_id);
      disp.enviados_hoje = 0;
      disp.data_referencia_diaria = hoje;
    }
    if (disp.limite_diario && disp.enviados_hoje >= disp.limite_diario) {
      return new Response(JSON.stringify({ skip: true, motivo: "limite_diario" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (disp.agendado_fim && new Date(disp.agendado_fim) <= new Date()) {
      await admin.from("disparos").update({ status: "concluido", concluido_em: new Date().toISOString() }).eq("id", disparo_id);
      return new Response(JSON.stringify({ skip: true, motivo: "agendado_fim" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const lote = Math.max(1, Math.min(200, disp.lote_tamanho ?? 30));
    const intMin = Math.max(0, disp.intervalo_min_segundos ?? disp.intervalo_segundos ?? 3);
    const intMax = Math.max(intMin, disp.intervalo_max_segundos ?? disp.intervalo_segundos ?? intMin);
    const pausaA = Math.max(0, disp.pausa_a_cada ?? 0);
    const pausaSeg = Math.max(0, disp.pausa_segundos ?? 0) * 1000;
    const limite = Math.max(0, disp.limite_diario ?? 0);
    const restanteHoje = limite ? Math.max(0, limite - (disp.enviados_hoje ?? 0)) : Infinity;
    const loteFinal = Math.min(lote, restanteHoje);

    const { data: pendentes } = await admin
      .from("disparo_destinatarios")
      .select("*")
      .eq("disparo_id", disparo_id)
      .eq("status", "pendente")
      .order("created_at")
      .limit(loteFinal);

    let enviados = 0, falhas = 0;
    let processadosNaSessao = (disp.enviados_hoje ?? 0);
    const zapiUrl = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_INSTANCE_TOKEN}/send-text`;

    for (const r of pendentes ?? []) {
      // Verifica se ainda está processando
      const { data: cur } = await admin.from("disparos").select("status").eq("id", disparo_id).single();
      if (cur?.status !== "processando") break;

      await admin.from("disparo_destinatarios").update({ status: "enviando", tentativas: (r.tentativas ?? 0) + 1 }).eq("id", r.id);
      const primeiro = (r.nome ?? "").split(/\s+/)[0] ?? "";
      let conteudo = render(disp.template, { nome: r.nome ?? "", primeiro_nome: primeiro, saudacao: saudacaoLocal() });
      if (disp.prepend_nome && primeiro && !/^\s*(ol[áa]|oi|bom|boa)/i.test(conteudo)) {
        conteudo = `${primeiro}, ${conteudo}`;
      }
      if (disp.prepend_saudacao) {
        conteudo = `${saudacaoLocal()}${primeiro ? `, ${primeiro}` : ""}! ${conteudo}`;
      }
      try {
        const resp = await fetch(zapiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Client-Token": ZAPI_CLIENT_TOKEN },
          body: JSON.stringify({ phone: r.telefone_digits, message: conteudo }),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          falhas++;
          await admin.from("disparo_destinatarios").update({
            status: "falhou", erro: data?.error || data?.message || `HTTP ${resp.status}`,
            conteudo_enviado: conteudo,
          }).eq("id", r.id);
        } else {
          enviados++;
          processadosNaSessao++;
          await admin.from("disparo_destinatarios").update({
            status: "enviado", enviado_em: new Date().toISOString(),
            provedor_message_id: data?.messageId || data?.id || null,
            conteudo_enviado: conteudo,
          }).eq("id", r.id);
        }
      } catch (e) {
        falhas++;
        await admin.from("disparo_destinatarios").update({
          status: "falhou", erro: e instanceof Error ? e.message : "erro",
          conteudo_enviado: conteudo,
        }).eq("id", r.id);
      }
      // Pausa longa periódica para evitar ban
      if (pausaA > 0 && pausaSeg > 0 && processadosNaSessao > 0 && processadosNaSessao % pausaA === 0) {
        await new Promise((res) => setTimeout(res, pausaSeg));
      } else {
        const wait = rand(intMin, intMax) * 1000;
        if (wait > 0) await new Promise((res) => setTimeout(res, wait));
      }
    }

    // Atualiza contadores agregados
    const { data: agg } = await admin
      .from("disparo_destinatarios")
      .select("status")
      .eq("disparo_id", disparo_id);
    const env = (agg ?? []).filter((x: any) => x.status === "enviado").length;
    const fal = (agg ?? []).filter((x: any) => x.status === "falhou").length;
    const pen = (agg ?? []).filter((x: any) => x.status === "pendente" || x.status === "enviando").length;

    const updates: Record<string, unknown> = {
      enviados: env, falhas: fal,
      enviados_hoje: processadosNaSessao,
      data_referencia_diaria: hoje,
    };
    if (pen === 0) {
      updates.status = "concluido";
      updates.concluido_em = new Date().toISOString();
    }
    await admin.from("disparos").update(updates).eq("id", disparo_id);

    return new Response(JSON.stringify({
      processados: pendentes?.length ?? 0, enviados, falhas, restantes: pen,
      concluido: pen === 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro";
    console.error("disparo-processar:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});