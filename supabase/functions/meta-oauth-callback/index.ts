import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: claims, error: cErr } = await supabase.auth.getClaims(
      auth.replace("Bearer ", ""),
    );
    if (cErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { code, session_id, redirect_uri } = body ?? {};
    if (!code || !session_id) {
      return new Response(
        JSON.stringify({ error: "code and session_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: session, error: sErr } = await supabase
      .from("whatsapp_meta_sessions")
      .select("*")
      .eq("id", session_id)
      .maybeSingle();
    if (sErr || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const APP_ID = session.app_id ?? Deno.env.get("META_APP_ID");
    const APP_SECRET = session.app_secret ?? Deno.env.get("META_APP_SECRET");
    if (!APP_ID || !APP_SECRET) {
      return new Response(
        JSON.stringify({
          error:
            "META_APP_ID/META_APP_SECRET ausentes. Configure secrets ou preencha na sessão.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tokenUrl = new URL("https://graph.facebook.com/v20.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", APP_ID);
    tokenUrl.searchParams.set("client_secret", APP_SECRET);
    tokenUrl.searchParams.set("code", code);
    if (redirect_uri) tokenUrl.searchParams.set("redirect_uri", redirect_uri);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) {
      await supabase
        .from("whatsapp_meta_sessions")
        .update({
          status: "error",
          error_message: JSON.stringify(tokenJson),
        })
        .eq("id", session_id);
      return new Response(JSON.stringify({ error: tokenJson }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("whatsapp_meta_sessions")
      .update({
        access_token: tokenJson.access_token,
        status: "verified",
        connected_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", session_id);

    return new Response(
      JSON.stringify({ session_id, status: "verified" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});