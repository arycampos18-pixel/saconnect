import { supabase } from "@/integrations/supabase/client";

export type EleitorContexto = {
  eleitor: {
    id: string;
    nome: string;
    telefone: string;
    email: string | null;
    cpf: string | null;
    data_nascimento: string | null;
    bairro: string | null;
    cidade: string | null;
    uf: string | null;
    observacoes: string | null;
    consentimento_lgpd: boolean;
    created_at: string;
  } | null;
  tags: string[];
  oportunidades: Array<{ id: string; titulo: string; etapa_nome: string | null; created_at: string }>;
  interacoesCrm: Array<{ id: string; tipo: string; descricao: string | null; data_interacao: string }>;
  eventosInscritos: Array<{ id: string; nome: string; data_hora: string; presente: boolean }>;
  conversasAnteriores: Array<{ id: string; status: string; ultima_mensagem: string | null; ultima_mensagem_em: string | null }>;
};

export const eleitorContextoService = {
  /** Busca contexto completo do eleitor a partir do telefone (digits) ou eleitor_id. */
  async buscar(opts: { eleitorId?: string | null; telefoneDigits?: string | null; conversaIdAtual?: string | null }): Promise<EleitorContexto> {
    let eleitorId = opts.eleitorId ?? null;

    if (!eleitorId && opts.telefoneDigits && opts.telefoneDigits.length >= 10) {
      const { data: e } = await supabase
        .from("eleitores")
        .select("id")
        .or(`telefone.ilike.%${opts.telefoneDigits.slice(-11)}%`)
        .limit(1)
        .maybeSingle();
      eleitorId = e?.id ?? null;
    }

    if (!eleitorId) {
      return { eleitor: null, tags: [], oportunidades: [], interacoesCrm: [], eventosInscritos: [], conversasAnteriores: [] };
    }

    const [eleitorRes, tagsRes, oportRes, interRes, eventosRes, convRes] = await Promise.all([
      supabase.from("eleitores").select("id,nome,telefone,email,cpf,data_nascimento,bairro,cidade,uf,observacoes,consentimento_lgpd,created_at").eq("id", eleitorId).maybeSingle(),
      supabase.from("eleitor_tags").select("tag_id, tags:tags(nome)").eq("eleitor_id", eleitorId),
      supabase.from("crm_oportunidades")
        .select("id,titulo,created_at,etapa:crm_etapas(nome)")
        .eq("eleitor_id", eleitorId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase.from("crm_interacoes")
        .select("id,tipo,descricao,data_interacao")
        .eq("eleitor_id", eleitorId)
        .order("data_interacao", { ascending: false })
        .limit(10),
      supabase.from("evento_inscricoes")
        .select("id,presente,evento:eventos(id,nome,data_hora)")
        .eq("eleitor_id", eleitorId)
        .order("created_at", { ascending: false })
        .limit(10),
      (supabase as any).from("whatsapp_conversas")
        .select("id,status,ultima_mensagem,ultima_mensagem_em")
        .eq("eleitor_id", eleitorId)
        .order("ultima_mensagem_em", { ascending: false })
        .limit(20),
    ]);

    const tags: string[] = (tagsRes.data ?? [])
      .map((r: any) => r.tags?.nome).filter(Boolean);

    const oportunidades = (oportRes.data ?? []).map((o: any) => ({
      id: o.id, titulo: o.titulo,
      etapa_nome: o.etapa?.nome ?? null,
      created_at: o.created_at,
    }));

    const eventosInscritos = (eventosRes.data ?? [])
      .filter((r: any) => r.evento)
      .map((r: any) => ({
        id: r.evento.id, nome: r.evento.nome, data_hora: r.evento.data_hora, presente: !!r.presente,
      }));

    const conversasAnteriores = ((convRes.data ?? []) as any[])
      .filter((c) => c.id !== opts.conversaIdAtual);

    return {
      eleitor: (eleitorRes.data as any) ?? null,
      tags,
      oportunidades,
      interacoesCrm: (interRes.data ?? []) as any,
      eventosInscritos,
      conversasAnteriores,
    };
  },
};
