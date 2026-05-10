import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    let token: string | null = null;
    if (req.method === "GET") {
      token = new URL(req.url).searchParams.get("token");
    } else {
      const b = await req.json().catch(() => ({}));
      token = b.token ?? null;
    }
    if (!token) return new Response(JSON.stringify({ valido: false, motivo: "Token ausente" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const { data: t } = await admin
      .from("tokens_auto_cadastro")
      .select("id, token, tipo, expira_em, usado, lideranca_id, cabo_id, company_id, telefone_destino")
      .eq("token", token)
      .maybeSingle();

    if (!t) return new Response(JSON.stringify({ valido: false, motivo: "Link inválido" }), { headers: { ...cors, "Content-Type": "application/json" } });
    if (t.usado) return new Response(JSON.stringify({ valido: false, motivo: "Link já utilizado" }), { headers: { ...cors, "Content-Type": "application/json" } });
    if (new Date(t.expira_em).getTime() < Date.now()) return new Response(JSON.stringify({ valido: false, motivo: "Link expirado" }), { headers: { ...cors, "Content-Type": "application/json" } });

    let lideranca: { nome: string } | null = null;
    let cabo: { nome: string } | null = null;
    if (t.lideranca_id) {
      const { data } = await admin.from("liderancas").select("nome").eq("id", t.lideranca_id).maybeSingle();
      lideranca = data ?? null;
    }
    if (t.cabo_id) {
      const { data } = await admin.from("cabos_eleitorais").select("nome").eq("id", t.cabo_id).maybeSingle();
      cabo = data ?? null;
    }

    return new Response(JSON.stringify({ valido: true, expira_em: t.expira_em, tipo: t.tipo, lideranca, cabo, telefone_destino: t.telefone_destino ?? null }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ valido: false, motivo: (e as Error).message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});