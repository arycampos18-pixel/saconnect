import { supabase } from "@/integrations/supabase/client";

export type WebhookRaw = {
  id: string;
  provedor: string;
  evento: string | null;
  provedor_message_id: string | null;
  payload: any;
  processado: boolean;
  erro: string | null;
  conversa_id: string | null;
  mensagem_id: string | null;
  created_at: string;
  processado_em: string | null;
};

export const webhookRawService = {
  async listar(filtro: "todos" | "erro" | "pendente" = "todos", limit = 100): Promise<WebhookRaw[]> {
    let q = (supabase as any).from("whatsapp_webhook_raw").select("*").order("created_at", { ascending: false }).limit(limit);
    if (filtro === "erro") q = q.not("erro", "is", null);
    if (filtro === "pendente") q = q.eq("processado", false);
    const { data, error } = await q;
    if (error) throw error;
    return (data as WebhookRaw[]) ?? [];
  },

  async contarPendentesEErros(): Promise<{ pendentes: number; erros: number }> {
    const [{ count: pendentes }, { count: erros }] = await Promise.all([
      (supabase as any).from("whatsapp_webhook_raw").select("id", { count: "exact", head: true }).eq("processado", false),
      (supabase as any).from("whatsapp_webhook_raw").select("id", { count: "exact", head: true }).not("erro", "is", null),
    ]);
    return { pendentes: pendentes ?? 0, erros: erros ?? 0 };
  },

  /** Reenvia o payload bruto para o webhook receptivo (idempotente). */
  async reprocessar(raw: WebhookRaw): Promise<{ ok: boolean; message: string }> {
    const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/webhook-zapi-receptivo`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(raw.payload),
    });
    const body = await resp.json().catch(() => ({}));
    return { ok: resp.ok && body?.ok !== false, message: JSON.stringify(body) };
  },

  async remover(id: string): Promise<void> {
    const { error } = await (supabase as any).from("whatsapp_webhook_raw").delete().eq("id", id);
    if (error) throw error;
  },
};
