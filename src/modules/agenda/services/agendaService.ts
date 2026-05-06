import { supabase } from "@/integrations/supabase/client";

export type CompromissoCategoria = "Reunião" | "Visita" | "Evento" | "Audiência" | "Outro";
export type CompromissoPrioridade = "Baixa" | "Média" | "Alta";
export type CompromissoStatus = "Agendado" | "Concluído" | "Cancelado";

export type Compromisso = {
  id: string;
  titulo: string;
  descricao: string | null;
  local: string | null;
  data_hora: string;
  duracao_min: number;
  categoria: CompromissoCategoria;
  prioridade: CompromissoPrioridade;
  status: CompromissoStatus;
  responsavel_id: string | null;
  lembrete_min: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CompromissoInput = {
  titulo: string;
  descricao?: string | null;
  local?: string | null;
  data_hora: string;
  duracao_min?: number;
  categoria?: CompromissoCategoria;
  prioridade?: CompromissoPrioridade;
  status?: CompromissoStatus;
  lembrete_min?: number;
};

export const agendaService = {
  async list(filtros: { from?: string; to?: string; status?: CompromissoStatus | "todos" } = {}): Promise<Compromisso[]> {
    let q = supabase.from("agenda_compromissos").select("*").order("data_hora", { ascending: true }).limit(500);
    if (filtros.from) q = q.gte("data_hora", filtros.from);
    if (filtros.to) q = q.lte("data_hora", filtros.to);
    if (filtros.status && filtros.status !== "todos") q = q.eq("status", filtros.status);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Compromisso[];
  },

  async hoje(): Promise<Compromisso[]> {
    const ini = new Date(); ini.setHours(0, 0, 0, 0);
    const fim = new Date(); fim.setHours(23, 59, 59, 999);
    return this.list({ from: ini.toISOString(), to: fim.toISOString() });
  },

  async create(input: CompromissoInput): Promise<string> {
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("agenda_compromissos")
      .insert({ ...input, created_by: u.user?.id })
      .select("id").single();
    if (error) throw error;
    return data.id;
  },

  async update(id: string, input: Partial<CompromissoInput>): Promise<void> {
    const { error } = await supabase.from("agenda_compromissos").update(input).eq("id", id);
    if (error) throw error;
  },

  async setStatus(id: string, status: CompromissoStatus): Promise<void> {
    const { error } = await supabase.from("agenda_compromissos").update({ status }).eq("id", id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("agenda_compromissos").delete().eq("id", id);
    if (error) throw error;
  },
};