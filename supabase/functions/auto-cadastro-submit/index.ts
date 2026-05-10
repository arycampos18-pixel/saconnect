import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function onlyDigits(s: string) { return (s ?? "").replace(/\D/g, ""); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json();
    const { token, nome, telefone, cpf, email, lgpd } = body as Record<string, string | boolean>;

    const tel = onlyDigits(String(telefone ?? ""));
    if (!nome || String(nome).trim().length < 3) return new Response(JSON.stringify({ error: "Nome inválido" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    if (tel.length !== 11) return new Response(JSON.stringify({ error: "Telefone inválido (DDD + 9 dígitos)" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    if (!lgpd) return new Response(JSON.stringify({ error: "Consentimento LGPD obrigatório" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    let liderancaId: string | null = null;
    let caboId: string | null = null;
    let companyId: string | null = null;
    let tokenRow: any = null;

    if (token) {
      const { data: t } = await admin
        .from("tokens_auto_cadastro")
        .select("id, expira_em, usado, lideranca_id, cabo_id, company_id, tipo, telefone_destino")
        .eq("token", String(token))
        .maybeSingle();
      if (!t) return new Response(JSON.stringify({ error: "Link inválido" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      if (t.usado) return new Response(JSON.stringify({ error: "Link já utilizado" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      if (new Date(t.expira_em).getTime() < Date.now()) return new Response(JSON.stringify({ error: "Link expirado" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      tokenRow = t;
      liderancaId = t.lideranca_id ?? null;
      caboId = t.cabo_id ?? null;
      companyId = t.company_id ?? null;
    }

    const cpfDigits = onlyDigits(String(cpf ?? ""));
    const cadastradoVia = tokenRow ? (tokenRow.tipo === "qrcode" ? "qrcode" : tokenRow.tipo === "whatsapp" ? "whatsapp" : "auto-cadastro") : "auto-cadastro";

    // Quando o link foi enviado por WhatsApp/SMS, o telefone do destinatário é a "fonte da verdade"
    // e o WhatsApp do eleitor fica protegido (somente admin pode editar depois).
    const telDestino = tokenRow?.telefone_destino ? onlyDigits(String(tokenRow.telefone_destino)) : "";
    const whatsappOrigem = telDestino || tel;
    const whatsappBloqueado = !!telDestino; // só bloqueia se houve envio para um número específico

    const insertPayload: Record<string, unknown> = {
      nome: String(nome).trim(),
      telefone: telDestino || tel,
      telefone_original: telDestino || String(telefone),
      cpf: cpfDigits || null,
      email: email ? String(email) : null,
      origem: cadastradoVia === "qrcode" ? "QR Code" : cadastradoVia === "whatsapp" ? "WhatsApp" : "Auto-cadastro",
      consentimento_lgpd: true,
      aceite_lgpd: true,
      data_aceite_lgpd: new Date().toISOString(),
      cadastrado_via: cadastradoVia,
      lideranca_id: liderancaId,
      lideranca_origem_id: liderancaId,
      cabo_id: caboId,
      cabo_origem_id: caboId,
      cabo_eleitoral_id: caboId,
      company_id: companyId,
      token_cadastro_id: tokenRow?.id ?? null,
      // ✅ Validação automática
      validado: true,
      validado_em: new Date().toISOString(),
      status_validacao_eleitoral: "validado",
      status_validacao_whatsapp: "validado",
      telefone_validado: true,
      // ✅ Proteção do WhatsApp
      whatsapp_origem: whatsappOrigem,
      whatsapp_bloqueado: whatsappBloqueado,
    };

    const { data: el, error: insErr } = await admin
      .from("eleitores")
      .insert(insertPayload)
      .select("id, nome")
      .single();
    if (insErr) throw insErr;

    if (tokenRow) {
      await admin
        .from("tokens_auto_cadastro")
        .update({ usado: true, usado_em: new Date().toISOString(), usado_por_eleitor_id: el.id })
        .eq("id", tokenRow.id);
    }

    return new Response(JSON.stringify({ ok: true, eleitor_id: el.id, nome: el.nome }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});