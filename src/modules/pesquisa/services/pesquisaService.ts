import { supabase } from "@/integrations/supabase/client";
import { formatPhoneBR, onlyDigits } from "@/shared/utils/phone";
import { generateUUID } from "@/shared/utils/uuid";

export type PesquisaTipo = "Intenção de Voto" | "Satisfação" | "Temas Prioritários";
export type PesquisaStatus = "Rascunho" | "Ativa" | "Finalizada";
export type PerguntaTipo = "multipla" | "multipla_varias" | "sim_nao" | "aberta";

export type Pesquisa = {
  id: string;
  titulo: string;
  tipo: PesquisaTipo;
  status: PesquisaStatus;
  filtro_bairro: string | null;
  filtro_tag_id: string | null;
  slug: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  respostas_count?: number;
  sessoes_count?: number;
};

export type Pergunta = {
  id: string;
  pesquisa_id: string;
  texto: string;
  tipo: PerguntaTipo;
  opcoes: string[] | null;
  ordem: number;
};

export type PerguntaInput = {
  texto: string;
  tipo: PerguntaTipo;
  opcoes: string[] | null;
  ordem: number;
};

export type PesquisaInput = {
  titulo: string;
  tipo: PesquisaTipo;
  status?: PesquisaStatus;
  filtro_bairro?: string | null;
  filtro_tag_id?: string | null;
};

export type Resposta = {
  id: string;
  pesquisa_id: string;
  pergunta_id: string;
  resposta: string;
  sessao_id: string;
  participante_nome: string | null;
  participante_telefone: string | null;
  created_at: string;
};

export const pesquisaService = {
  async list(): Promise<Pesquisa[]> {
    const { data, error } = await supabase
      .from("pesquisas")
      .select("*, pesquisa_respostas(sessao_id)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((p: any) => {
      const sessoes = new Set((p.pesquisa_respostas ?? []).map((r: any) => r.sessao_id));
      return {
        ...p,
        respostas_count: (p.pesquisa_respostas ?? []).length,
        sessoes_count: sessoes.size,
      };
    });
  },

  async getBySlug(slug: string): Promise<{ pesquisa: Pesquisa; perguntas: Pergunta[] } | null> {
    const sb: any = supabase;
    // 1) tenta short_code (coluna nova, pode não existir ainda)
    // 2) slug exato
    // 3) slug LIKE prefix (short_code são os primeiros 7 chars do slug)
    let data: any = null;
    const tries = [
      sb.from("pesquisas").select("*").eq("status", "Ativa").eq("short_code", slug).maybeSingle(),
      sb.from("pesquisas").select("*").eq("status", "Ativa").eq("slug", slug).maybeSingle(),
      sb.from("pesquisas").select("*").eq("status", "Ativa").like("slug", `${slug}%`).maybeSingle(),
    ];
    for (const q of tries) {
      const { data: d } = await q;
      if (d) { data = d; break; }
    }
    if (!data) return null;
    const { data: perguntas, error: pe } = await supabase
      .from("pesquisa_perguntas")
      .select("*")
      .eq("pesquisa_id", data.id)
      .order("ordem");
    if (pe) throw pe;
    return {
      pesquisa: data as Pesquisa,
      perguntas: (perguntas ?? []).map((p: any) => ({ ...p, opcoes: p.opcoes as string[] | null })),
    };
  },

  async get(id: string): Promise<{ pesquisa: Pesquisa; perguntas: Pergunta[] } | null> {
    const { data, error } = await supabase.from("pesquisas").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const { data: perguntas, error: pe } = await supabase
      .from("pesquisa_perguntas").select("*").eq("pesquisa_id", id).order("ordem");
    if (pe) throw pe;
    return {
      pesquisa: data as Pesquisa,
      perguntas: (perguntas ?? []).map((p: any) => ({ ...p, opcoes: p.opcoes as string[] | null })),
    };
  },

  async create(input: PesquisaInput, perguntas: PerguntaInput[]): Promise<string> {
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("pesquisas")
      .insert({ ...input, created_by: u.user?.id })
      .select("id")
      .single();
    if (error) throw error;
    if (perguntas.length > 0) {
      const { error: pe } = await supabase
        .from("pesquisa_perguntas")
        .insert(perguntas.map((p) => ({ ...p, pesquisa_id: data.id, opcoes: p.opcoes as any })));
      if (pe) throw pe;
    }
    return data.id;
  },

  async setStatus(id: string, status: PesquisaStatus): Promise<void> {
    const { error } = await supabase.from("pesquisas").update({ status }).eq("id", id);
    if (error) throw error;
  },

  async update(id: string, input: PesquisaInput, perguntas: PerguntaInput[]): Promise<void> {
    const { error } = await supabase
      .from("pesquisas")
      .update({ titulo: input.titulo, tipo: input.tipo, ...(input.status ? { status: input.status } : {}) })
      .eq("id", id);
    if (error) throw error;
    const { error: de } = await supabase.from("pesquisa_perguntas").delete().eq("pesquisa_id", id);
    if (de) throw de;
    if (perguntas.length > 0) {
      const { error: pe } = await supabase
        .from("pesquisa_perguntas")
        .insert(perguntas.map((p) => ({ ...p, pesquisa_id: id, opcoes: p.opcoes as any })));
      if (pe) throw pe;
    }
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("pesquisas").delete().eq("id", id);
    if (error) throw error;
  },

  async respostas(pesquisaId: string): Promise<Resposta[]> {
    const { data, error } = await supabase
      .from("pesquisa_respostas")
      .select("*")
      .eq("pesquisa_id", pesquisaId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Resposta[];
  },

  async submeterRespostas(
    pesquisaId: string,
    respostas: { pergunta_id: string; resposta: string }[],
    participante: { nome: string; telefone: string }
  ): Promise<void> {
    const telDigits = onlyDigits(participante.telefone);
    if (!participante.nome.trim() || (telDigits.length !== 10 && telDigits.length !== 11)) {
      throw new Error("Informe nome e telefone válidos.");
    }
    const { data: jaVotou, error: ce } = await supabase.rpc("pesquisa_ja_respondeu", {
      _pesquisa_id: pesquisaId,
      _telefone: participante.telefone,
    });
    if (ce) throw ce;
    if (jaVotou) throw new Error("Este telefone já respondeu a esta pesquisa.");
    const sessao_id = generateUUID();
    const payload = respostas.map((r) => ({
      pesquisa_id: pesquisaId,
      pergunta_id: r.pergunta_id,
      resposta: r.resposta,
      sessao_id,
      participante_nome: participante.nome.trim(),
      participante_telefone: formatPhoneBR(participante.telefone),
    }));
    const { error } = await supabase.from("pesquisa_respostas").insert(payload);
    if (error) throw error;
  },
};
