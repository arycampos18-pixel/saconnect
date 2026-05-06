import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type EleitorRow = {
  id: string;
  nome: string;
  telefone: string | null;
  bairro: string | null;
  cidade: string | null;
  data_nascimento: string | null;
  created_at: string;
  consentimento_lgpd: boolean;
};

function daysBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Carregar dados base (limites razoáveis)
    const [
      { data: eleitores = [] },
      { data: inscricoes = [] },
      { data: respostas = [] },
      { data: mensagens = [] },
    ] = await Promise.all([
      supabase.from("eleitores").select("id,nome,telefone,bairro,cidade,data_nascimento,created_at,consentimento_lgpd").limit(2000),
      supabase.from("evento_inscricoes").select("eleitor_id,presente,checkin_em,created_at"),
      supabase.from("pesquisa_respostas").select("eleitor_id,participante_telefone,created_at"),
      supabase.from("mensagens").select("created_at,total_destinatarios"),
    ]);

    const today = new Date();

    // Index by eleitor
    const inscPorEleitor = new Map<string, { total: number; presentes: number; ultima: Date | null }>();
    for (const i of inscricoes as any[]) {
      if (!i.eleitor_id) continue;
      const cur = inscPorEleitor.get(i.eleitor_id) ?? { total: 0, presentes: 0, ultima: null };
      cur.total += 1;
      if (i.presente) cur.presentes += 1;
      const d = i.checkin_em ?? i.created_at;
      if (d) {
        const dt = new Date(d);
        if (!cur.ultima || dt > cur.ultima) cur.ultima = dt;
      }
      inscPorEleitor.set(i.eleitor_id, cur);
    }

    const respPorEleitor = new Map<string, { total: number; ultima: Date | null }>();
    for (const r of respostas as any[]) {
      if (!r.eleitor_id) continue;
      const cur = respPorEleitor.get(r.eleitor_id) ?? { total: 0, ultima: null };
      cur.total += 1;
      if (r.created_at) {
        const dt = new Date(r.created_at);
        if (!cur.ultima || dt > cur.ultima) cur.ultima = dt;
      }
      respPorEleitor.set(r.eleitor_id, cur);
    }

    // Heurística: score de propensão e influência
    type Enriched = EleitorRow & {
      diasSemInteracao: number;
      eventosTotal: number;
      eventosPresentes: number;
      respostasTotal: number;
      propensao: number; // 0..100
      risco: number; // 0..100
      influencia: number; // 0..10
    };

    const enriched: Enriched[] = (eleitores as EleitorRow[]).map((e) => {
      const insc = inscPorEleitor.get(e.id);
      const resp = respPorEleitor.get(e.id);
      const ultimaInter = [insc?.ultima ?? null, resp?.ultima ?? null, new Date(e.created_at)]
        .filter(Boolean)
        .reduce<Date | null>((a, b) => (a && b && a > b ? a : b!), null);
      const dias = ultimaInter ? daysBetween(today, ultimaInter) : 999;
      const eventosTotal = insc?.total ?? 0;
      const eventosPresentes = insc?.presentes ?? 0;
      const respostasTotal = resp?.total ?? 0;

      // Propensão: presença + respostas + recência + lgpd
      let propensao = 30;
      propensao += eventosPresentes * 10;
      propensao += respostasTotal * 6;
      propensao += eventosTotal * 3;
      propensao -= clamp(dias, 0, 180) * 0.25;
      if (e.consentimento_lgpd) propensao += 10;
      propensao = clamp(Math.round(propensao), 0, 100);

      // Risco: oposto + ausências
      const ausencias = Math.max(0, eventosTotal - eventosPresentes);
      let risco = 100 - propensao;
      risco += ausencias * 5;
      risco = clamp(Math.round(risco), 0, 100);

      // Influência (0..10): respostas e presença em eventos
      const influencia = clamp(
        Math.round((eventosPresentes * 1.2 + respostasTotal * 0.8) * 10) / 10,
        0,
        10,
      );

      return {
        ...e,
        diasSemInteracao: dias,
        eventosTotal,
        eventosPresentes,
        respostasTotal,
        propensao,
        risco,
        influencia,
      };
    });

    // Distribuição
    const dist = { muitoProvavel: 0, provavel: 0, indeciso: 0, improvavel: 0 };
    for (const x of enriched) {
      if (x.propensao >= 75) dist.muitoProvavel++;
      else if (x.propensao >= 50) dist.provavel++;
      else if (x.propensao >= 30) dist.indeciso++;
      else dist.improvavel++;
    }

    const emRisco = [...enriched]
      .filter((x) => x.risco >= 60)
      .sort((a, b) => b.risco - a.risco)
      .slice(0, 10)
      .map((x) => ({
        id: x.id,
        nome: x.nome,
        telefone: x.telefone,
        risco: x.risco,
        diasSemInteracao: x.diasSemInteracao,
        bairro: x.bairro,
      }));

    const influenciadores = [...enriched]
      .filter((x) => x.influencia >= 3)
      .sort((a, b) => b.influencia - a.influencia)
      .slice(0, 10)
      .map((x) => ({
        id: x.id,
        nome: x.nome,
        telefone: x.telefone,
        influencia: x.influencia,
        eventosPresentes: x.eventosPresentes,
        respostasTotal: x.respostasTotal,
        bairro: x.bairro,
      }));

    // Oportunidades por bairro: muitos eleitores com baixa propensão
    const porBairro = new Map<string, { total: number; somaProp: number }>();
    for (const x of enriched) {
      const k = (x.bairro ?? "").trim();
      if (!k) continue;
      const cur = porBairro.get(k) ?? { total: 0, somaProp: 0 };
      cur.total += 1;
      cur.somaProp += x.propensao;
      porBairro.set(k, cur);
    }
    const oportunidades = [...porBairro.entries()]
      .map(([bairro, v]) => {
        const mediaProp = v.somaProp / v.total;
        const potencial = Math.round((v.total * (100 - mediaProp)) / 100);
        return { bairro, total: v.total, mediaPropensao: Math.round(mediaProp), potencial };
      })
      .sort((a, b) => b.potencial - a.potencial)
      .slice(0, 8);

    // Insights de IA (opcional — não bloqueia se faltar)
    let insights: string[] = [];
    if (LOVABLE_API_KEY) {
      try {
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content:
                  "Você é um analista político. Receberá um resumo agregado e devolverá 3 a 5 insights curtos (máx 18 palavras cada) e acionáveis em português. Apenas tópicos, sem introdução.",
              },
              {
                role: "user",
                content: JSON.stringify({
                  totalEleitores: enriched.length,
                  distribuicao: dist,
                  emRisco: emRisco.length,
                  influenciadores: influenciadores.length,
                  topBairros: oportunidades.slice(0, 5),
                  totalMensagens: (mensagens as any[]).length,
                }),
              },
            ],
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          const txt: string = data?.choices?.[0]?.message?.content ?? "";
          insights = txt
            .split(/\n+/)
            .map((l) => l.replace(/^[-•\d.\s]+/, "").trim())
            .filter((l) => l.length > 4)
            .slice(0, 5);
        }
      } catch (_e) {
        insights = [];
      }
    }

    return new Response(
      JSON.stringify({
        totalEleitores: enriched.length,
        distribuicao: dist,
        emRisco,
        influenciadores,
        oportunidades,
        insights,
        geradoEm: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    console.error("analise-preditiva error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});