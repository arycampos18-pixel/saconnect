import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function render(tpl: string, vars: Record<string, any>) {
  return String(tpl ?? "").replace(/\{(\w+)\}/g, (_m, k) => (vars[k] ?? "").toString());
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID");
    const ZAPI_INSTANCE_TOKEN = Deno.env.get("ZAPI_INSTANCE_TOKEN");
    const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: ud, error: ue } = await supabaseUser.auth.getUser();
    if (ue || !ud.user) return new Response(JSON.stringify({ error: "Sessão inválida" }), { status: 401, headers: corsHeaders });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json();
    const { automacao_id, contexto } = body as { automacao_id: string; contexto?: Record<string, any> };
    if (!automacao_id) return new Response(JSON.stringify({ error: "automacao_id obrigatório" }), { status: 400, headers: corsHeaders });

    const { data: auto, error: ae } = await admin.from("automacoes").select("*").eq("id", automacao_id).single();
    if (ae || !auto) throw new Error("Automação não encontrada");

    type N = { id: string; type: string; data: Record<string, any> };
    const nodes: N[] = (auto.nodes as any) ?? [];
    const edges: { source: string; target: string }[] = (auto.edges as any) ?? [];
    const adj = new Map<string, string[]>();
    for (const e of edges) adj.set(e.source, [...(adj.get(e.source) ?? []), e.target]);
    const map = new Map(nodes.map((n) => [n.id, n]));

    const acoes: any[] = [];
    const ctx = contexto ?? {};

    async function exec(nid: string) {
      const n = map.get(nid);
      if (!n) return;
      if (n.type === "acao") {
        const tipo = n.data?.acaoTipo ?? n.data?.tipo;
        const params = n.data?.params ?? n.data ?? {};
        if (tipo === "enviar_whatsapp" && ZAPI_INSTANCE_ID && ZAPI_INSTANCE_TOKEN && ZAPI_CLIENT_TOKEN) {
          const phone = String(params.telefone ?? ctx.telefone ?? "").replace(/\D/g, "");
          const msg = render(params.mensagem ?? params.template ?? "", ctx);
          if (phone && msg) {
            const r = await fetch(
              `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_INSTANCE_TOKEN}/send-text`,
              { method: "POST", headers: { "Content-Type": "application/json", "Client-Token": ZAPI_CLIENT_TOKEN }, body: JSON.stringify({ phone, message: msg }) },
            );
            const data = await r.json().catch(() => ({}));
            acoes.push({ tipo, ok: r.ok, response: data });
            await admin.from("mensagens_externas").insert({
              user_id: ud.user!.id, canal: "WhatsApp", destinatario: phone,
              destinatario_nome: ctx.nome ?? null, conteudo: msg,
              status: r.ok ? "Enviado" : "Falhou", provedor: "Z-API",
              provedor_message_id: data?.messageId ?? null,
              enviado_em: r.ok ? new Date().toISOString() : null,
              erro: r.ok ? null : (data?.error || `HTTP ${r.status}`),
              metadata: { automacao_id, response: data },
            });
          } else acoes.push({ tipo, ok: false, erro: "telefone ou mensagem vazios" });
        } else if (tipo === "criar_tarefa") {
          const { error } = await admin.from("crm_tarefas").insert({
            titulo: render(params.titulo ?? "Tarefa automática", ctx),
            descricao: render(params.descricao ?? "", ctx),
            prioridade: params.prioridade ?? "Média",
            eleitor_id: ctx.eleitor_id ?? null,
            responsavel_id: params.responsavel_id ?? ud.user!.id,
            created_by: ud.user!.id,
          });
          acoes.push({ tipo, ok: !error, erro: error?.message });
        } else if (tipo === "adicionar_tag" && ctx.eleitor_id && params.tag_id) {
          const { error } = await admin.from("eleitor_tags").insert({ eleitor_id: ctx.eleitor_id, tag_id: params.tag_id });
          acoes.push({ tipo, ok: !error, erro: error?.message });
        } else if (tipo === "aguardar") {
          await new Promise((res) => setTimeout(res, Math.min(Number(params.segundos ?? 1) * 1000, 10000)));
          acoes.push({ tipo, ok: true });
        } else {
          acoes.push({ tipo: tipo ?? "desconhecida", ok: false, erro: "tipo não suportado" });
        }
      }
      for (const next of adj.get(nid) ?? []) await exec(next);
    }

    const trigger = nodes.find((n) => n.type === "trigger");
    let status: "Sucesso" | "Erro" = "Sucesso";
    let erro: string | null = null;
    try {
      if (trigger) await exec(trigger.id);
    } catch (e) {
      status = "Erro";
      erro = e instanceof Error ? e.message : "Erro";
    }

    await admin.from("automacao_execucoes").insert({
      automacao_id, status, trigger_origem: ctx.origem ?? "manual",
      contexto: ctx, acoes_executadas: acoes, erro,
      created_by: ud.user.id,
    });
    await admin.from("automacoes").update({
      total_execucoes: (auto.total_execucoes ?? 0) + 1,
      ultima_execucao_em: new Date().toISOString(),
    }).eq("id", automacao_id);

    return new Response(JSON.stringify({ ok: status === "Sucesso", acoes, erro }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    console.error("automacao-executar:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});