import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function gerarCodigo(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getErrorMessage(body: unknown): string {
  if (typeof body === "string") return body;
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const msg = record.error ?? record.message ?? record.details;
    if (typeof msg === "string") return msg;
  }
  return "";
}

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

    const { eleitor_id } = await req.json() as { eleitor_id?: string };
    if (!eleitor_id) {
      return new Response(JSON.stringify({ error: "eleitor_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: eleitor, error: eleErr } = await supabase
      .from("eleitores")
      .select("id, nome, telefone_original, telefone, status_validacao_whatsapp, codigo_validacao_whatsapp, codigo_expira_em, tentativas_validacao")
      .eq("id", eleitor_id)
      .maybeSingle();

    if (eleErr || !eleitor) {
      return new Response(JSON.stringify({ error: "Eleitor não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const telefone = eleitor.telefone_original || eleitor.telefone;
    if (!telefone) {
      return new Response(JSON.stringify({ error: "Telefone não cadastrado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const codigo = gerarCodigo();
    const expiraEm = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: upErr } = await supabase
      .from("eleitores")
      .update({
        codigo_validacao_whatsapp: codigo,
        codigo_expira_em: expiraEm,
        tentativas_validacao: 0,
        status_validacao_whatsapp: "pendente",
      })
      .eq("id", eleitor_id);

    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mensagem =
      `Olá${eleitor.nome ? ", " + eleitor.nome.split(" ")[0] : ""}! ` +
      `Seu código de validação é: *${codigo}*. ` +
      `Ele expira em 10 minutos.`;

    const sendResp = await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp-zapi`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: telefone, message: mensagem, nome: eleitor.nome }),
    });
    const sendText = await sendResp.text();
    let sendData: unknown = null;
    try {
      sendData = sendText ? JSON.parse(sendText) : null;
    } catch {
      sendData = sendText;
    }

    if (!sendResp.ok) {
      const { error: rollbackErr } = await supabase
        .from("eleitores")
        .update({
          codigo_validacao_whatsapp: eleitor.codigo_validacao_whatsapp ?? null,
          codigo_expira_em: eleitor.codigo_expira_em ?? null,
          tentativas_validacao: eleitor.tentativas_validacao ?? 0,
          status_validacao_whatsapp: eleitor.status_validacao_whatsapp ?? null,
        })
        .eq("id", eleitor_id);

      await supabase.from("analise_logs").insert({
        acao: "whatsapp_codigo_enviado",
        eleitor_id,
        detalhes: {
          sucesso: false,
          telefone,
          response: sendData ?? null,
          erro: getErrorMessage(sendData) || `HTTP ${sendResp.status}`,
          rollback_ok: !rollbackErr,
          rollback_error: rollbackErr?.message ?? null,
        },
      });

      return new Response(JSON.stringify({
        error: "Falha ao enviar WhatsApp",
        details: getErrorMessage(sendData) || `HTTP ${sendResp.status}`,
      }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("analise_logs").insert({
      acao: "whatsapp_codigo_enviado",
      eleitor_id,
      detalhes: { sucesso: true, telefone, response: sendData ?? null, erro: null },
    });

    return new Response(JSON.stringify({ success: true, expira_em: expiraEm }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});