import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function processarJob(admin: any, job: any): Promise<{ ok: boolean; result?: any; erro?: string }> {
  try {
    if (job.tipo === "enriquecimento") {
      // ⚠️ Enriquecimento automático foi removido a pedido do usuário.
      // Qualquer job desse tipo é descartado (somente botão manual chama o SA Connect Data).
      return {
        ok: true,
        result: {
          skipped: true,
          motivo: "Enriquecimento automático desativado — usar o botão Enriquecer manualmente.",
          eleitor_id: job.payload?.eleitor_id ?? null,
        },
      };
    }
    if (job.tipo === "validacao_eleitoral") {
      const { data, error } = await admin.functions.invoke("analise-validacao-eleitoral", { body: job.payload });
      if (error) throw error;
      return { ok: true, result: data };
    }
    if (job.tipo === "whatsapp_codigo") {
      const { data, error } = await admin.functions.invoke("analise-whatsapp-enviar-codigo", { body: job.payload });
      if (error) throw error;
      return { ok: true, result: data };
    }
    return { ok: false, erro: `Tipo desconhecido: ${job.tipo}` };
  } catch (e: any) {
    return { ok: false, erro: e?.message || String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = createClient(SB_URL, SB_KEY);
  let lote = 5;
  try { const b = await req.json(); if (b?.lote) lote = Math.min(20, Math.max(1, b.lote)); } catch {}

  const { data: jobs, error } = await admin.rpc("analise_job_reservar", { _lote: lote });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const results: any[] = [];
  for (const job of jobs ?? []) {
    const r = await processarJob(admin, job);
    await admin.rpc("analise_job_concluir", {
      _id: job.id, _sucesso: r.ok,
      _resultado: r.result ?? null, _erro: r.erro ?? null,
    });
    results.push({ id: job.id, tipo: job.tipo, ok: r.ok });
  }
  return new Response(JSON.stringify({ processados: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
