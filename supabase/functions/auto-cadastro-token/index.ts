import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function randomToken(len = 32) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, len);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const jsonErr = (msg: string, status = 400) =>
    new Response(JSON.stringify({ error: msg }), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return jsonErr("Não autenticado", 401);

    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    const userId = (() => {
      try {
        const part = (jwt.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/");
        const padded = part + "=".repeat((4 - part.length % 4) % 4);
        const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
        const sub = payload.sub ?? payload.user_id;
        return typeof sub === "string" && sub.length > 0 ? sub : null;
      } catch { return null; }
    })();
    if (!userId) return jsonErr("Token inválido", 401);

    // cliente com contexto do utilizador (para RLS e rpc)
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });

    const body = await req.json().catch(() => ({}));
    const tipo = (body.tipo as string) ?? "link";
    if (!["qrcode", "whatsapp", "link"].includes(tipo)) {
      return jsonErr("Tipo inválido");
    }

    // Telefone destino (quando o link é enviado por WhatsApp/SMS)
    const telDestinoRaw = (body.telefone_destino as string | undefined) ?? "";
    const telDestino = telDestinoRaw.replace(/\D/g, "");
    if (tipo === "whatsapp" && telDestino.length < 10) {
      return jsonErr("Telefone destino inválido");
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // resolve company + lideranca/cabo do usuário
    const { data: companyId } = await sb.rpc("user_default_company", { _user_id: userId });

    let liderancaId: string | null = body.lideranca_id ?? null;
    let caboId: string | null = body.cabo_id ?? null;
    if (!liderancaId) {
      const { data: lid } = await admin.from("liderancas").select("id").eq("user_id", userId).maybeSingle();
      liderancaId = lid?.id ?? null;
    }
    if (!caboId) {
      const { data: cab } = await admin.from("cabos_eleitorais").select("id,lideranca_id").eq("user_id", userId).maybeSingle();
      if (cab) {
        caboId = cab.id;
        if (!liderancaId) liderancaId = cab.lideranca_id ?? null;
      }
    }

    const token = randomToken(32);
    const dias = Number(body.dias_validade ?? 30);
    const expira = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await admin
      .from("tokens_auto_cadastro")
      .insert({
        token,
        tipo,
        lideranca_id: liderancaId,
        cabo_id: caboId,
        company_id: companyId ?? null,
        created_by: userId,
        expira_em: expira,
        telefone_destino: telDestino || null,
      })
      .select("id, token, expira_em, tipo")
      .single();
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, ...data }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});