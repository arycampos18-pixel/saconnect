import { supabase } from "@/integrations/supabase/client";

export type EventoTipo = "Saúde" | "Educação" | "Assistência" | "Jurídico" | "Cursos";
export type EventoStatus = "Planejado" | "Em Andamento" | "Finalizado";

export type Evento = {
  id: string;
  nome: string;
  tipo: EventoTipo;
  data_hora: string;
  local: string;
  descricao: string | null;
  responsavel_id: string | null;
  limite_inscritos: number | null;
  status: EventoStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  responsavel?: { id: string; nome: string } | null;
  inscritos_count?: number;
};

export type EventoInput = {
  nome: string;
  tipo: EventoTipo;
  data_hora: string;
  local: string;
  descricao?: string | null;
  responsavel_id?: string | null;
  limite_inscritos?: number | null;
  status?: EventoStatus;
};

export type Inscricao = {
  id: string;
  evento_id: string;
  eleitor_id: string;
  presente: boolean;
  checkin_em: string | null;
  created_at: string;
  eleitor?: { id: string; nome: string; telefone: string; bairro: string | null } | null;
};

export const eventosService = {
  async list(): Promise<Evento[]> {
    const { data, error } = await supabase
      .from("eventos")
      .select("*, responsavel:liderancas(id, nome), evento_inscricoes(id)")
      .order("data_hora", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      ...r,
      inscritos_count: (r.evento_inscricoes ?? []).length,
    }));
  },

  async get(id: string): Promise<Evento | null> {
    const { data, error } = await supabase
      .from("eventos")
      .select("*, responsavel:liderancas(id, nome)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data as Evento | null;
  },

  async create(input: EventoInput): Promise<string> {
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("eventos")
      .insert({ ...input, created_by: u.user?.id })
      .select("id")
      .single();
    if (error) throw error;
    import("@/modules/webhooks/services/webhooksService").then(({ webhooksService }) =>
      webhooksService.disparar("evento.criado", { id: data.id, ...input })
    );
    return data.id;
  },

  async update(id: string, input: Partial<EventoInput>): Promise<void> {
    const { error } = await supabase.from("eventos").update(input).eq("id", id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("eventos").delete().eq("id", id);
    if (error) throw error;
  },

  async inscricoes(eventoId: string): Promise<Inscricao[]> {
    const { data, error } = await supabase
      .from("evento_inscricoes")
      .select("*, eleitor:eleitores(id, nome, telefone, bairro)")
      .eq("evento_id", eventoId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Inscricao[];
  },

  async inscrever(eventoId: string, eleitorId: string): Promise<void> {
    const { error } = await supabase
      .from("evento_inscricoes")
      .insert({ evento_id: eventoId, eleitor_id: eleitorId });
    if (error && !String(error.message).includes("duplicate")) throw error;
    import("@/modules/webhooks/services/webhooksService").then(({ webhooksService }) =>
      webhooksService.disparar("evento.inscricao", { evento_id: eventoId, eleitor_id: eleitorId })
    );
  },

  async setPresenca(inscricaoId: string, presente: boolean): Promise<void> {
    const { error } = await supabase
      .from("evento_inscricoes")
      .update({ presente, checkin_em: presente ? new Date().toISOString() : null })
      .eq("id", inscricaoId);
    if (error) throw error;
  },

  async removerInscricao(inscricaoId: string): Promise<void> {
    const { error } = await supabase.from("evento_inscricoes").delete().eq("id", inscricaoId);
    if (error) throw error;
  },

  async buscarEleitores(termo: string) {
    const s = termo.replace(/[%_]/g, "").trim();
    if (!s) return [];
    const { data, error } = await supabase
      .from("eleitores")
      .select("id, nome, telefone, bairro")
      .or(`nome.ilike.%${s}%,telefone.ilike.%${s}%`)
      .limit(20);
    if (error) throw error;
    return data ?? [];
  },
};
