// Edge function: processa um lote da fila de envios em massa.
// Pode ser chamada manualmente ou agendada via cron.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOTE = 25; // mensagens por execução

/**
 * Normaliza variáveis para array ordenado conforme {{1}}..{{N}} do template.
 * Aceita: array (já ordenado), Record com chaves var1/var2/{{1}}/{{2}} ou
 * qualquer ordem inserida no objeto.
 */
function normalizarVars(raw: unknown, qtd: number): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.slice(0, qtd).map((v) => String(v ?? ""));
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const out: string[] = [];
    for (let i = 1; i <= qtd; i++) {
      const v =
        obj[`{{${i}}}`] ??
        obj[`var${i}`] ??
        obj[`variavel${i}`] ??
        obj[String(i)] ??
        Object.values(obj)[i - 1];
      out.push(v == null ? "" : String(v));
    }
    return out;
  }
  return [];
}

function contarVars(body: string | null | undefined): number {
  if (!body) return 0;
  const s = new Set<number>();
  for (const m of body.matchAll(/\{\{(\d+)\}\}/g)) s.add(parseInt(m[1], 10));
  return s.size;
}

function dentroDoHorario(cfg: any): boolean {
  const now = new Date();
  const dia = ((now.getDay() + 6) % 7) + 1; // 1=Seg ... 7=Dom
  if (Array.isArray(cfg?.dias_permitidos) && !cfg.dias_permitidos.includes(dia)) return false;
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  const cur = `${hh}:${mm}`;
  return cur >= (cfg?.horario_inicio ?? "08:00") && cur <= (cfg?.horario_fim ?? "20:00");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const stats = { processados: 0, enviados: 0, erros: 0, pulados: 0 };

  // Pega fila pendente, agrupada por empresa
  const { data: pendentes } = await supabase
    .from("wa_bulk_fila_envios")
    .select("*")
    .eq("status", "pendente")
    .lte("proximo_envio", new Date().toISOString())
    .order("prioridade", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(LOTE);

  if (!pendentes || pendentes.length === 0) {
    return new Response(JSON.stringify({ stats, message: "fila vazia" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Carrega configs por empresa em cache
  const cfgCache = new Map<string, any>();

  for (const msg of pendentes) {
    stats.processados++;
    let cfg = cfgCache.get(msg.company_id);
    if (!cfg) {
      const { data } = await supabase
        .from("wa_bulk_config")
        .select("*")
        .eq("company_id", msg.company_id)
        .maybeSingle();
      cfg = data ?? {};
      cfgCache.set(msg.company_id, cfg);
    }

    if (!dentroDoHorario(cfg)) {
      stats.pulados++;
      continue;
    }

    // Verifica regra de agendamento/janela/pausa da campanha
    if (msg.campanha_id) {
      const { data: pode } = await supabase.rpc("wa_bulk_campanha_pode_enviar", {
        _campanha_id: msg.campanha_id,
      });
      if (pode !== true) {
        stats.pulados++;
        await supabase
          .from("wa_bulk_fila_envios")
          .update({ proximo_envio: new Date(Date.now() + 5 * 60_000).toISOString() })
          .eq("id", msg.id);
        continue;
      }
    }

    // Checa lista de opt-out (DNC/LGPD)
    const { data: bloqueado } = await supabase.rpc("wa_bulk_optout_check", {
      _company_id: msg.company_id,
      _telefone: msg.destinatario_telefone,
    });
    if (bloqueado === true) {
      stats.pulados++;
      await supabase
        .from("wa_bulk_fila_envios")
        .update({ status: "optout", erro_mensagem: "Destinatário em lista de opt-out" })
        .eq("id", msg.id);
      continue;
    }

    // Seleciona melhor API via load balancer
    const { data: api } = await supabase.rpc("wa_bulk_selecionar_api", {
      _company_id: msg.company_id,
    });
    if (!api || !api.id) {
      stats.pulados++;
      // adia 1min
      await supabase
        .from("wa_bulk_fila_envios")
        .update({ proximo_envio: new Date(Date.now() + 60_000).toISOString() })
        .eq("id", msg.id);
      continue;
    }

    // Marca como enviando
    await supabase
      .from("wa_bulk_fila_envios")
      .update({ status: "enviando", api_id: api.id, tentativas: msg.tentativas + 1 })
      .eq("id", msg.id);

    // Busca template (se houver)
    let tpl: any = null;
    if (msg.template_id) {
      const { data } = await supabase
        .from("wa_bulk_templates")
        .select("*")
        .eq("id", msg.template_id)
        .maybeSingle();
      tpl = data;
    }

    // Envia via Meta
    const url = `https://graph.facebook.com/v20.0/${api.phone_number_id}/messages`;
    const qtdVars = contarVars(tpl?.body_text);
    const variaveis = normalizarVars(msg.variaveis, qtdVars);
    const body = tpl
      ? {
          messaging_product: "whatsapp",
          to: msg.destinatario_telefone,
          type: "template",
          template: {
            name: tpl.nome,
            language: { code: tpl.idioma ?? "pt_BR" },
            components:
              variaveis.length > 0
                ? [{
                    type: "body",
                    parameters: variaveis.map((v) => ({ type: "text", text: String(v) })),
                  }]
                : [],
          },
        }
      : {
          messaging_product: "whatsapp",
          to: msg.destinatario_telefone,
          type: "text",
          text: { body: (Array.isArray(msg.variaveis) ? msg.variaveis[0] : "") ?? "" },
        };

    let ok = false;
    let message_id: string | null = null;
    let erro: string | null = null;
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${api.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const meta = await resp.json().catch(() => ({}));
      ok = resp.ok && !!meta?.messages?.[0]?.id;
      message_id = meta?.messages?.[0]?.id ?? null;
      erro = ok ? null : meta?.error?.message ?? `HTTP ${resp.status}`;
    } catch (e: any) {
      erro = String(e?.message ?? e);
    }

    await supabase.rpc("wa_bulk_registrar_envio", {
      _api_id: api.id,
      _sucesso: ok,
      _erro: erro,
    });

    if (ok) {
      stats.enviados++;
      await supabase
        .from("wa_bulk_fila_envios")
        .update({
          status: "enviado",
          message_id_meta: message_id,
          enviado_em: new Date().toISOString(),
        })
        .eq("id", msg.id);
      if (msg.campanha_id) {
        await supabase.rpc("update_updated_at_column"); // no-op safe
      }
    } else {
      stats.erros++;
      const max = msg.max_tentativas ?? cfg?.max_tentativas ?? 3;
      const novasTentativas = msg.tentativas + 1;
      if (novasTentativas >= max) {
        await supabase
          .from("wa_bulk_fila_envios")
          .update({ status: "erro", erro_mensagem: erro })
          .eq("id", msg.id);
      } else {
        const delayMs = Math.pow(2, novasTentativas) * 60_000;
        await supabase
          .from("wa_bulk_fila_envios")
          .update({
            status: "pendente",
            erro_mensagem: erro,
            proximo_envio: new Date(Date.now() + delayMs).toISOString(),
          })
          .eq("id", msg.id);
      }
    }
  }

  return new Response(JSON.stringify({ stats }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});