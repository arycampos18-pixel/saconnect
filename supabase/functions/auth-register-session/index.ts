// Edge function: regista nova sessão da app e revoga as anteriores do mesmo user.
// Política: "novo desliga antigo" — o cliente antigo é notificado via realtime
// (UPDATE em auth_app_sessions) e fará signOut local.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData, error: claimsErr } = await anon.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claimsData?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const sessionJti: string = String(body?.session_jti ?? "").slice(0, 200);
    const deviceLabel: string | null = body?.device_label ? String(body.device_label).slice(0, 200) : null;
    if (!sessionJti) return json({ error: "session_jti obrigatório" }, 400);

    const ua = req.headers.get("user-agent")?.slice(0, 500) ?? null;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Revoga sessões anteriores activas (haverá realtime UPDATE -> cliente antigo desloga)
    const { data: previous } = await admin
      .from("auth_app_sessions")
      .select("id, session_jti, user_agent, ip")
      .eq("user_id", userId)
      .is("revoked_at", null);

    const replacedAny = (previous?.length ?? 0) > 0;

    if (replacedAny) {
      await admin
        .from("auth_app_sessions")
        .update({ revoked_at: new Date().toISOString(), revoked_reason: "replaced" })
        .eq("user_id", userId)
        .is("revoked_at", null);

      // Regista evento de segurança
      await admin.from("security_events").insert({
        user_id: userId,
        event_type: "concurrent_login_replaced",
        detalhes: {
          previous_count: previous?.length ?? 0,
          previous_user_agents: previous?.map((p) => p.user_agent).filter(Boolean) ?? [],
        },
        ip,
        user_agent: ua,
      });
    }

    const { data: inserted, error: insertErr } = await admin
      .from("auth_app_sessions")
      .insert({
        user_id: userId,
        session_jti: sessionJti,
        device_label: deviceLabel,
        user_agent: ua,
        ip,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("auth-register-session insert err", insertErr);
      return json({ error: "Falha ao registrar sessão" }, 500);
    }

    return json({ session_id: inserted.id, replaced: replacedAny }, 200);
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