// Edge function: envia uma mensagem WhatsApp via Meta Cloud API.
// Usado tanto para teste avulso quanto pelo worker da fila.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SendInput {
  api_id: string;
  destinatario: string; // e.g. 5511999999999
  template_nome?: string;
  template_idioma?: string;
  variaveis?: string[];
  texto?: string; // se fornecido, envia mensagem de texto livre (apenas conversas em janela 24h)
  fila_id?: string; // se vier, atualiza status na fila
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const input = (await req.json()) as SendInput;
    if (!input.api_id || !input.destinatario) {
      return json({ error: "api_id e destinatario obrigatórios" }, 400);
    }

    const { data: api, error: e1 } = await supabase
      .from("wa_bulk_apis")
      .select("*")
      .eq("id", input.api_id)
      .maybeSingle();
    if (e1 || !api) return json({ error: "API não encontrada" }, 404);
    if (api.status !== "ativo") return json({ error: `API status=${api.status}` }, 400);

    const url = `https://graph.facebook.com/v20.0/${api.phone_number_id}/messages`;
    let body: Record<string, unknown>;

    if (input.template_nome) {
      const params = (input.variaveis ?? []).map((v) => ({ type: "text", text: String(v) }));
      body = {
        messaging_product: "whatsapp",
        to: input.destinatario,
        type: "template",
        template: {
          name: input.template_nome,
          language: { code: input.template_idioma ?? "pt_BR" },
          components: params.length > 0 ? [{ type: "body", parameters: params }] : [],
        },
      };
    } else if (input.texto) {
      body = {
        messaging_product: "whatsapp",
        to: input.destinatario,
        type: "text",
        text: { body: input.texto },
      };
    } else {
      return json({ error: "informe template_nome ou texto" }, 400);
    }

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${api.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const meta = await resp.json().catch(() => ({}));
    const ok = resp.ok && !!meta?.messages?.[0]?.id;
    const message_id = meta?.messages?.[0]?.id ?? null;
    const erro = ok ? null : meta?.error?.message ?? `HTTP ${resp.status}`;

    await supabase.rpc("wa_bulk_registrar_envio", {
      _api_id: api.id,
      _sucesso: ok,
      _erro: erro,
    });

    if (input.fila_id) {
      await supabase
        .from("wa_bulk_fila_envios")
        .update({
          status: ok ? "enviado" : "erro",
          message_id_meta: message_id,
          erro_mensagem: erro,
          enviado_em: ok ? new Date().toISOString() : null,
          api_id: api.id,
        })
        .eq("id", input.fila_id);
    }

    return json({ success: ok, message_id, erro, raw: meta }, ok ? 200 : 400);
  } catch (err) {
    console.error("wa-bulk-send error", err);
    return json({ error: String(err?.message ?? err) }, 500);
  }

  function json(b: unknown, s = 200) {
    return new Response(JSON.stringify(b), {
      status: s,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});