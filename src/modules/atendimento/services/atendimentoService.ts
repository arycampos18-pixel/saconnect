import { supabase } from "@/integrations/supabase/client";

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
    const digits = (input.telefone || "").replace(/\D/g, "");
    if (digits.length < 10) throw new Error("Telefone inválido. Informe DDD + número.");
    const telefone = digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
    const telefone_digits = digits.startsWith("55") ? digits : `55${digits}`;

    // Já existe?
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
};