import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!token) return json({ error: "Não autenticado" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData } = await userClient.auth.getUser(token);
    if (!userData?.user) return json({ error: "Sessão inválida" }, 401);
    const callerId = userData.user.id;

    const { target_user_id } = await req.json();
    if (!target_user_id) return json({ error: "target_user_id obrigatório" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: callerInfo } = await admin
      .from("settings_users").select("is_super_admin").eq("id", callerId).maybeSingle();
    let allowed = !!callerInfo?.is_super_admin;
    if (!allowed) {
      const { data: cc } = await admin.from("settings_user_companies")
        .select("company_id").eq("user_id", callerId).eq("status", "active");
      for (const row of cc ?? []) {
        const { data: ok } = await admin.rpc("user_has_permission", {
          _user_id: callerId, _company_id: row.company_id, _permission: "settings.users.manage",
        });
        if (ok === true) { allowed = true; break; }
      }
    }
    if (!allowed) return json({ error: "Sem permissão" }, 403);

    const { error } = await admin.auth.admin.updateUserById(target_user_id, { email_confirm: true });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true }, 200);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }

  function json(body: unknown, status: number) {
    return new Response(JSON.stringify(body), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});