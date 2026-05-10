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

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: u, error: ue } = await sb.auth.getUser();
    if (ue || !u.user) return new Response(JSON.stringify({ error: "Sessão inválida" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const tipo = (body.tipo as string) ?? "link";
    if (!["qrcode", "whatsapp", "link"].includes(tipo)) {
      return new Response(JSON.stringify({ error: "Tipo inválido" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Telefone destino (quando o link é enviado por WhatsApp/SMS)
    const telDestinoRaw = (body.telefone_destino as string | undefined) ?? "";
    const telDestino = telDestinoRaw.replace(/\D/g, "");
    if (tipo === "whatsapp" && telDestino.length < 10) {
      return new Response(JSON.stringify({ error: "Telefone destino inválido" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // resolve company + lideranca/cabo do usuário
    const { data: companyId } = await sb.rpc("user_default_company", { _user_id: u.user.id });

    let liderancaId: string | null = body.lideranca_id ?? null;
    let caboId: string | null = body.cabo_id ?? null;
    if (!liderancaId) {
      const { data: lid } = await admin.from("liderancas").select("id").eq("user_id", u.user.id).maybeSingle();
      liderancaId = lid?.id ?? null;
    }
    if (!caboId) {
      const { data: cab } = await admin.from("cabos_eleitorais").select("id,lideranca_id").eq("user_id", u.user.id).maybeSingle();
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
        created_by: u.user.id,
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