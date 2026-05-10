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

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const { target_user_id, new_password } = await req.json();
    if (!target_user_id || typeof new_password !== "string" || new_password.length < 8) {
      return new Response(JSON.stringify({ error: "Dados inválidos (senha mínima 8 caracteres)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Verifica se o caller é super admin OU possui permissão settings.users.manage
    // em alguma empresa em comum com o alvo.
    const { data: callerInfo } = await admin
      .from("settings_users")
      .select("is_super_admin")
      .eq("id", callerId)
      .maybeSingle();

    let allowed = !!callerInfo?.is_super_admin;

    if (!allowed) {
      const { data: callerCompanies } = await admin
        .from("settings_user_companies")
        .select("company_id, profile_id")
        .eq("user_id", callerId)
        .eq("status", "active");
      const { data: targetCompanies } = await admin
        .from("settings_user_companies")
        .select("company_id")
        .eq("user_id", target_user_id)
        .eq("status", "active");
      const targetSet = new Set((targetCompanies ?? []).map((c) => c.company_id));
      for (const cc of callerCompanies ?? []) {
        if (!targetSet.has(cc.company_id)) continue;
        const { data: hasPerm } = await admin.rpc("user_has_permission", {
          _user_id: callerId,
          _company_id: cc.company_id,
          _permission: "settings.users.manage",
        });
        if (hasPerm === true) { allowed = true; break; }
      }
    }

    if (!allowed) {
      return new Response(JSON.stringify({ error: "Sem permissão para redefinir senha de outros usuários" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(target_user_id, {
      password: new_password,
    });
    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // log
    await admin.from("analise_logs").insert({
      user_id: callerId,
      acao: "usuario.senha_redefinida_por_admin",
      entidade: "auth.users",
      entidade_id: target_user_id,
      detalhes: { por: callerId },
    }).then(() => null, () => null);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});