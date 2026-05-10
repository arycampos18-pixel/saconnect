import { supabase } from "@/integrations/supabase/client";
import type { CampoCadastro } from "@/shared/hooks/usePermissoes";

/** Mapa categoria customizada → label singular para mensagens. */
const CAT_LABEL: Record<string, string> = {
  cat_evento_status: "status de evento",
  cat_compromisso_categoria: "categoria de compromisso",
  cat_compromisso_prioridade: "prioridade de compromisso",
  cat_compromisso_status: "status de compromisso",
  cat_crm_interacao_tipo: "tipo de interação",
  cat_crm_prioridade: "prioridade",
  cat_pesquisa_tipo: "tipo de pesquisa",
  cat_post_status: "status de post",
};

const TABELA: Partial<Record<CampoCadastro, string>> = {
  liderancas: "liderancas",
  cabos: "cabos_eleitorais",
  departamentos: "departamentos",
  categorias: "ticket_categories",
  tags: "tags",
  tipos_evento: "evento_tipos",
};

const ROTULO_SINGULAR: Partial<Record<CampoCadastro, string>> = {
  liderancas: "liderança",
  cabos: "cabo eleitoral",
  departamentos: "departamento",
  categorias: "categoria",
  tags: "tag",
  tipos_evento: "tipo de evento",
};

function rotulo(campo: CampoCadastro): string {
  return ROTULO_SINGULAR[campo] ?? CAT_LABEL[campo] ?? "item";
}

export class DuplicateItemError extends Error {
  campo: CampoCadastro;
  nomeExistente: string;
  constructor(campo: CampoCadastro, nomeExistente: string) {
    const r = rotulo(campo);
    super(`Já existe um(a) ${r} com o nome "${nomeExistente}".`);
    this.name = "DuplicateItemError";
    this.campo = campo;
    this.nomeExistente = nomeExistente;
  }
}

export interface NovoItemPayload {
  nome: string;
  descricao?: string | null;
  /** Para cabos: id da liderança superior */
  lideranca_id?: string | null;
}

export interface ItemCriado {
  id: string;
  nome: string;
}

export const catalogosCriacaoService = {
  async criar(campo: CampoCadastro, payload: NovoItemPayload): Promise<ItemCriado> {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? null;

    const nome = payload.nome.trim();
    if (nome.length < 2) throw new Error("Nome deve ter ao menos 2 caracteres.");

    // Catálogos genéricos (catalogos_customizados)
    if (campo.startsWith("cat_")) {
      const categoria = campo.substring(4);
      const { data: comp } = await supabase.rpc("current_active_company" as any);

      // Anti-duplicata escopada por categoria + (company_id OR is_system)
      let q = supabase
        .from("catalogos_customizados" as any)
        .select("id, nome")
        .eq("categoria", categoria)
        .ilike("nome", nome);
      const { data: existentes } = await q;
      const dup = (existentes ?? []).find(
        (r: any) => (r.nome as string)?.toLowerCase() === nome.toLowerCase()
      );
      if (dup) throw new DuplicateItemError(campo, (dup as any).nome ?? nome);

      const { data, error } = await (supabase.from("catalogos_customizados" as any) as any)
        .insert({ categoria, nome, company_id: comp ?? null, ativo: true, is_system: false })
        .select("id, nome")
        .single();
      if (error) throw error;
      return { id: (data as any).id, nome: (data as any).nome } as ItemCriado;
    }

    const tabela = TABELA[campo];
    if (!tabela) throw new Error(`Catálogo não suportado: ${campo}`);

    // ticket_categories usa coluna `name` (e exige company_id); demais usam `nome`.
    const colNome = campo === "categorias" ? "name" : "nome";
    const colDescricao = campo === "categorias" ? "description" : "descricao";

    // Anti-duplicata (case-insensitive). Para cabos, escopa pela liderança.
    let q = supabase.from(tabela as any).select(`id, ${colNome}`).ilike(colNome, nome);
    if (campo === "cabos" && payload.lideranca_id) {
      q = (q as any).eq("lideranca_id", payload.lideranca_id);
    }
    const { data: existentes } = await q;
    const dup = (existentes ?? []).find((r: any) => (r[colNome] as string)?.toLowerCase() === nome.toLowerCase());
    if (dup) {
      throw new DuplicateItemError(campo, (dup as any)[colNome] ?? nome);
    }

    const row: any = { [colNome]: nome, created_by: uid };
    if (campo === "cabos") {
      if (!payload.lideranca_id) throw new Error("Selecione a liderança do cabo.");
      row.lideranca_id = payload.lideranca_id;
    }
    if (campo === "departamentos" && payload.descricao) {
      row.descricao = payload.descricao;
    }
    if (campo === "categorias") {
      if (payload.descricao) row[colDescricao] = payload.descricao;
      const { data: comp } = await supabase.rpc("current_active_company" as any);
      if (!comp) throw new Error("Empresa ativa não encontrada.");
      row.company_id = comp;
    }

    const { data, error } = await (supabase.from(tabela as any) as any)
      .insert(row)
      .select(`id, ${colNome}`)
      .single();
    if (error) throw error;
    return { id: (data as any).id, nome: (data as any)[colNome] } as ItemCriado;
  },
};