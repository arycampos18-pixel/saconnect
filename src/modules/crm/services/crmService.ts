import { supabase } from "@/integrations/supabase/client";

export interface Etapa {
  id: string;
  nome: string;
  ordem: number;
  cor: string;
  is_ganho: boolean;
  is_perdido: boolean;
}

export interface Oportunidade {
  id: string;
  titulo: string;
  eleitor_id: string | null;
  etapa_id: string;
  responsavel_id: string | null;
  valor_estimado: number;
  observacoes: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
  eleitor?: { nome: string; telefone: string | null; lideranca_id: string | null; cabo_eleitoral_id: string | null } | null;
}

export interface Tarefa {
  id: string;
  titulo: string;
  descricao: string | null;
  prioridade: "Baixa" | "Média" | "Alta";
  vencimento: string | null;
  concluida: boolean;
  concluida_em: string | null;
  eleitor_id: string | null;
  oportunidade_id: string | null;
  responsavel_id: string | null;
  created_at: string;
  eleitor?: { nome: string } | null;
}

export interface Interacao {
  id: string;
  eleitor_id: string;
  oportunidade_id: string | null;
  tipo: "Ligação" | "WhatsApp" | "Email" | "Visita" | "Reunião" | "Outro";
  descricao: string | null;
  data_interacao: string;
  created_at: string;
}

export const crmService = {
  async listarEtapas(): Promise<Etapa[]> {
    const { data, error } = await supabase
      .from("crm_etapas")
      .select("*")
      .order("ordem", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Etapa[];
  },

  async listarOportunidades(): Promise<Oportunidade[]> {
    const { data, error } = await supabase
      .from("crm_oportunidades")
      .select("*, eleitor:eleitores(nome, telefone, lideranca_id, cabo_eleitoral_id)")
      .order("ordem", { ascending: true });
    if (error) throw error;
    return (data ?? []) as any;
  },

  async criarOportunidade(p: Partial<Oportunidade>) {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("crm_oportunidades")
      .insert({ ...p, created_by: u.user?.id } as any);
    if (error) throw error;
  },

  async moverOportunidade(id: string, etapa_id: string) {
    const { error } = await supabase
      .from("crm_oportunidades")
      .update({ etapa_id })
      .eq("id", id);
    if (error) throw error;
  },

  async removerOportunidade(id: string) {
    const { error } = await supabase.from("crm_oportunidades").delete().eq("id", id);
    if (error) throw error;
  },

  async listarTarefas(): Promise<Tarefa[]> {
    const { data, error } = await supabase
      .from("crm_tarefas")
      .select("*, eleitor:eleitores(nome)")
      .order("vencimento", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data ?? []) as any;
  },

  async criarTarefa(p: Partial<Tarefa>) {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("crm_tarefas")
      .insert({ ...p, created_by: u.user?.id } as any);
    if (error) throw error;
  },

  async toggleTarefa(id: string, concluida: boolean) {
    const { error } = await supabase
      .from("crm_tarefas")
      .update({ concluida, concluida_em: concluida ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) throw error;
  },

  async removerTarefa(id: string) {
    const { error } = await supabase.from("crm_tarefas").delete().eq("id", id);
    if (error) throw error;
  },

  async listarInteracoes(eleitorId?: string): Promise<Interacao[]> {
    let q = supabase
      .from("crm_interacoes")
      .select("*")
      .order("data_interacao", { ascending: false })
      .limit(100);
    if (eleitorId) q = q.eq("eleitor_id", eleitorId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Interacao[];
  },

  async criarInteracao(p: Partial<Interacao>) {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("crm_interacoes")
      .insert({ ...p, created_by: u.user?.id } as any);
    if (error) throw error;
  },
};