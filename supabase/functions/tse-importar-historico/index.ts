import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Anos das últimas eleições TSE (alterna municipal/geral)
const ANOS_MUNICIPAIS = [2024, 2020, 2016, 2012];
const ANOS_GERAIS = [2022, 2018, 2014, 2010];

const ANOS_VALIDOS = new Set<number>([...ANOS_MUNICIPAIS, ...ANOS_GERAIS]);

function pickAnos(escopo: string): number[] {
  // Apenas a eleição mais recente de cada escopo (reduz tempo, memória e
  // pressão no CDN do TSE).
  if (escopo === "municipal") return [ANOS_MUNICIPAIS[0]];
  if (escopo === "geral") return [ANOS_GERAIS[0]];
  // auto: somente a última eleição (qualquer tipo)
  return [
    [...ANOS_MUNICIPAIS, ...ANOS_GERAIS].sort((a, b) => b - a)[0],
  ];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Permissão
    const { data: su } = await supa.from("settings_users")
      .select("is_super_admin").eq("id", user.id).maybeSingle();
    let allowed = !!su?.is_super_admin;
    if (!allowed) {
      const { data: comp } = await supa.rpc("user_default_company", { _user_id: user.id });
      const { data: hasPerm } = await supa.rpc("user_has_permission", {
        _user_id: user.id, _company_id: comp, _permission: "configuracoes.manage",
      });
      allowed = !!hasPerm;
    }
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Acesso restrito" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const uf = String(body.uf ?? "").toUpperCase();
    const escopo = String(body.escopo ?? "auto"); // auto | municipal | geral
    const cargo: string | null = body.cargo ?? null;
    const codigo_municipio: string | null = body.codigo_municipio ?? null;
    const anosInput: number[] | null = Array.isArray(body.anos)
      ? body.anos.map((a: any) => Number(a)).filter((a: number) => Number.isFinite(a))
      : null;
    const retomarBatchId: string | null = typeof body.retomar_batch_id === "string"
      ? body.retomar_batch_id
      : null;

    const turnos = [1, 2];
    const baseUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/tse-importar`;

    let batchId: string;
    let jobs: Array<{ id: string; uf: string; ano_eleicao: number; turno: number; cargo: string | null; codigo_municipio: string | null }>;
    let ufOut = uf;

    if (retomarBatchId) {
      // Retomar um lote existente: pega jobs pendentes / em_andamento / com erro
      batchId = retomarBatchId;
      const { data: pend, error: pendErr } = await supa
        .from("tse_jobs")
        .select("id, uf, ano_eleicao, turno, cargo, codigo_municipio")
        .eq("batch_id", batchId)
        .in("status", ["pendente", "em_andamento", "erro"])
        .order("ano_eleicao", { ascending: false })
        .order("turno", { ascending: true });
      if (pendErr) {
        return new Response(JSON.stringify({ error: pendErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      jobs = pend ?? [];
      ufOut = jobs[0]?.uf ?? uf;
      if (jobs.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          mensagem: "Nada a retomar — todos os jobs já concluídos",
          batch_id: batchId, total_jobs: 0, anos: [], turnos, uf: ufOut, escopo,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } else {
      if (!uf || uf.length !== 2) {
        return new Response(JSON.stringify({ error: "uf obrigatória (2 letras)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const anos = (anosInput && anosInput.length > 0)
        ? Array.from(new Set(anosInput.filter((a) => ANOS_VALIDOS.has(a)))).sort((a, b) => b - a)
        : pickAnos(escopo);
      if (anos.length === 0) {
        return new Response(JSON.stringify({
          error: "Nenhum ano válido informado",
          anos_validos: [...ANOS_VALIDOS].sort((a, b) => b - a),
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      batchId = crypto.randomUUID();
      const rows = anos.flatMap((ano) =>
        turnos.map((turno) => ({
          batch_id: batchId,
          user_id: user.id,
          uf, ano_eleicao: ano, turno,
          cargo, codigo_municipio,
          escopo,
          status: "pendente",
        })),
      );
      const { data: inserted, error: insErr } = await supa
        .from("tse_jobs").insert(rows)
        .select("id, uf, ano_eleicao, turno, cargo, codigo_municipio");
      if (insErr) {
        return new Response(JSON.stringify({ error: insErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      jobs = inserted ?? [];
    }

    const anosOut = Array.from(new Set(jobs.map((j) => j.ano_eleicao))).sort((a, b) => b - a);

    // Dispara em background (não bloqueia o cliente). Atualiza progresso por job.
    const run = async () => {
      for (const job of jobs) {
        const { data: cur } = await supa.from("tse_jobs").select("tentativas").eq("id", job.id).maybeSingle();
        await supa.from("tse_jobs").update({
          status: "em_andamento",
          started_at: new Date().toISOString(),
          tentativas: (cur?.tentativas ?? 0) + 1,
          ultimo_erro: null,
        }).eq("id", job.id);

        try {
          const r = await fetch(baseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: auth },
            body: JSON.stringify({
              ano_eleicao: job.ano_eleicao,
              turno: job.turno,
              uf: job.uf,
              cargo: job.cargo,
              codigo_municipio: job.codigo_municipio,
            }),
          });
          const json: any = await r.json().catch(() => ({}));
          if (!r.ok || json?.error) {
            await supa.from("tse_jobs").update({
              status: "erro",
              ultimo_erro: json?.error ?? `HTTP ${r.status}`,
              log_id: json?.log_id ?? null,
              finished_at: new Date().toISOString(),
            }).eq("id", job.id);
          } else {
            await supa.from("tse_jobs").update({
              status: "concluido",
              ultimo_erro: null,
              log_id: json?.log_id ?? null,
              finished_at: new Date().toISOString(),
            }).eq("id", job.id);
          }
        } catch (e) {
          await supa.from("tse_jobs").update({
            status: "erro",
            ultimo_erro: (e as Error).message,
            finished_at: new Date().toISOString(),
          }).eq("id", job.id);
        }
      }
      console.log("[tse-importar-historico] lote concluído", batchId);
    };

    // @ts-ignore EdgeRuntime global
    if (typeof EdgeRuntime !== "undefined" && (EdgeRuntime as any)?.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(run());
    } else {
      // fallback
      run();
    }

    return new Response(JSON.stringify({
      success: true,
      mensagem: retomarBatchId ? "Retomando lote em background" : "Importação histórica iniciada em background",
      batch_id: batchId,
      anos: anosOut,
      turnos,
      uf: ufOut,
      escopo,
      total_jobs: jobs.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});