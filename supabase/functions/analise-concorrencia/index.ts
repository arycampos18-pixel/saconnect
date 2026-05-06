import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const dias: number = body?.dias ?? 30;
    const desde = new Date();
    desde.setDate(desde.getDate() - dias);

    const [{ data: concorrentes = [] }, { data: atividades = [] }] = await Promise.all([
      supabase.from("concorrentes").select("*").eq("ativo", true),
      supabase
        .from("concorrente_atividades")
        .select("*")
        .gte("data_atividade", desde.toISOString())
        .order("data_atividade", { ascending: false }),
    ]);

    // Sentimento agregado: usa o cadastrado; se faltar, infere por palavras-chave simples
    const NEG = ["crise", "denúncia", "denuncia", "escândalo", "escandalo", "polêmica", "polemica", "queda", "rejeição", "rejeicao"];
    const POS = ["sucesso", "lançamento", "lancamento", "vitória", "vitoria", "apoio", "elogio", "alta"];
    let pos = 0, neu = 0, neg = 0;
    const palavras: Record<string, number> = {};
    for (const a of atividades as any[]) {
      let s = a.sentimento as string | null;
      const txt = `${a.titulo ?? ""} ${a.descricao ?? ""}`.toLowerCase();
      if (!s) {
        if (NEG.some((w) => txt.includes(w))) s = "Negativo";
        else if (POS.some((w) => txt.includes(w))) s = "Positivo";
        else s = "Neutro";
      }
      if (s === "Positivo") pos++;
      else if (s === "Negativo") neg++;
      else neu++;
      for (const w of txt.split(/\W+/)) {
        if (w.length < 5) continue;
        palavras[w] = (palavras[w] ?? 0) + 1;
      }
    }
    const topPalavras = Object.entries(palavras)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([palavra, total]) => ({ palavra, total }));

    // Insights por IA (opcional)
    let insights: string[] = [];
    if (LOVABLE_API_KEY && atividades.length > 0) {
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                  "Você é analista político. Em 3 a 5 tópicos curtos (máx 18 palavras), traga insights estratégicos sobre os concorrentes e ações recomendadas. Português, apenas tópicos.",
              },
              {
                role: "user",
                content: JSON.stringify({
                  concorrentes: (concorrentes as any[]).map((c) => ({
                    nome: c.nome,
                    partido: c.partido,
                    seguidores: c.seguidores,
                    engajamento: c.engajamento_pct,
                  })),
                  atividadesRecentes: (atividades as any[]).slice(0, 25).map((a) => ({
                    concorrente_id: a.concorrente_id,
                    tipo: a.tipo,
                    titulo: a.titulo,
                    bairro: a.bairro,
                  })),
                  sentimento: { pos, neu, neg },
                }),
              },
            ],
          }),
        });
        if (r.ok) {
          const d = await r.json();
          const txt: string = d?.choices?.[0]?.message?.content ?? "";
          insights = txt
            .split(/\n+/)
            .map((l) => l.replace(/^[-•\d.\s]+/, "").trim())
            .filter((l) => l.length > 4)
            .slice(0, 5);
        }
      } catch (_) {
        insights = [];
      }
    }

    return new Response(
      JSON.stringify({
        concorrentes,
        atividades,
        sentimento: { positivo: pos, neutro: neu, negativo: neg, total: pos + neu + neg },
        palavras: topPalavras,
        insights,
        periodoDias: dias,
        geradoEm: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    console.error("analise-concorrencia error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});