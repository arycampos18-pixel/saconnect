import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY ausente — conecte o Twilio");

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
    const { to, message, from } = body as { to?: string; message?: string; from?: string };

    if (!to || !message || !from) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: to, message, from" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const toFormatted = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
    const fromFormatted = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;

    const twilioResp = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: toFormatted, From: fromFormatted, Body: message }),
    });

    const twilioData = await twilioResp.json();

    if (!twilioResp.ok) {
      await supabase.from("mensagens_externas").insert({
        user_id: userData.user.id,
        canal: "WhatsApp",
        destinatario: to,
        conteudo: message,
        status: "Falhou",
        provedor: "Twilio",
        erro: twilioData?.message || JSON.stringify(twilioData),
        metadata: { from, response: twilioData },
      });
      return new Response(
        JSON.stringify({ error: `Twilio [${twilioResp.status}]: ${twilioData?.message || "erro"}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: inserted } = await supabase
      .from("mensagens_externas")
      .insert({
        user_id: userData.user.id,
        canal: "WhatsApp",
        destinatario: to,
        conteudo: message,
        status: "Enviado",
        provedor: "Twilio",
        provedor_message_id: twilioData?.sid,
        enviado_em: new Date().toISOString(),
        metadata: { from, sid: twilioData?.sid, status: twilioData?.status },
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({ success: true, sid: twilioData?.sid, mensagem: inserted }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("send-whatsapp error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});