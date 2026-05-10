import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PERFIS_ALVO = ["Admin", "Liderança", "Cabo Eleitoral", "Usuario Politico"];

const ICONES: Record<string, string> = {
  "Reunião": "👥", "Visita": "🚗", "Evento": "🎤",
  "Audiência": "⚖️", "Outro": "📋",
};

function fmtTime(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

function formatarTelefone(tel: string): string | null {
  let n = (tel || "").replace(/\D/g, "");
  if (!n) return null;
  if (n.startsWith("0")) n = n.substring(1);
  if (!n.startsWith("55")) n = "55" + n;
  if (n.length < 12 || n.length > 13) return null;
  return n;
}

function montarMensagem(nome: string, perfil: string, compromissos: any[], dataRef: Date): string {
  const dataStr = dataRef.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo",
  });
  let msg = `*🗓️ Compromissos de Amanhã*\n_${dataStr}_\n\n`;
  msg += `Olá *${nome}*! Você tem ${compromissos.length} compromisso(s) agendado(s):\n\n`;
  compromissos.forEach((c, i) => {
    const ini = new Date(c.data_hora);
    const fim = new Date(ini.getTime() + (c.duracao_min || 60) * 60000);
    const icone = ICONES[c.categoria] ?? "📌";
    msg += `*${i + 1}. ${icone} ${c.titulo}*\n`;
    msg += `   ⏰ ${fmtTime(ini)} – ${fmtTime(fim)}\n`;
    if (c.local) msg += `   📍 ${c.local}\n`;
    msg += `   🏷️ ${c.categoria} · Prioridade ${c.prioridade}\n\n`;
  });
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📱 Acesse a agenda completa em SA CONNECT\n`;
  msg += `_Você recebe esta mensagem porque está cadastrado como ${perfil}._`;
  return msg;
}

type ZapiCreds = { instance_id: string; instance_token: string; client_token: string };

async function sendZapi(creds: ZapiCreds, telefone: string, mensagem: string) {
  const url = `https://api.z-api.io/instances/${creds.instance_id}/token/${creds.instance_token}/send-text`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Client-Token": creds.client_token },
    body: JSON.stringify({ phone: telefone, message: mensagem }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Z-API ${r.status}: ${text.slice(0, 300)}`);
  return text;
}

async function resolveCreds(supabase: any, companyId: string | null): Promise<ZapiCreds> {
  // 1) whatsapp_sessions da company
  if (companyId) {
    const { data: sess } = await supabase
      .from("whatsapp_sessions").select("credentials")
      .eq("company_id", companyId).eq("provider", "zapi")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1).maybeSingle();
    const c = (sess?.credentials ?? {}) as Record<string, string>;
    if (c.instance_id && c.token && c.client_token) {
      return { instance_id: c.instance_id.trim(), instance_token: c.token.trim(), client_token: c.client_token.trim() };
    }
  }
  // 2) qualquer sessão default
  const { data: any1 } = await supabase
    .from("whatsapp_sessions").select("credentials")
    .eq("provider", "zapi")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1).maybeSingle();
  const c2 = (any1?.credentials ?? {}) as Record<string, string>;
  if (c2.instance_id && c2.token && c2.client_token) {
    return { instance_id: c2.instance_id.trim(), instance_token: c2.token.trim(), client_token: c2.client_token.trim() };
  }
  // 3) ENV (fallback)
  return {
    instance_id: Deno.env.get("ZAPI_INSTANCE_ID") ?? "",
    instance_token: Deno.env.get("ZAPI_INSTANCE_TOKEN") ?? "",
    client_token: Deno.env.get("ZAPI_CLIENT_TOKEN") ?? "",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Permite forçar uma data específica (testes), padrão = amanhã
    let body: any = {};
    try { body = req.method === "POST" ? await req.json() : {}; } catch { /* ignore */ }

    const dataRef = body?.data_ref ? new Date(body.data_ref) : (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; })();
    const inicio = new Date(dataRef); inicio.setUTCHours(0, 0, 0, 0);
    const fim = new Date(dataRef); fim.setUTCHours(23, 59, 59, 999);

    const testPhone: string | undefined = body?.test_phone;

    // Busca todos compromissos do dia de referência
    const { data: compromissos, error: errC } = await supabase
      .from("agenda_compromissos")
      .select("*")
      .gte("data_hora", inicio.toISOString())
      .lte("data_hora", fim.toISOString())
      .neq("status", "Cancelado")
      .order("data_hora", { ascending: true });
    if (errC) throw errC;

    if (!compromissos || compromissos.length === 0) {
      if (!testPhone) {
        return new Response(JSON.stringify({ ok: true, info: "Sem compromissos para amanhã.", enviados: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Modo TESTE: envia somente para um número específico
    if (testPhone) {
      const tel = formatarTelefone(testPhone);
      if (!tel) {
        return new Response(JSON.stringify({ error: "Telefone de teste inválido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const lista = compromissos ?? [];
      const mensagem = lista.length > 0
        ? montarMensagem(body?.test_nome ?? "Usuário", body?.test_perfil ?? "Admin", lista, dataRef)
        : `*🗓️ Compromissos de Amanhã*\n_${dataRef.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" })}_\n\nOlá! Nenhum compromisso encontrado para amanhã.\n\n📱 SA CONNECT — teste de notificação.`;
      const creds = await resolveCreds(supabase, null);
      try {
        await sendZapi(creds, tel, mensagem);
        await supabase.from("agenda_notificacoes_log").insert({
          telefone: tel, canal: "whatsapp", status: "enviado",
          total_compromissos: lista.length,
          data_referencia: dataRef.toISOString().slice(0, 10),
          mensagem, enviado_em: new Date().toISOString(),
        });
        return new Response(JSON.stringify({ ok: true, modo: "teste", telefone: tel, total_compromissos: lista.length, mensagem }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, modo: "teste", telefone: tel, erro: String(e?.message ?? e) }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Agrupa por company
    const porCompany = new Map<string, any[]>();
    for (const c of compromissos) {
      const k = c.company_id ?? "_global";
      const arr = porCompany.get(k) ?? []; arr.push(c); porCompany.set(k, arr);
    }

    let enviados = 0, falhas = 0;
    const detalhes: any[] = [];

    for (const [companyId, comps] of porCompany.entries()) {
      // Usuários da empresa com perfis-alvo + telefone
      const { data: vinculos, error: errV } = await supabase
        .from("settings_user_companies")
        .select("user_id, settings_profiles!inner(nome), settings_users!inner(id, nome, status)")
        .eq("status", "active")
        .eq("company_id", companyId === "_global" ? "00000000-0000-0000-0000-000000000000" : companyId);
      if (errV) { console.error("erro vinculos", errV); continue; }

      const userIds = (vinculos ?? [])
        .filter((v: any) => PERFIS_ALVO.includes(v.settings_profiles?.nome) && v.settings_users?.status === "active")
        .map((v: any) => v.user_id);

      if (userIds.length === 0) continue;

      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, nome, telefone")
        .in("user_id", userIds);

      const perfilByUser = new Map(
        (vinculos ?? []).map((v: any) => [v.user_id, v.settings_profiles?.nome])
      );

      for (const p of profs ?? []) {
        const tel = formatarTelefone(p.telefone ?? "");
        if (!tel) continue;
        const perfil = perfilByUser.get(p.user_id) ?? "Usuário";
        const mensagem = montarMensagem(p.nome, perfil, comps, dataRef);

        let status = "enviado", erro: string | null = null;
        try {
          const creds = await resolveCreds(supabase, companyId === "_global" ? null : companyId);
          await sendZapi(creds, tel, mensagem);
          enviados++;
        } catch (e: any) {
          status = "falha"; erro = String(e?.message ?? e); falhas++;
        }

        await supabase.from("agenda_notificacoes_log").insert({
          company_id: companyId === "_global" ? null : companyId,
          user_id: p.user_id,
          telefone: tel,
          canal: "whatsapp",
          status,
          total_compromissos: comps.length,
          data_referencia: dataRef.toISOString().slice(0, 10),
          mensagem,
          erro,
          enviado_em: status === "enviado" ? new Date().toISOString() : null,
        });
        detalhes.push({ user: p.nome, tel, status, erro });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, data_ref: dataRef.toISOString().slice(0, 10), enviados, falhas, detalhes }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("agenda-notificacoes-diarias erro:", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});