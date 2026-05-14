import { supabase } from "@/integrations/supabase/client";
import { normalizarTelefoneDigitsBR, telefoneE164Br } from "@/lib/telefoneBrasil";

export type ConversaStatus = "Pendente" | "Em atendimento" | "Atendido";
export type MensagemDirecao = "entrada" | "saida";
export type MensagemTipo =
  | "texto" | "imagem" | "audio" | "video" | "documento" | "localizacao" | "contato" | "outro";

export interface Conversa {
  id: string;
  telefone: string;
  telefone_digits: string;
  contato_nome: string | null;
  eleitor_id: string | null;
  atendente_id: string | null;
  departamento_id: string | null;
  status: ConversaStatus;
  ultima_mensagem: string | null;
  ultima_mensagem_em: string | null;
  ultima_direcao: MensagemDirecao | null;
  nao_lidas: number;
  instancia: string | null;
  observacoes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Mensagem {
  id: string;
  conversa_id: string;
  direcao: MensagemDirecao;
  tipo: MensagemTipo;
  conteudo: string | null;
  midia_url: string | null;
  midia_mime: string | null;
  status: string;
  enviado_por: string | null;
  enviado_em: string | null;
  created_at: string;
}

export interface Departamento {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  icone: string;
  ativo: boolean;
}

export interface ConversaNota {
  id: string;
  conversa_id: string;
  autor_id: string | null;
  conteudo: string;
  created_at: string;
  updated_at: string;
}

export const TAGS_SUGERIDAS = [
  "Saúde", "Educação", "Cesta básica", "Habitação", "Emprego",
  "Segurança", "Infraestrutura", "Social", "Jurídico", "Outros",
];

export const atendimentoService = {
  async _callZapi(action: string, payload: any = {}) {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zapi-instance`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ action, payload }),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(json?.error || `Falha Z-API (${resp.status})`);
    return json.data;
  },

  async listarConversas(filtros?: {
    status?: ConversaStatus;
    departamentoId?: string | null;
    atendenteId?: string | null;
    apenasMinhas?: boolean;
  }) {
    let q = supabase
      .from("whatsapp_conversas")
      .select("*")
      .order("ultima_mensagem_em", { ascending: false, nullsFirst: false })
      .limit(200);
    if (filtros?.status) q = q.eq("status", filtros.status);
    if (filtros?.departamentoId) q = q.eq("departamento_id", filtros.departamentoId);
    if (filtros?.atendenteId) q = q.eq("atendente_id", filtros.atendenteId);
    if (filtros?.apenasMinhas) {
      const { data: u } = await supabase.auth.getUser();
      if (u.user?.id) q = q.eq("atendente_id", u.user.id);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as Conversa[];
  },

  async getConversa(id: string) {
    const { data, error } = await supabase
      .from("whatsapp_conversas").select("*").eq("id", id).single();
    if (error) throw error;
    return data as unknown as Conversa;
  },

  async listarMensagens(conversaId: string) {
    const { data, error } = await supabase
      .from("whatsapp_mensagens")
      .select("*")
      .eq("conversa_id", conversaId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw error;
    return (data ?? []) as unknown as Mensagem[];
  },

  async marcarLidas(conversaId: string) {
    const { data: conv } = await supabase
      .from("whatsapp_conversas").select("telefone").eq("id", conversaId).single();
    
    if (conv?.telefone) {
      try { await this._callZapi("read-chat", { phone: conv.telefone }); } catch (e) { console.warn("Erro Z-API read-chat:", e); }
    }

    await supabase
      .from("whatsapp_conversas")
      .update({ nao_lidas: 0 })
      .eq("id", conversaId);
  },

  async assumir(conversaId: string) {
    const { data: u } = await supabase.auth.getUser();
    const userId = u.user?.id;
    if (!userId) throw new Error("Não autenticado");
    const { error } = await supabase
      .from("whatsapp_conversas")
      .update({
        atendente_id: userId,
        status: "Em atendimento",
        assumida_em: new Date().toISOString(),
      })
      .eq("id", conversaId);
    if (error) throw error;
  },

  async finalizar(conversaId: string) {
    const { data: conv } = await supabase
      .from("whatsapp_conversas").select("telefone").eq("id", conversaId).single();
    
    if (conv?.telefone) {
      try { await this._callZapi("archive-chat", { phone: conv.telefone, value: true }); } catch (e) { console.warn("Erro Z-API archive-chat:", e); }
    }

    const { error } = await supabase
      .from("whatsapp_conversas")
      .update({
        status: "Atendido",
        finalizada_em: new Date().toISOString(),
      })
      .eq("id", conversaId);
    if (error) throw error;
  },

  async reabrir(conversaId: string) {
    const { data: conv } = await supabase
      .from("whatsapp_conversas").select("telefone").eq("id", conversaId).single();
    
    if (conv?.telefone) {
      try { await this._callZapi("archive-chat", { phone: conv.telefone, value: false }); } catch (e) { console.warn("Erro Z-API unarchive-chat:", e); }
    }

    const { error } = await supabase
      .from("whatsapp_conversas")
      .update({ status: "Em atendimento", finalizada_em: null })
      .eq("id", conversaId);
    if (error) throw error;
  },

  async transferirAtendente(conversaId: string, userId: string) {
    const { error } = await supabase
      .from("whatsapp_conversas")
      .update({ atendente_id: userId, status: "Em atendimento" })
      .eq("id", conversaId);
    if (error) throw error;
  },

  async transferirDepartamento(conversaId: string, departamentoId: string) {
    const { error } = await supabase
      .from("whatsapp_conversas")
      .update({
        departamento_id: departamentoId,
        atendente_id: null,
        status: "Pendente",
      })
      .eq("id", conversaId);
    if (error) throw error;
  },

  async iniciarConversaManual(input: { telefone: string; nome?: string | null; eleitorId?: string | null }) {
    const telefone_digits = normalizarTelefoneDigitsBR(input.telefone || "");
    if (telefone_digits.length < 12) {
      throw new Error("Telefone inválido. Informe DDD + número (Brasil).");
    }
    const telefone = telefoneE164Br(telefone_digits);

    const { data: existente } = await supabase
      .from("whatsapp_conversas")
      .select("id")
      .eq("telefone_digits", telefone_digits)
      .maybeSingle();
    if (existente?.id) return existente.id as string;

    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("whatsapp_conversas")
      .insert({
        telefone,
        telefone_digits,
        contato_nome: input.nome ?? null,
        eleitor_id: input.eleitorId ?? null,
        atendente_id: u.user?.id ?? null,
        status: "Em atendimento",
        assumida_em: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  },

  async listarDepartamentos() {
    const { data, error } = await supabase
      .from("departamentos").select("*").eq("ativo", true).order("nome");
    if (error) throw error;
    return (data ?? []) as unknown as Departamento[];
  },

  async listarAtendentes() {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, nome, email")
      .order("nome");
    if (error) throw error;
    return data ?? [];
  },

  async atualizarTags(conversaId: string, tags: string[]) {
    const { error } = await supabase
      .from("whatsapp_conversas")
      .update({ tags })
      .eq("id", conversaId);
    if (error) throw error;
  },

  async listarNotas(conversaId: string) {
    const { data, error } = await supabase
      .from("whatsapp_conversa_notas")
      .select("*")
      .eq("conversa_id", conversaId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as ConversaNota[];
  },

  async criarNota(conversaId: string, conteudo: string) {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("whatsapp_conversa_notas").insert({
      conversa_id: conversaId,
      autor_id: u.user?.id ?? null,
      conteudo,
    });
    if (error) throw error;
  },

  async removerNota(notaId: string) {
    const { error } = await supabase
      .from("whatsapp_conversa_notas")
      .delete()
      .eq("id", notaId);
    if (error) throw error;
  },

  async enviarMensagem(conversaId: string, telefone: string, texto: string, contatoNome: string | null) {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp-zapi`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ to: telefone, message: texto, nome: contatoNome }),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(json?.error || `Falha (${resp.status})`);

    const { data: u } = await supabase.auth.getUser();
    await supabase.from("whatsapp_mensagens").insert({
      conversa_id: conversaId,
      direcao: "saida",
      tipo: "texto",
      conteudo: texto,
      status: "Enviado",
      enviado_por: u.user?.id ?? null,
      enviado_em: new Date().toISOString(),
      provedor_message_id: json?.messageId ?? null,
      metadata: { provider: "Z-API" },
    });

    if (u.user?.id) {
      await supabase
        .from("whatsapp_conversas")
        .update({ atendente_id: u.user.id, status: "Em atendimento" })
        .eq("id", conversaId)
        .is("atendente_id", null);
    }

    return json;
  },

  // Chamadas
  async realizarChamada(phone: string) {
    return this._callZapi("send-call", { phone });
  },
  async getCallToken() {
    return this._callZapi("get-call-token");
  },
  async getSipInfo() {
    return this._callZapi("get-sip-info");
  },

  // Status (Stories)
  async enviarStatusTexto(text: string, backgroundColor?: string) {
    return this._callZapi("send-text-status", { text, backgroundColor });
  },
  async enviarStatusImagem(image: string, caption?: string) {
    return this._callZapi("send-image-status", { image, caption });
  },
  async enviarStatusVideo(video: string, caption?: string) {
    return this._callZapi("send-video-status", { video, caption });
  },
  async responderStatusTexto(payload: { phone: string; messageId: string; text: string }) {
    return this._callZapi("reply-status-text", payload);
  },
  async responderStatusGif(payload: { phone: string; messageId: string; gif: string; caption?: string }) {
    return this._callZapi("reply-status-gif", payload);
  },
  async responderStatusSticker(payload: { phone: string; messageId: string; sticker: string }) {
    return this._callZapi("reply-status-sticker", payload);
  },

  // Chats Z-API
  async getChats(params?: { page?: number; pageSize?: number }) {
    return this._callZapi("get-chats", params ?? {});
  },
  async getChatMetadata(phone: string) {
    return this._callZapi("get-metadata-chat", { phone });
  },
  async limparChat(phone: string) {
    return this._callZapi("clear-chat", { phone });
  },
  async enviarExpiracaoChat(phone: string, value: 0 | 86400 | 604800 | 7776000) {
    // 0 = off, 86400 = 24h, 604800 = 7 dias, 7776000 = 90 dias
    return this._callZapi("send-chat-expiration", { phone, value });
  },

  // Fila
  async getQueue() {
    return this._callZapi("get-queue");
  },
  async limparFila() {
    return this._callZapi("delete-queue");
  },
};
