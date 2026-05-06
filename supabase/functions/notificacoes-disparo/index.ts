import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Roda a cada 15 min via cron. Cria notificações in-app + WhatsApp para:
 *  - Tarefas que vencem nas próximas 2 horas (responsável)
 *  - Eventos que começam nas próximas 2 horas (responsável)
 *  - Aprovações pendentes há mais de 24h (admins) — uma vez por dia
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID");
    const ZAPI_INSTANCE_TOKEN = Deno.env.get("ZAPI_INSTANCE_TOKEN");
    const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: cfg } = await admin.from("sistema_config").select("*").limit(1).maybeSingle();
    const notificarTarefa = cfg?.notificar_responsavel_tarefa ?? true;
    const notificarEvento = cfg?.notificar_evento_proximo ?? true;

    const agora = new Date();
    const em2h = new Date(agora.getTime() + 2 * 60 * 60 * 1000);
    const ha24h = new Date(agora.getTime() - 24 * 60 * 60 * 1000);

    let criadas = 0;

    async function enviarWhats(userId: string, mensagem: string) {
      if (!ZAPI_INSTANCE_ID || !ZAPI_INSTANCE_TOKEN || !ZAPI_CLIENT_TOKEN) return;
      const { data: prof } = await admin.from("profiles").select("telefone").eq("user_id", userId).maybeSingle();
      const phone = String(prof?.telefone ?? "").replace(/\D/g, "");
      if (!phone) return;
      try {
        await fetch(`https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_INSTANCE_TOKEN}/send-text`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Client-Token": ZAPI_CLIENT_TOKEN },
          body: JSON.stringify({ phone, message: mensagem }),
        });
      } catch (_e) { /* ignore */ }
    }

    async function dedupNotif(userId: string, key: string): Promise<boolean> {
      // dedupe por metadata->key nas últimas 24h
      const { data: existe } = await admin.from("notifications").select("id")
        .eq("user_id", userId).gte("created_at", ha24h.toISOString())
        .filter("metadata->>key", "eq", key).limit(1).maybeSingle();
      return !!existe;
    }

    // Tarefas vencendo
    if (notificarTarefa) {
      const { data: tarefas } = await admin.from("crm_tarefas")
        .select("id, titulo, vencimento, responsavel_id")
        .eq("concluida", false)
        .not("responsavel_id", "is", null)
        .gte("vencimento", agora.toISOString())
        .lte("vencimento", em2h.toISOString());

      for (const t of tarefas ?? []) {
        const key = `tarefa:${t.id}`;
        if (await dedupNotif(t.responsavel_id, key)) continue;
        const venc = new Date(t.vencimento).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        await admin.from("notifications").insert({
          user_id: t.responsavel_id,
          titulo: "Tarefa vencendo em breve",
          mensagem: `${t.titulo} — vence às ${venc}`,
          tipo: "warning", link: "/app/crm",
          metadata: { key, tarefa_id: t.id },
        });
        await enviarWhats(t.responsavel_id, `🔔 Tarefa vencendo às ${venc}: ${t.titulo}`);
        criadas++;
      }
    }

    // Eventos próximos
    if (notificarEvento) {
      const { data: eventos } = await admin.from("eventos")
        .select("id, nome, local, data_hora, responsavel_id, status")
        .eq("status", "Planejado")
        .not("responsavel_id", "is", null)
        .gte("data_hora", agora.toISOString())
        .lte("data_hora", em2h.toISOString());

      for (const e of eventos ?? []) {
        const key = `evento:${e.id}`;
        if (await dedupNotif(e.responsavel_id, key)) continue;
        const hora = new Date(e.data_hora).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        await admin.from("notifications").insert({
          user_id: e.responsavel_id,
          titulo: "Evento começa em breve",
          mensagem: `${e.nome} — ${hora} em ${e.local ?? "—"}`,
          tipo: "info", link: "/app/eventos",
          metadata: { key, evento_id: e.id },
        });
        await enviarWhats(e.responsavel_id, `📅 Lembrete: ${e.nome} às ${hora} (${e.local ?? "local a definir"})`);
        criadas++;
      }
    }

    // Aprovações pendentes há +24h → notifica admins (1x/dia)
    const { data: aprovs } = await admin.from("aprovacoes")
      .select("id, titulo, created_at")
      .eq("status", "Pendente")
      .lte("created_at", ha24h.toISOString());

    if ((aprovs ?? []).length > 0) {
      const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
      for (const a of aprovs ?? []) {
        for (const adm of admins ?? []) {
          const key = `aprov:${a.id}:${new Date().toISOString().slice(0, 10)}`;
          if (await dedupNotif(adm.user_id, key)) continue;
          await admin.from("notifications").insert({
            user_id: adm.user_id,
            titulo: "Aprovação pendente há +24h",
            mensagem: a.titulo, tipo: "warning", link: "/app/aprovacoes",
            metadata: { key, aprovacao_id: a.id },
          });
          criadas++;
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, criadas }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notificacoes-disparo:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});