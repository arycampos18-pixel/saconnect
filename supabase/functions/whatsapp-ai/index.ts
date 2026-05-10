import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * IA para o módulo WhatsApp via Lovable AI Gateway.
 * Body: { action: "suggest" | "summarize" | "sentiment" | "classify", conversaId: string, contextoExtra?: string }
 */

const SYS = {
  suggest: `Você é um assistente de atendimento ao cidadão num gabinete político brasileiro.
Gere UMA resposta curta, empática, profissional e objetiva (no máximo 3 frases) para enviar via WhatsApp como o atendente.
Tom: respeitoso, próximo. Sem emojis em excesso. Não invente informações que não estão no contexto.`,
  summarize: `Resuma a conversa abaixo em até 4 bullets curtos em português, destacando: assunto principal, pedidos do eleitor, status atual e próximos passos. Seja direto.`,
  sentiment: `Classifique o sentimento geral do eleitor nesta conversa em UMA das opções: "satisfeito", "neutro", "irritado", "urgente". Responda APENAS com a palavra.`,
  classify: `Classifique o assunto principal desta conversa em UMA categoria curta em português (ex: Saúde, Asfalto, Iluminação, Segurança, Educação, Denúncia, Elogio, Solicitação, Outro). Responda APENAS a categoria.`,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    if (!LOVABLE_API_KEY) return j({ error: "LOVABLE_API_KEY ausente" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return j({ error: "Não autenticado" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return j({ error: "Sessão inválida" }, 401);

    const { action, conversaId, contextoExtra = "" } = await req.json();
    if (!action || !conversaId) return j({ error: "action e conversaId obrigatórios" }, 400);
    if (!(action in SYS)) return j({ error: "action inválida" }, 400);

    // Busca últimas 30 mensagens
    const { data: msgs, error: mErr } = await supabase
      .from("whatsapp_mensagens")
      .select("direcao,conteudo,tipo,created_at")
      .eq("conversa_id", conversaId)
      .order("created_at", { ascending: true })
      .limit(30);
    if (mErr) return j({ error: mErr.message }, 500);

    const transcript = (msgs ?? [])
      .map((m: any) => `${m.direcao === "entrada" ? "ELEITOR" : "ATENDENTE"}: ${m.conteudo ?? `[${m.tipo}]`}`)
      .join("\n");

    const userMsg = `${contextoExtra ? `Contexto: ${contextoExtra}\n\n` : ""}Conversa:\n${transcript}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYS[action as keyof typeof SYS] },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (r.status === 429) return j({ error: "Limite de requisições atingido. Tente em instantes." }, 429);
    if (r.status === 402) return j({ error: "Créditos de IA esgotados." }, 402);
    if (!r.ok) {
      const txt = await r.text();
      return j({ error: `Erro IA (${r.status}): ${txt.slice(0, 200)}` }, 502);
    }

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content?.trim() ?? "";
    return j({ result: text });
  } catch (e) {
    return j({ error: e instanceof Error ? e.message : "Erro" }, 500);
  }

  function j(b: unknown, s = 200) {
    return new Response(JSON.stringify(b), {
      status: s,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});