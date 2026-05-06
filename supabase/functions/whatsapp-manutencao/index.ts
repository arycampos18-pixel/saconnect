import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Job de manutenção do WhatsApp (cron a cada 5 min):
 *  - Marca SLA de 1ª resposta violado
 *  - Marca SLA de resolução violado
 *  - Encerra conversas inativas (se ativo na config)
 *  - Envia mensagem de despedida via Z-API ao encerrar
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const result = { sla_1a: 0, sla_res: 0, encerradas: 0, despedidas_enviadas: 0, erros: [] as string[] };

  try {
    const { data: cfg } = await admin
      .from("whatsapp_config").select("*").eq("chave", "principal").single();
    if (!cfg) throw new Error("Config não encontrada");

    const agora = new Date();

    // 1) SLA 1ª resposta — pendentes há mais que sla_primeira_resposta_min
    if (cfg.sla_primeira_resposta_alerta) {
      const limite = new Date(agora.getTime() - cfg.sla_primeira_resposta_min * 60_000).toISOString();
      const { data, error } = await admin
        .from("whatsapp_conversas")
        .update({ sla_primeira_resposta_violado: true })
        .eq("status", "Pendente")
        .is("primeira_resposta_em", null)
        .eq("sla_primeira_resposta_violado", false)
        .lte("created_at", limite)
        .select("id");
      if (error) result.erros.push("sla1a: " + error.message);
      result.sla_1a = data?.length ?? 0;
    }

    // 2) SLA resolução — abertas há mais que sla_resolucao_min
    if (cfg.sla_resolucao_alerta) {
      const limite = new Date(agora.getTime() - cfg.sla_resolucao_min * 60_000).toISOString();
      const { data, error } = await admin
        .from("whatsapp_conversas")
        .update({ sla_resolucao_violado: true })
        .in("status", ["Pendente", "Em atendimento"])
        .eq("sla_resolucao_violado", false)
        .lte("created_at", limite)
        .select("id");
      if (error) result.erros.push("slares: " + error.message);
      result.sla_res = data?.length ?? 0;
    }

    // 3) Encerramento automático
    if (cfg.auto_encerrar_ativo) {
      const limite = new Date(agora.getTime() - cfg.auto_encerrar_horas * 3600_000).toISOString();
      const { data: candidatas } = await admin
        .from("whatsapp_conversas")
        .select("id, telefone, contato_nome")
        .in("status", ["Pendente", "Em atendimento"])
        .lte("ultima_mensagem_em", limite)
        .limit(100);

      for (const c of candidatas ?? []) {
        try {
          await admin.from("whatsapp_conversas").update({
            status: "Atendido",
            finalizada_em: agora.toISOString(),
          }).eq("id", c.id);

          await admin.from("whatsapp_conversa_notas").insert({
            conversa_id: c.id, autor_id: null,
            conteudo: "🤖 Encerrado automaticamente por inatividade.",
          });

          // Envia mensagem de despedida (best-effort)
          if (cfg.auto_encerrar_mensagem?.trim()) {
            try {
              const sent = await enviarZapi(c.telefone, cfg.auto_encerrar_mensagem);
              await admin.from("whatsapp_mensagens").insert({
                conversa_id: c.id, direcao: "saida", tipo: "texto",
                conteudo: cfg.auto_encerrar_mensagem,
                status: sent.ok ? "Enviado" : "Falhou",
                enviado_em: agora.toISOString(),
                provedor_message_id: sent.messageId ?? null,
                metadata: { source: "auto-encerramento", response: sent.raw },
              });
              if (sent.ok) result.despedidas_enviadas++;
            } catch (e) {
              result.erros.push(`despedida ${c.id}: ${String(e)}`);
            }
          }
          result.encerradas++;
        } catch (e) {
          result.erros.push(`encerrar ${c.id}: ${String(e)}`);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e), ...result }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function enviarZapi(to: string, message: string): Promise<{ ok: boolean; messageId?: string; raw: any }> {
  const id = Deno.env.get("ZAPI_INSTANCE_ID");
  const tok = Deno.env.get("ZAPI_INSTANCE_TOKEN");
  const ct = Deno.env.get("ZAPI_CLIENT_TOKEN");
  if (!id || !tok || !ct) return { ok: false, raw: { error: "credenciais ausentes" } };
  const phone = String(to).replace(/\D/g, "");
  const resp = await fetch(`https://api.z-api.io/instances/${id}/token/${tok}/send-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Client-Token": ct },
    body: JSON.stringify({ phone, message }),
  });
  const raw = await resp.json().catch(() => ({}));
  return { ok: resp.ok, messageId: raw?.messageId ?? raw?.id, raw };
}
