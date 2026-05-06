import { supabase } from "@/integrations/supabase/client";

export interface WebhookSaida {
  id: string;
  nome: string;
  url: string;
  eventos: string[];
  ativo: boolean;
  secret: string | null;
  total_disparos: number;
  ultimo_disparo_em: string | null;
  created_at: string;
}

export const EVENTOS_DISPONIVEIS = [
  { id: "eleitor.criado", label: "Novo eleitor cadastrado" },
  { id: "evento.criado", label: "Novo evento criado" },
  { id: "evento.inscricao", label: "Nova inscrição em evento" },
  { id: "pesquisa.resposta", label: "Nova resposta de pesquisa" },
  { id: "tarefa.criada", label: "Nova tarefa criada" },
  { id: "aprovacao.solicitada", label: "Aprovação solicitada" },
  { id: "aprovacao.decidida", label: "Aprovação decidida" },
  { id: "mensagem.enviada", label: "Mensagem enviada" },
] as const;

export const webhooksService = {
  async listar(): Promise<WebhookSaida[]> {
    const { data, error } = await supabase.from("webhooks_saida").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as WebhookSaida[];
  },
  async criar(input: Omit<WebhookSaida, "id" | "total_disparos" | "ultimo_disparo_em" | "created_at">) {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("webhooks_saida").insert({ ...input, created_by: u.user?.id ?? null });
    if (error) throw error;
  },
  async atualizar(id: string, input: Partial<WebhookSaida>) {
    const { error } = await supabase.from("webhooks_saida").update(input).eq("id", id);
    if (error) throw error;
  },
  async remover(id: string) {
    const { error } = await supabase.from("webhooks_saida").delete().eq("id", id);
    if (error) throw error;
  },
  async listarEntregas(webhookId: string) {
    const { data, error } = await supabase.from("webhook_entregas").select("*")
      .eq("webhook_id", webhookId).order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return data ?? [];
  },
  async testar(webhookId: string, url: string, evento: string = "teste") {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-dispatcher`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ evento, payload: { teste: true, webhook_id: webhookId, url } }),
    });
    return await r.json();
  },

  /**
   * Dispara um evento para todos os webhooks ativos inscritos.
   * Não bloqueia nem lança erro – falhas são logadas no console e em webhook_entregas.
   */
  async disparar(evento: string, payload: Record<string, any>) {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) return;
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-dispatcher`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ evento, payload }),
      }).catch((e) => console.warn("[webhook] dispatch failed", e));
    } catch (e) {
      console.warn("[webhook] disparar erro", e);
    }
  },
};