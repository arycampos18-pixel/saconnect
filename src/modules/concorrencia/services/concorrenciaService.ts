import { supabase } from "@/integrations/supabase/client";

export type AtividadeTipo = "Evento" | "Post" | "Campanha" | "Menção" | "Outro";
export type Sentimento = "Positivo" | "Neutro" | "Negativo";

export type Concorrente = {
  id: string;
  nome: string;
  partido: string | null;
  regiao: string | null;
  foto_url: string | null;
  seguidores: number;
  engajamento_pct: number;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
};

export type Atividade = {
  id: string;
  concorrente_id: string;
  tipo: AtividadeTipo;
  titulo: string;
  descricao: string | null;
  data_atividade: string;
  bairro: string | null;
  link: string | null;
  sentimento: Sentimento | null;
  created_at: string;
};

export type AnaliseConcorrencia = {
  concorrentes: Concorrente[];
  atividades: Atividade[];
  sentimento: { positivo: number; neutro: number; negativo: number; total: number };
  palavras: { palavra: string; total: number }[];
  insights: string[];
  periodoDias: number;
  geradoEm: string;
};

export const concorrenciaService = {
  async listarConcorrentes(): Promise<Concorrente[]> {
    const { data, error } = await supabase
      .from("concorrentes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Concorrente[];
  },

  async criarConcorrente(input: Partial<Concorrente>): Promise<Concorrente> {
    const user = (await supabase.auth.getUser()).data.user;
    const { data, error } = await supabase
      .from("concorrentes")
      .insert({
        nome: input.nome ?? "",
        partido: input.partido ?? null,
        regiao: input.regiao ?? null,
        seguidores: input.seguidores ?? 0,
        engajamento_pct: input.engajamento_pct ?? 0,
        observacoes: input.observacoes ?? null,
        created_by: user?.id ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as Concorrente;
  },

  async removerConcorrente(id: string): Promise<void> {
    const { error } = await supabase.from("concorrentes").delete().eq("id", id);
    if (error) throw error;
  },

  async criarAtividade(input: Partial<Atividade>): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from("concorrente_atividades").insert({
      concorrente_id: input.concorrente_id!,
      tipo: (input.tipo ?? "Outro") as AtividadeTipo,
      titulo: input.titulo ?? "",
      descricao: input.descricao ?? null,
      data_atividade: input.data_atividade ?? new Date().toISOString(),
      bairro: input.bairro ?? null,
      link: input.link ?? null,
      sentimento: input.sentimento ?? null,
      created_by: user?.id ?? null,
    });
    if (error) throw error;
  },

  async carregarAnalise(dias = 30): Promise<AnaliseConcorrencia> {
    const { data, error } = await supabase.functions.invoke("analise-concorrencia", {
      body: { dias },
    });
    if (error) throw error;
    return data as AnaliseConcorrencia;
  },
};