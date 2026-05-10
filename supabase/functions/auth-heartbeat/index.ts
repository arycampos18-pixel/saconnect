// Edge function: heartbeat — confirma que a sessão da app continua activa.
// Usado pelo cliente a cada 60s; se a sessão foi revogada, devolve { active: false }
// e o cliente faz signOut local imediatamente.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: cErr } = await anon.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (cErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const sessionJti: string = String(body?.session_jti ?? "");
    if (!sessionJti) return json({ error: "session_jti obrigatório" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: row } = await admin
      .from("auth_app_sessions")
      .select("id, revoked_at, revoked_reason")
      .eq("user_id", userId)
      .eq("session_jti", sessionJti)
      .maybeSingle();

    if (!row) return json({ active: false, reason: "unknown" }, 200);
    if (row.revoked_at) return json({ active: false, reason: row.revoked_reason ?? "revoked" }, 200);

    await admin
      .from("auth_app_sessions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", row.id);

    return json({ active: true }, 200);
  } catch (e) {
    console.error(e);
    return json({ error: "Internal error" }, 500);
  }

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});