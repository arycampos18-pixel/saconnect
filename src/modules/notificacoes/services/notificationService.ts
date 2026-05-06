import { supabase } from "@/integrations/supabase/client";

export interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string | null;
  tipo: string;
  link: string | null;
  lida: boolean;
  created_at: string;
}

export const notificationService = {
  async listar(limite = 50): Promise<Notificacao[]> {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limite);
    if (error) throw error;
    return (data ?? []) as Notificacao[];
  },

  async naoLidas(): Promise<number> {
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("lida", false);
    return count ?? 0;
  },

  async marcarLida(id: string) {
    await supabase.from("notifications").update({ lida: true }).eq("id", id);
  },

  async marcarTodasLidas() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("notifications").update({ lida: true }).eq("user_id", u.user.id).eq("lida", false);
  },

  async criarPara(userId: string, titulo: string, mensagem?: string, link?: string, tipo: string = "info") {
    await supabase.from("notifications").insert({ user_id: userId, titulo, mensagem, link, tipo });
  },

  async registrarPush(sub: PushSubscription) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const json = sub.toJSON();
    await supabase.from("push_subscriptions").upsert({
      user_id: u.user.id,
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
      user_agent: navigator.userAgent,
    }, { onConflict: "endpoint" });
  },

  async desregistrarPush(endpoint: string) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  },
};