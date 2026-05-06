import { supabase } from "@/integrations/supabase/client";

export type CanalExterno = "WhatsApp" | "SMS" | "Telegram" | "Email";
export type MensagemStatus = "Pendente" | "Enviado" | "Entregue" | "Falhou" | "Simulado";
export type RedeSocial = "Instagram" | "Facebook" | "X" | "LinkedIn" | "TikTok" | "YouTube" | "Outro";
export type PostStatus = "Rascunho" | "Agendado" | "Publicado" | "Cancelado";

export interface MensagemExterna {
  id: string;
  user_id: string;
  canal: CanalExterno;
  destinatario: string;
  destinatario_nome: string | null;
  conteudo: string;
  status: MensagemStatus;
  provedor: string | null;
  provedor_message_id: string | null;
  erro: string | null;
  enviado_em: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface PostSocial {
  id: string;
  user_id: string;
  rede: RedeSocial;
  titulo: string;
  conteudo: string | null;
  link: string | null;
  imagem_url: string | null;
  status: PostStatus;
  agendado_para: string | null;
  publicado_em: string | null;
  created_at: string;
  updated_at: string;
}

export const integracoesService = {
  // ===== Mensagens (WhatsApp / SMS) =====
  async listarMensagens(): Promise<MensagemExterna[]> {
    const { data, error } = await supabase
      .from("mensagens_externas")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as MensagemExterna[];
  },

  async enviarWhatsApp(payload: { to: string; message: string; nome?: string; provedor?: "zapi" | "twilio"; from?: string }) {
    const fn = payload.provedor === "twilio" ? "send-whatsapp" : "send-whatsapp-zapi";
    const { data, error } = await supabase.functions.invoke(fn, {
      body: payload,
    });
    if (error) throw error;
    if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
    return data;
  },

  async registrarSMSSimulado(payload: { destinatario: string; nome?: string; conteudo: string }) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Não autenticado");

    const { data, error } = await supabase
      .from("mensagens_externas")
      .insert({
        user_id: userData.user.id,
        canal: "SMS",
        destinatario: payload.destinatario,
        destinatario_nome: payload.nome ?? null,
        conteudo: payload.conteudo,
        status: "Simulado",
        provedor: "Simulação",
        enviado_em: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async excluirMensagem(id: string) {
    const { error } = await supabase.from("mensagens_externas").delete().eq("id", id);
    if (error) throw error;
  },

  // ===== Z-API: status / QR Code =====
  async _zapiCall(action: "status" | "disconnect" | "restart") {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zapi-status?action=${action}`;
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(json?.error || `Falha (${resp.status})`);
    return json;
  },

  async zapiStatus(): Promise<{ connected: boolean; qrImage: string | null; status: unknown }> {
    return this._zapiCall("status");
  },

  async zapiAction(action: "disconnect" | "restart") {
    return this._zapiCall(action);
  },

  // ===== Posts sociais =====
  async listarPosts(): Promise<PostSocial[]> {
    const { data, error } = await supabase
      .from("posts_sociais")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as PostSocial[];
  },

  async criarPost(payload: Omit<PostSocial, "id" | "user_id" | "publicado_em" | "created_at" | "updated_at">) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Não autenticado");
    const { data, error } = await supabase
      .from("posts_sociais")
      .insert({ ...payload, user_id: userData.user.id })
      .select()
      .single();
    if (error) throw error;
    return data as PostSocial;
  },

  async atualizarPost(id: string, patch: Partial<PostSocial>) {
    const { data, error } = await supabase
      .from("posts_sociais")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as PostSocial;
  },

  async marcarPublicado(id: string) {
    return this.atualizarPost(id, { status: "Publicado", publicado_em: new Date().toISOString() });
  },

  async excluirPost(id: string) {
    const { error } = await supabase.from("posts_sociais").delete().eq("id", id);
    if (error) throw error;
  },

  // ===== Métricas =====
  async metricas() {
    const [{ data: msgs }, { data: posts }] = await Promise.all([
      supabase.from("mensagens_externas").select("canal,status"),
      supabase.from("posts_sociais").select("status"),
    ]);
    const totalMsgs = msgs?.length ?? 0;
    const enviadas = msgs?.filter((m) => m.status === "Enviado" || m.status === "Entregue" || m.status === "Simulado").length ?? 0;
    const falhas = msgs?.filter((m) => m.status === "Falhou").length ?? 0;
    const whatsapp = msgs?.filter((m) => m.canal === "WhatsApp").length ?? 0;
    const sms = msgs?.filter((m) => m.canal === "SMS").length ?? 0;
    const totalPosts = posts?.length ?? 0;
    const agendados = posts?.filter((p) => p.status === "Agendado").length ?? 0;
    return { totalMsgs, enviadas, falhas, whatsapp, sms, totalPosts, agendados };
  },
};