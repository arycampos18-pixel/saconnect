import { supabase } from "@/integrations/supabase/client";

export interface SegmentoFiltros {
  bairros?: string[];
  cidades?: string[];
  tags?: string[];
  origens?: string[];
  generos?: string[];
  idadeMin?: number | null;
  idadeMax?: number | null;
  comTelefone?: boolean | null;
  comEmail?: boolean | null;
  consentimentoLgpd?: boolean | null;
  liderancaIds?: string[];
  caboIds?: string[];
}

export interface Segmento {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  icone: string;
  filtros: SegmentoFiltros;
  total_cache: number;
  ultima_atualizacao: string | null;
  created_at: string;
  updated_at: string;
}

function calcularIdade(dataNasc: string | null): number | null {
  if (!dataNasc) return null;
  const hoje = new Date();
  const n = new Date(dataNasc);
  let idade = hoje.getFullYear() - n.getFullYear();
  const m = hoje.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < n.getDate())) idade--;
  return idade;
}

function aplicaFiltros(eleitores: any[], tagsRel: any[], f: SegmentoFiltros): any[] {
  const tagsByEleitor = new Map<string, Set<string>>();
  tagsRel.forEach((t: any) => {
    if (!tagsByEleitor.has(t.eleitor_id)) tagsByEleitor.set(t.eleitor_id, new Set());
    tagsByEleitor.get(t.eleitor_id)!.add(t.tag_id);
  });

  return eleitores.filter((e) => {
    if (f.bairros?.length && !f.bairros.includes(e.bairro || "")) return false;
    if (f.cidades?.length && !f.cidades.includes(e.cidade || "")) return false;
    if (f.origens?.length && !f.origens.includes(e.origem || "")) return false;
    if (f.generos?.length && !f.generos.includes(e.genero || "")) return false;
    if (f.comTelefone === true && !e.telefone) return false;
    if (f.comTelefone === false && e.telefone) return false;
    if (f.comEmail === true && !e.email) return false;
    if (f.comEmail === false && e.email) return false;
    if (f.consentimentoLgpd === true && !e.consentimento_lgpd) return false;
    if (f.consentimentoLgpd === false && e.consentimento_lgpd) return false;
    if (f.liderancaIds?.length && !f.liderancaIds.includes(e.lideranca_id)) return false;
    if (f.caboIds?.length && !f.caboIds.includes(e.cabo_eleitoral_id)) return false;
    if (f.idadeMin != null || f.idadeMax != null) {
      const idade = calcularIdade(e.data_nascimento);
      if (idade == null) return false;
      if (f.idadeMin != null && idade < f.idadeMin) return false;
      if (f.idadeMax != null && idade > f.idadeMax) return false;
    }
    if (f.tags?.length) {
      const set = tagsByEleitor.get(e.id);
      if (!set || !f.tags.some((t) => set.has(t))) return false;
    }
    return true;
  });
}

export const segmentacaoService = {
  async listar(): Promise<Segmento[]> {
    const { data, error } = await supabase
      .from("segmentos")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as any;
  },

  async criar(payload: Partial<Segmento>) {
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("segmentos")
      .insert({ ...payload, created_by: u.user?.id } as any)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async atualizar(id: string, payload: Partial<Segmento>) {
    const { error } = await supabase.from("segmentos").update(payload as any).eq("id", id);
    if (error) throw error;
  },

  async remover(id: string) {
    const { error } = await supabase.from("segmentos").delete().eq("id", id);
    if (error) throw error;
  },

  async preview(filtros: SegmentoFiltros) {
    const [els, rels] = await Promise.all([
      supabase.from("eleitores").select("id, nome, telefone, email, bairro, cidade, genero, origem, data_nascimento, consentimento_lgpd, lideranca_id, cabo_eleitoral_id"),
      supabase.from("eleitor_tags").select("eleitor_id, tag_id"),
    ]);
    if (els.error) throw els.error;
    if (rels.error) throw rels.error;
    return aplicaFiltros((els.data ?? []) as any, (rels.data ?? []) as any, filtros);
  },

  async atualizarTotal(id: string, filtros: SegmentoFiltros) {
    const result = await this.preview(filtros);
    await supabase
      .from("segmentos")
      .update({ total_cache: result.length, ultima_atualizacao: new Date().toISOString() })
      .eq("id", id);
    return result.length;
  },

  async opcoesDisponiveis() {
    const [els, tags, lids, cabos] = await Promise.all([
      supabase.from("eleitores").select("bairro, cidade, origem, genero"),
      supabase.from("tags").select("id, nome, cor"),
      supabase.from("liderancas").select("id, nome"),
      supabase.from("cabos_eleitorais").select("id, nome"),
    ]);
    const uniq = (arr: any[], k: string) =>
      Array.from(new Set(arr.map((x) => x[k]).filter(Boolean))).sort() as string[];
    return {
      bairros: uniq(els.data ?? [], "bairro"),
      cidades: uniq(els.data ?? [], "cidade"),
      origens: uniq(els.data ?? [], "origem"),
      generos: uniq(els.data ?? [], "genero"),
      tags: (tags.data ?? []) as { id: string; nome: string; cor: string }[],
      liderancas: (lids.data ?? []) as { id: string; nome: string }[],
      cabos: (cabos.data ?? []) as { id: string; nome: string }[],
    };
  },
};