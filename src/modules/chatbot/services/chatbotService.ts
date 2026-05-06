import { supabase } from "@/integrations/supabase/client";

export type FluxoNoTipo = "mensagem" | "menu" | "coleta" | "encaminhar" | "encerrar";

export type OpcaoMenu = {
  tecla: string;
  label: string;
  proximo_no_id?: string | null;
  departamento_id?: string | null;
};

export type ChatbotFluxo = {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  is_padrao: boolean;
  no_inicial_id: string | null;
  mensagem_invalida: string;
  mensagem_timeout: string;
  timeout_minutos: number;
  created_at: string;
  updated_at: string;
};

export type ChatbotNo = {
  id: string;
  fluxo_id: string;
  nome: string;
  tipo: FluxoNoTipo;
  mensagem: string | null;
  opcoes: OpcaoMenu[];
  variavel: string | null;
  departamento_id: string | null;
  proximo_no_id: string | null;
  ordem: number;
};

const F = "chatbot_fluxos" as any;
const N = "chatbot_nos" as any;
const S = "chatbot_sessoes" as any;

export const chatbotService = {
  // ================ Fluxos ================
  async listarFluxos(): Promise<ChatbotFluxo[]> {
    const { data, error } = await (supabase as any).from(F).select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as ChatbotFluxo[];
  },
  async obterFluxo(id: string): Promise<ChatbotFluxo> {
    const { data, error } = await (supabase as any).from(F).select("*").eq("id", id).single();
    if (error) throw error;
    return data as ChatbotFluxo;
  },
  async criarFluxo(payload: Partial<ChatbotFluxo>): Promise<ChatbotFluxo> {
    const { data, error } = await (supabase as any).from(F).insert(payload).select("*").single();
    if (error) throw error;
    return data as ChatbotFluxo;
  },
  async atualizarFluxo(id: string, patch: Partial<ChatbotFluxo>): Promise<void> {
    const { error } = await (supabase as any).from(F).update(patch).eq("id", id);
    if (error) throw error;
  },
  async removerFluxo(id: string): Promise<void> {
    const { error } = await (supabase as any).from(F).delete().eq("id", id);
    if (error) throw error;
  },

  // ================ Nós ================
  async listarNos(fluxoId: string): Promise<ChatbotNo[]> {
    const { data, error } = await (supabase as any).from(N).select("*").eq("fluxo_id", fluxoId).order("ordem");
    if (error) throw error;
    return (data ?? []) as ChatbotNo[];
  },
  async criarNo(payload: Partial<ChatbotNo>): Promise<ChatbotNo> {
    const { data, error } = await (supabase as any).from(N).insert(payload).select("*").single();
    if (error) throw error;
    return data as ChatbotNo;
  },
  async atualizarNo(id: string, patch: Partial<ChatbotNo>): Promise<void> {
    const { error } = await (supabase as any).from(N).update(patch).eq("id", id);
    if (error) throw error;
  },
  async removerNo(id: string): Promise<void> {
    const { error } = await (supabase as any).from(N).delete().eq("id", id);
    if (error) throw error;
  },

  // ================ Sessões ================
  async listarSessoes(): Promise<any[]> {
    const { data, error } = await (supabase as any).from(S).select("*").order("ultima_interacao", { ascending: false }).limit(200);
    if (error) throw error;
    return data ?? [];
  },
  async finalizarSessao(id: string): Promise<void> {
    const { error } = await (supabase as any).from(S).update({
      status: "finalizado", finalizado_em: new Date().toISOString(),
    }).eq("id", id);
    if (error) throw error;
  },
};