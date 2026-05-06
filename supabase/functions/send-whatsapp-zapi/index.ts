import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
      throw new Error("Credenciais Z-API ausentes (ZAPI_INSTANCE_ID/TOKEN/CLIENT_TOKEN)");
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

    const body = await req.json();
    const { to, message, nome } = body as { to?: string; message?: string; nome?: string };

    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: to, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Z-API exige número apenas com dígitos (DDI+DDD+numero)
    const phone = to.replace(/\D/g, "");

    const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_INSTANCE_TOKEN}/send-text`;

    const zapiResp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": ZAPI_CLIENT_TOKEN,
      },
      body: JSON.stringify({ phone, message }),
    });

    const zapiData = await zapiResp.json().catch(() => ({}));

    if (!zapiResp.ok) {
      await supabase.from("mensagens_externas").insert({
        user_id: userData.user.id,
        canal: "WhatsApp",
        destinatario: to,
        destinatario_nome: nome ?? null,
        conteudo: message,
        status: "Falhou",
        provedor: "Z-API",
        erro: zapiData?.error || zapiData?.message || JSON.stringify(zapiData),
        metadata: { response: zapiData },
      });
      return new Response(
        JSON.stringify({ error: `Z-API [${zapiResp.status}]: ${zapiData?.error || zapiData?.message || "erro"}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: inserted } = await supabase
      .from("mensagens_externas")
      .insert({
        user_id: userData.user.id,
        canal: "WhatsApp",
        destinatario: to,
        destinatario_nome: nome ?? null,
        conteudo: message,
        status: "Enviado",
        provedor: "Z-API",
        provedor_message_id: zapiData?.messageId || zapiData?.id || null,
        enviado_em: new Date().toISOString(),
        metadata: { response: zapiData },
      })
      .select()
      .single();

    // Espelha a mensagem na timeline da conversa (whatsapp_mensagens) — anti-perda
    try {
      const phoneDigits = phone;
      // Busca/cria conversa
      const { data: conv } = await supabase
        .from("whatsapp_conversas")
        .select("id")
        .eq("telefone_digits", phoneDigits)
        .maybeSingle();
      let conversaId = conv?.id as string | undefined;
      if (!conversaId) {
        const { data: created } = await supabase
          .from("whatsapp_conversas")
          .insert({
            telefone: to,
            telefone_digits: phoneDigits,
            contato_nome: nome ?? null,
            status: "Em atendimento",
          })
          .select("id")
          .single();
        conversaId = created?.id;
      }
      if (conversaId) {
        await supabase.from("whatsapp_mensagens").insert({
          conversa_id: conversaId,
          direcao: "saida",
          tipo: "texto",
          conteudo: message,
          provedor_message_id: zapiData?.messageId || zapiData?.id || null,
          status: "Enviado",
          enviado_por: userData.user.id,
          enviado_em: new Date().toISOString(),
          metadata: { response: zapiData, source: "send-whatsapp-zapi" },
        });

        // Marca primeira_resposta_em (se ainda não tiver) — usado para SLA
        await supabase.from("whatsapp_conversas")
          .update({ primeira_resposta_em: new Date().toISOString() })
          .eq("id", conversaId)
          .is("primeira_resposta_em", null);
      }
    } catch (mirrorErr) {
      console.warn("espelho whatsapp_mensagens falhou:", mirrorErr);
    }

    return new Response(
      JSON.stringify({ success: true, messageId: zapiData?.messageId, mensagem: inserted }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("send-whatsapp-zapi error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});