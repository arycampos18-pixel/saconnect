// Edge function: monitora saúde das APIs do envio em massa.
// Pausa automaticamente APIs com baixa saúde, alta taxa de erros ou em cooldown,
// e reativa APIs cujo cooldown já expirou. Roda via cron a cada 5 minutos.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SAUDE_MINIMA = 50;
const TAXA_ERRO_MAX = 5; // %

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const stats = { verificadas: 0, pausadas: 0, reativadas: 0, atualizadas: 0 };
  const agora = new Date();

  // 1) Reativa APIs cujo cooldown expirou
  const { data: emCooldown } = await supabase
    .from("wa_bulk_apis")
    .select("id, cooldown_ate")
    .eq("status", "pausada")
    .not("cooldown_ate", "is", null)
    .lte("cooldown_ate", agora.toISOString());

  for (const api of emCooldown ?? []) {
    await supabase
      .from("wa_bulk_apis")
      .update({
        status: "ativo",
        cooldown_ate: null,
        erros_consecutivos: 0,
      })
      .eq("id", api.id);
    stats.reativadas++;
  }

  // 2) Aquecimento: ajusta limite diário e promove para "ativo" após 22 dias
  const { data: emAquec } = await supabase
    .from("wa_bulk_apis")
    .select("*")
    .eq("status", "em_aquecimento");

  const cfgCache = new Map<string, any>();
  for (const api of emAquec ?? []) {
    let cfg = cfgCache.get(api.company_id);
    if (!cfg) {
      const { data } = await supabase
        .from("wa_bulk_config")
        .select("*")
        .eq("company_id", api.company_id)
        .maybeSingle();
      cfg = data ?? {};
      cfgCache.set(api.company_id, cfg);
    }
    if (cfg?.aquecimento_ativo === false) continue;

    const inicio = new Date(api.iniciado_em ?? api.created_at);
    const dias = Math.floor((agora.getTime() - inicio.getTime()) / 86_400_000);
    let limite = cfg.aquecimento_dia_1_7 ?? 50;
    let novoStatus = "em_aquecimento";
    if (dias >= 22) {
      limite = cfg.aquecimento_dia_22_plus ?? 500;
      novoStatus = "ativo";
    } else if (dias >= 15) {
      limite = cfg.aquecimento_dia_15_21 ?? 300;
    } else if (dias >= 8) {
      limite = cfg.aquecimento_dia_8_14 ?? 150;
    }

    await supabase
      .from("wa_bulk_apis")
      .update({
        msgs_limite_diario: limite,
        status: novoStatus,
      })
      .eq("id", api.id);
    if (novoStatus === "ativo") stats.reativadas++;
  }

  // 3) Avalia todas as APIs ativas
  const { data: ativas } = await supabase
    .from("wa_bulk_apis")
    .select("*")
    .eq("status", "ativo");

  for (const api of ativas ?? []) {
    stats.verificadas++;

    // Calcula saúde via função no banco
    const { data: saudeData } = await supabase.rpc("wa_bulk_calcular_saude", {
      _api_id: api.id,
    });
    const saude = typeof saudeData === "number" ? saudeData : 100;

    // Calcula taxa de erro
    const taxaErro = api.total_enviadas > 0
      ? (api.total_erros / api.total_enviadas) * 100
      : 0;

    // Calcula taxa de entrega aproximada (1 - taxa erro)
    const taxaEntrega = Math.max(0, 100 - taxaErro);

    let status = api.status;
    let cooldown_ate: string | null = api.cooldown_ate;
    let observacoes = api.observacoes;
    let pausou = false;

    // Critérios de pausa automática
    if (saude < SAUDE_MINIMA) {
      status = "pausada";
      cooldown_ate = new Date(Date.now() + 60 * 60_000).toISOString(); // 1h
      observacoes = `[auto] Pausada por saúde baixa (${saude}) em ${agora.toISOString()}`;
      pausou = true;
    } else if (taxaErro > TAXA_ERRO_MAX && api.total_enviadas > 20) {
      status = "pausada";
      cooldown_ate = new Date(Date.now() + 30 * 60_000).toISOString(); // 30min
      observacoes = `[auto] Pausada por taxa de erro alta (${taxaErro.toFixed(1)}%)`;
      pausou = true;
    } else if (api.warning_meta || api.restrito) {
      status = "pausada";
      cooldown_ate = new Date(Date.now() + 2 * 60 * 60_000).toISOString(); // 2h
      observacoes = `[auto] Pausada por aviso/restrição da Meta`;
      pausou = true;
    }

    await supabase
      .from("wa_bulk_apis")
      .update({
        saude,
        taxa_entrega: Number(taxaEntrega.toFixed(2)),
        status,
        cooldown_ate,
        observacoes,
      })
      .eq("id", api.id);

    stats.atualizadas++;
    if (pausou) stats.pausadas++;
  }

  return new Response(JSON.stringify({ stats, ts: agora.toISOString() }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});