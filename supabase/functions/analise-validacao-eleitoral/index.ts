import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  cpf?: string;
  titulo?: string;
  eleitor_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userRes } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (!userRes?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as Payload;
    const apiKey = Deno.env.get("ANALISE_ELEITORAL_API_KEY");

    const started = Date.now();

    // Placeholder: integração real entrará no PROMPT seguinte.
    // Por ora, só registramos a "consulta" sem chamar provedor externo.
    const resposta = {
      ok: true,
      mock: true,
      provider_configured: !!apiKey,
      input: body,
      message: "Endpoint placeholder. Integração com provedor será implementada no próximo prompt.",
    };

    await supabase.from("analise_api_consultas").insert({
      provedor: "placeholder",
      endpoint: "validacao-eleitoral",
      payload: body,
      resposta,
      status: "sucesso",
      http_status: 200,
      custo_centavos: 0,
      duracao_ms: Date.now() - started,
      eleitor_id: body.eleitor_id ?? null,
      user_id: userRes.user.id,
    });

    return new Response(JSON.stringify(resposta), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});