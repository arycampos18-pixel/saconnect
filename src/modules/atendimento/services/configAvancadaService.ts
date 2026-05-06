import { supabase } from "@/integrations/supabase/client";

export type SLA = {
  id: string;
  nome: string;
  departamento_id: string | null;
  tempo_resposta_min: number;
  tempo_resolucao_horas: number;
  prioridade: "Baixa" | "Média" | "Alta" | "Crítica";
  ativo: boolean;
};

export type TagWA = {
  id: string;
  nome: string;
  cor: string;
  descricao: string | null;
  departamento_id: string | null;
  ativo: boolean;
};

export type NotaInterna = {
  id: string;
  tipo: "Padrão" | "Alerta" | "Importante" | "Seguimento";
  titulo: string;
  descricao: string | null;
  visibilidade: "Todos" | "Apenas Meu Departamento" | "Apenas Eu";
  departamento_id: string | null;
  ativo: boolean;
};

export type Horario = {
  id: string;
  dia_semana: number;
  hora_inicio: string | null;
  hora_fim: string | null;
  aberto: boolean;
};

export type Feriado = {
  id: string;
  data: string;
  nome: string;
  tipo: "Feriado Nacional" | "Feriado Estadual" | "Feriado Municipal" | "Ponto Facultativo";
  mensagem: string | null;
  ativo: boolean;
};

const sb = supabase as any;

const crud = <T extends { id: string }>(table: string, orderBy = "created_at", asc = false) => ({
  async list(): Promise<T[]> {
    const { data, error } = await sb.from(table).select("*").order(orderBy, { ascending: asc });
    if (error) throw error;
    return (data ?? []) as T[];
  },
  async create(patch: Partial<T>): Promise<void> {
    const { error } = await sb.from(table).insert(patch);
    if (error) throw error;
  },
  async update(id: string, patch: Partial<T>): Promise<void> {
    const { error } = await sb.from(table).update(patch).eq("id", id);
    if (error) throw error;
  },
  async remove(id: string): Promise<void> {
    const { error } = await sb.from(table).delete().eq("id", id);
    if (error) throw error;
  },
});

export const slaService = crud<SLA>("whatsapp_slas");
export const tagService = crud<TagWA>("whatsapp_tags");
export const notaService = crud<NotaInterna>("whatsapp_notas_internas");
export const feriadoService = crud<Feriado>("whatsapp_feriados", "data", true);

export const horarioService = {
  async list(): Promise<Horario[]> {
    const { data, error } = await sb.from("whatsapp_horarios").select("*").order("dia_semana");
    if (error) throw error;
    return (data ?? []) as Horario[];
  },
  async update(id: string, patch: Partial<Horario>): Promise<void> {
    const { error } = await sb.from("whatsapp_horarios").update(patch).eq("id", id);
    if (error) throw error;
  },
};