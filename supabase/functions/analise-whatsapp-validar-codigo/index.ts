import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_TENTATIVAS = 3;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { eleitor_id, codigo } = await req.json() as { eleitor_id?: string; codigo?: string };
    const codigoLimpo = (codigo ?? "").replace(/\D/g, "");

    if (!eleitor_id || codigoLimpo.length !== 6) {
      return new Response(JSON.stringify({ error: "eleitor_id e código de 6 dígitos obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: eleitor, error: eleErr } = await supabase
      .from("eleitores")
      .select("id, codigo_validacao_whatsapp, codigo_expira_em, tentativas_validacao")
      .eq("id", eleitor_id)
      .maybeSingle();

    if (eleErr || !eleitor) {
      return new Response(JSON.stringify({ error: "Eleitor não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!eleitor.codigo_validacao_whatsapp || !eleitor.codigo_expira_em) {
      return new Response(JSON.stringify({ error: "Nenhum código ativo. Solicite o envio." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(eleitor.codigo_expira_em).getTime() < Date.now()) {
      await supabase.from("analise_logs").insert({
        acao: "whatsapp_codigo_expirado", eleitor_id, detalhes: {},
      });
      return new Response(JSON.stringify({ error: "Código expirado. Solicite um novo." }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((eleitor.tentativas_validacao ?? 0) >= MAX_TENTATIVAS) {
      return new Response(JSON.stringify({ error: "Limite de tentativas atingido. Solicite um novo código." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (codigoLimpo !== eleitor.codigo_validacao_whatsapp) {
      const novasTentativas = (eleitor.tentativas_validacao ?? 0) + 1;
      await supabase
        .from("eleitores")
        .update({ tentativas_validacao: novasTentativas })
        .eq("id", eleitor_id);
      await supabase.from("analise_logs").insert({
        acao: "whatsapp_codigo_invalido", eleitor_id,
        detalhes: { tentativas: novasTentativas },
      });
      const restantes = MAX_TENTATIVAS - novasTentativas;
      return new Response(JSON.stringify({
        error: restantes > 0
          ? `Código incorreto. Restam ${restantes} tentativa(s).`
          : "Código incorreto. Limite de tentativas atingido.",
        tentativas_restantes: Math.max(0, restantes),
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const agora = new Date().toISOString();
    const { error: upErr } = await supabase
      .from("eleitores")
      .update({
        telefone_validado: true,
        status_validacao_whatsapp: "validado",
        status_cadastro: "validado",
        data_validacao_whatsapp: agora,
        codigo_validacao_whatsapp: null,
        codigo_expira_em: null,
      })
      .eq("id", eleitor_id);

    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("analise_logs").insert({
      acao: "whatsapp_validado", eleitor_id, detalhes: { validado_em: agora },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});