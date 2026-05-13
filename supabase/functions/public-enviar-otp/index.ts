/**
 * Edge Function pública — Envia OTP de verificação de WhatsApp para pesquisas públicas.
 * verify_jwt = false (acesso sem autenticação)
 *
 * Fluxo:
 *   1. Frontend chama com { telefone, nome }
 *   2. Esta função cria o OTP via RPC public_criar_otp
 *   3. Envia o código via Z-API
 *   4. Devolve { ok: true, id: <uuid> } para o frontend usar na verificação
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const INSTANCE_ID   = Deno.env.get("ZAPI_INSTANCE_ID");
  const INSTANCE_TOKEN= Deno.env.get("ZAPI_INSTANCE_TOKEN");
  const CLIENT_TOKEN  = Deno.env.get("ZAPI_CLIENT_TOKEN");

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const telefone = String(body.telefone ?? "").replace(/\D/g, "");
    const nome = String(body.nome ?? "").trim();

    if (telefone.length < 10) {
      return json({ ok: false, error: "Informe um número de WhatsApp válido com DDD" }, 400);
    }

    // 1) Criar OTP no banco (nome opcional)
    const { data: otpData, error: otpErr } = await admin.rpc("public_criar_otp", {
      _telefone: telefone,
      _nome:     nome || null,
    });

    if (otpErr || !otpData?.ok) {
      return json({ ok: false, error: otpData?.error ?? otpErr?.message ?? "Erro ao gerar código" }, 500);
    }

    const codigo = otpData.codigo as string;
    const id     = otpData.id as string;

    // 2) Credenciais Z-API: secrets da função OU sessão padrão no banco (mesmo padrão de agenda-notificacoes-diarias)
    const normalizePhoneBR = (raw: string) => {
      const d = raw.replace(/\D/g, "");
      if (d.length === 10 || d.length === 11) return `55${d}`;
      if (d.length === 12 || d.length === 13) return d;
      return d;
    };

    let instanceId = (INSTANCE_ID ?? "").trim();
    let instanceToken = (INSTANCE_TOKEN ?? "").trim();
    let clientToken = (CLIENT_TOKEN ?? "").trim();

    const { data: sess } = await admin
      .from("whatsapp_sessions")
      .select("credentials")
      .eq("provider", "zapi")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const c = (sess?.credentials ?? {}) as Record<string, string>;
    const dbId = (c.instance_id ?? "").trim();
    const dbTok = (c.token ?? "").trim();
    const dbCt = (c.client_token ?? "").trim();
    if (!instanceId && dbId) instanceId = dbId;
    if (!instanceToken && dbTok) instanceToken = dbTok;
    if (!clientToken && dbCt) clientToken = dbCt;

    if (!instanceId || !instanceToken || !clientToken) {
      return json({
        ok: false,
        error:
          "Z-API não configurado (instância + token + Client-Token). Cadastre uma sessão em WhatsApp ou defina os secrets ZAPI_* na Edge Function.",
      }, 503);
    }

    // 3) Número apenas dígitos, DDI 55
    const tel = normalizePhoneBR(telefone);

    const saud = nome ? `Olá, ${nome}! 👋` : "Olá! 👋";
    const msg = `${saud}\n\nSeu código de verificação para a pesquisa é:\n\n*${codigo}*\n\nVálido por 10 minutos. Não compartilhe com ninguém.`;

    // 4) Enviar via Z-API
    const zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${instanceToken}/send-text`;
    const zapiHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "Client-Token": clientToken,
    };

    const zapiRes = await fetch(zapiUrl, {
      method: "POST",
      headers: zapiHeaders,
      body: JSON.stringify({ phone: tel, message: msg }),
      signal: AbortSignal.timeout(15000),
    });

    const zapiBody = await zapiRes.json().catch(() => ({})) as Record<string, unknown>;
    const zapiErrText = (() => {
      const e = zapiBody.error ?? zapiBody.message;
      return typeof e === "string" ? e : "";
    })();

    if (!zapiRes.ok || zapiErrText) {
      console.error("[public-enviar-otp] Z-API error:", zapiRes.status, zapiBody);
      return json({
        ok: false,
        error: `Falha ao enviar WhatsApp: ${zapiErrText || zapiRes.status}`,
      }, 502);
    }

    return json({ ok: true, id, telefone_mascarado: `(${tel.slice(2,4)}) 9****-${tel.slice(-4)}` });

  } catch (e) {
    console.error("[public-enviar-otp] erro:", e);
    return json({ ok: false, error: (e as Error).message ?? "Erro interno" }, 500);
  }
});
