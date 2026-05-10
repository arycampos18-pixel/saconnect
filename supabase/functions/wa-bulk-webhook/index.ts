// Webhook público para receber callbacks de status da Meta WhatsApp Cloud API.
// - GET  : verificação do webhook (hub.challenge)
// - POST : eventos de statuses (sent/delivered/read/failed) e mensagens recebidas
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
};

const VERIFY_TOKEN = Deno.env.get("WA_BULK_WEBHOOK_VERIFY_TOKEN") ?? "saconnect";

const PALAVRAS_OPTOUT = ["parar", "sair", "cancelar", "remover", "stop", "unsubscribe"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);

  // 1) Verificação do webhook (Meta -> GET)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }
    return new Response("forbidden", { status: 403, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return new Response("invalid json", { status: 400, headers: corsHeaders });
  }

  const stats = { statuses: 0, mensagens: 0, optouts: 0 };

  // Estrutura: { object, entry: [{ changes: [{ field, value: { metadata, statuses, messages } }] }] }
  for (const entry of body?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value ?? {};
      const phoneNumberId: string | undefined = value?.metadata?.phone_number_id;

      // Encontra a API correspondente
      let api: any = null;
      if (phoneNumberId) {
        const { data } = await supabase
          .from("wa_bulk_apis")
          .select("id, company_id")
          .eq("phone_number_id", phoneNumberId)
          .maybeSingle();
        api = data;
      }

      // ===== STATUSES =====
      for (const st of value?.statuses ?? []) {
        stats.statuses++;
        const messageId: string | undefined = st?.id;
        const status: string | undefined = st?.status; // sent | delivered | read | failed
        const ts = st?.timestamp ? new Date(parseInt(String(st.timestamp), 10) * 1000).toISOString() : new Date().toISOString();
        if (!messageId || !status) continue;

        // Busca a mensagem na fila
        const { data: msg } = await supabase
          .from("wa_bulk_fila_envios")
          .select("id, company_id, api_id, campanha_id, status")
          .eq("message_id_meta", messageId)
          .maybeSingle();

        const update: Record<string, any> = {};
        let metricaTipo: "entregue" | "lido" | "falha" | null = null;

        if (status === "sent") {
          if (msg && msg.status === "enviando") update.status = "enviado";
        } else if (status === "delivered") {
          update.status = "entregue";
          update.entregue_em = ts;
          metricaTipo = "entregue";
        } else if (status === "read") {
          update.status = "lido";
          update.lido_em = ts;
          metricaTipo = "lido";
        } else if (status === "failed") {
          update.status = "erro";
          update.erro_mensagem = st?.errors?.[0]?.title ?? st?.errors?.[0]?.message ?? "failed";
          metricaTipo = "falha";
        }

        if (msg && Object.keys(update).length > 0) {
          await supabase.from("wa_bulk_fila_envios").update(update).eq("id", msg.id);

          if (metricaTipo && msg.api_id && msg.company_id) {
            await supabase.rpc("wa_bulk_registrar_status", {
              _api_id: msg.api_id,
              _company_id: msg.company_id,
              _tipo: metricaTipo,
            });
          }

          // Atualiza contadores da campanha (best-effort)
          if (msg.campanha_id) {
            const colMap: Record<string, string> = {
              entregue: "total_entregues",
              lido: "total_lidos",
              falha: "total_erros",
            };
            const col = metricaTipo ? colMap[metricaTipo] : null;
            if (col) {
              await supabase.rpc("wa_bulk_camp_incrementar", {
                _campanha_id: msg.campanha_id,
                _coluna: col,
              }).catch(() => {});
            }
          }
        }
      }

      // ===== MENSAGENS RECEBIDAS (opt-out por palavra) =====
      for (const m of value?.messages ?? []) {
        stats.mensagens++;
        const from: string | undefined = m?.from;
        const texto: string = (m?.text?.body ?? m?.button?.text ?? "").toString().trim().toLowerCase();
        if (!from || !texto || !api?.company_id) continue;

        if (PALAVRAS_OPTOUT.some((p) => texto === p || texto.startsWith(p + " "))) {
          await supabase.rpc("wa_bulk_optout_add", {
            _company_id: api.company_id,
            _telefone: from,
            _motivo: `Resposta automática: "${texto.slice(0, 60)}"`,
            _origem: "palavra_chave",
            _observacoes: null,
          });
          stats.optouts++;
        }

        // Persiste conversa + mensagem para o módulo Atendimento
        try {
          const corpoOriginal: string =
            (m?.text?.body ?? m?.button?.text ?? m?.interactive?.button_reply?.title ?? m?.interactive?.list_reply?.title ?? "").toString();
          const tipo: string = m?.type ?? "text";
          const nome: string | undefined = value?.contacts?.[0]?.profile?.name;
          const tsMsg = m?.timestamp ? new Date(parseInt(String(m.timestamp), 10) * 1000).toISOString() : new Date().toISOString();

          const { data: convExist } = await supabase
            .from("wa_bulk_conversas")
            .select("id, nao_lidas")
            .eq("company_id", api.company_id)
            .eq("api_id", api.id)
            .eq("wa_numero", from)
            .maybeSingle();

          let conversaId = convExist?.id as string | undefined;
          if (!conversaId) {
            const { data: novo } = await supabase
              .from("wa_bulk_conversas")
              .insert({
                company_id: api.company_id,
                api_id: api.id,
                wa_numero: from,
                wa_nome: nome ?? null,
                ultima_mensagem: corpoOriginal,
                ultima_interacao: tsMsg,
                ultima_msg_recebida_em: tsMsg,
                nao_lidas: 1,
                status: "aberta",
              })
              .select("id")
              .single();
            conversaId = novo?.id;
          } else {
            await supabase
              .from("wa_bulk_conversas")
              .update({
                wa_nome: nome ?? undefined,
                ultima_mensagem: corpoOriginal,
                ultima_interacao: tsMsg,
                ultima_msg_recebida_em: tsMsg,
                nao_lidas: (convExist?.nao_lidas ?? 0) + 1,
                status: "aberta",
              })
              .eq("id", conversaId);
          }

          if (conversaId) {
            await supabase.from("wa_bulk_mensagens").insert({
              company_id: api.company_id,
              conversa_id: conversaId,
              api_id: api.id,
              direcao: "entrada",
              tipo,
              corpo: corpoOriginal,
              message_id_meta: m?.id ?? null,
              status: "recebido",
            });
          }
        } catch (_e) {
          // best-effort
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, stats }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
