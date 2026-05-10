import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tabelas críticas a incluir no snapshot
const TABLES = [
  "eleitores",
  "liderancas",
  "cabos_eleitorais",
  "eleitor_atribuicoes",
  "analise_eleitores",
  "lgpd_consentimentos",
  "settings_companies",
  "settings_users",
  "settings_user_companies",
  "settings_profiles",
  "settings_profile_permissions",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const results: Record<string, { count: number; path?: string; error?: string }> = {};

    for (const table of TABLES) {
      try {
        const { data, error } = await supabase.from(table).select("*");
        if (error) {
          results[table] = { count: 0, error: error.message };
          continue;
        }
        const path = `${ts}/${table}.json`;
        const body = new Blob([JSON.stringify(data ?? [], null, 2)], {
          type: "application/json",
        });
        const { error: upErr } = await supabase.storage
          .from("db-backups")
          .upload(path, body, { contentType: "application/json", upsert: true });
        if (upErr) {
          results[table] = { count: data?.length ?? 0, error: upErr.message };
        } else {
          results[table] = { count: data?.length ?? 0, path };
        }
      } catch (e) {
        results[table] = { count: 0, error: String(e) };
      }
    }

    // Manifest
    const manifest = {
      timestamp: ts,
      created_at: new Date().toISOString(),
      tables: results,
    };
    await supabase.storage
      .from("db-backups")
      .upload(`${ts}/_manifest.json`, new Blob([JSON.stringify(manifest, null, 2)], {
        type: "application/json",
      }), { contentType: "application/json", upsert: true });

    // Retenção: apaga snapshots com mais de 30 dias
    const { data: folders } = await supabase.storage.from("db-backups").list("", { limit: 1000 });
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const toDelete: string[] = [];
    for (const f of folders ?? []) {
      const folderDate = new Date(f.name.replace(/-/g, (m, i) => (i === 10 ? "T" : m)));
      if (!isNaN(folderDate.getTime()) && folderDate.getTime() < cutoff) {
        const { data: files } = await supabase.storage.from("db-backups").list(f.name);
        for (const file of files ?? []) toDelete.push(`${f.name}/${file.name}`);
      }
    }
    if (toDelete.length) await supabase.storage.from("db-backups").remove(toDelete);

    return new Response(JSON.stringify({ ok: true, manifest, deleted: toDelete.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});