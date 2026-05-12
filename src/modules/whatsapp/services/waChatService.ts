import { supabase } from "@/integrations/supabase/client";

export interface WAConversa {
  id: string;
  telefone: string;
  telefone_digits: string;
  // aliases usados no template legado
  wa_nome: string;   // = contato_nome
  wa_numero: string; // = telefone
  status: string;
  ultima_mensagem: string | null;
  ultima_interacao: string; // = ultima_mensagem_em ?? created_at
  nao_lidas: number;
  eleitor_id: string | null;
  eleitor?: {
    nome: string;
    bairro: string;
    score_fidelidade: number;
  };
}

export interface WAMensagem {
  id: string;
  conversa_id: string;
  conteudo: string; // corpo no template legado
  tipo: string;
  direcao: "entrada" | "saida";
  status: string;
  created_at: string;
  enviado_por: string | null;
}

function toConversa(row: any): WAConversa {
  return {
    id: row.id,
    telefone: row.telefone ?? "",
    telefone_digits: row.telefone_digits ?? "",
    wa_nome: row.contato_nome ?? row.telefone ?? "",
    wa_numero: row.telefone ?? "",
    status: row.status ?? "Pendente",
    ultima_mensagem: row.ultima_mensagem ?? null,
    ultima_interacao: row.ultima_mensagem_em ?? row.created_at ?? new Date().toISOString(),
    nao_lidas: row.nao_lidas ?? 0,
    eleitor_id: row.eleitor_id ?? null,
    eleitor: row.eleitor ?? undefined,
  };
}

function toMensagem(row: any): WAMensagem {
  return {
    id: row.id,
    conversa_id: row.conversa_id,
    conteudo: row.conteudo ?? "",
    tipo: row.tipo ?? "texto",
    direcao: row.direcao === "saida" ? "saida" : "entrada",
    status: row.status ?? "",
    created_at: row.created_at ?? row.enviado_em ?? new Date().toISOString(),
    enviado_por: row.enviado_por ?? null,
  };
}

export const waChatService = {
  async listarConversas(filtros: { status?: string } = {}): Promise<WAConversa[]> {
    let q = supabase
      .from("whatsapp_conversas")
      .select("*, eleitor:eleitores(nome, bairro, score_fidelidade)")
      .order("ultima_mensagem_em", { ascending: false, nullsFirst: false })
      .limit(200);

    if (filtros.status) q = q.eq("status", filtros.status);

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(toConversa);
  },

  async buscarMensagens(conversaId: string): Promise<WAMensagem[]> {
    const { data, error } = await supabase
      .from("whatsapp_mensagens")
      .select("*")
      .eq("conversa_id", conversaId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw error;
    return (data ?? []).map(toMensagem);
  },

  async enviarMensagem(
    conversaId: string,
    telefone: string,
    texto: string,
  ): Promise<WAMensagem> {
    // Envia via Z-API
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp-zapi`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ to: telefone, message: texto }),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(json?.error || `Falha ao enviar (${resp.status})`);

    // Persiste na tabela correta
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("whatsapp_mensagens")
      .insert({
        conversa_id: conversaId,
        direcao: "saida",
        tipo: "texto",
        conteudo: texto,
        status: "Enviado",
        enviado_por: u.user?.id ?? null,
        enviado_em: new Date().toISOString(),
        provedor_message_id: json?.messageId ?? null,
        metadata: { provider: "Z-API" },
      })
      .select()
      .single();
    if (error) throw error;
    return toMensagem(data);
  },
};
