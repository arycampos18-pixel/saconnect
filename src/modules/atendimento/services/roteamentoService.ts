import { supabase } from "@/integrations/supabase/client";

export type RegraRoteamento = {
  id: string;
  nome: string;
  palavras_chave: string[];
  departamento_id: string;
  prioridade: number;
  ativo: boolean;
  created_at: string;
};

const TBL = "whatsapp_roteamento_regras" as any;

export const roteamentoService = {
  async listar(): Promise<RegraRoteamento[]> {
    const { data, error } = await (supabase as any).from(TBL)
      .select("*").order("prioridade", { ascending: false }).order("nome");
    if (error) throw error;
    return (data ?? []) as RegraRoteamento[];
  },
  async criar(r: Omit<RegraRoteamento, "id" | "created_at">): Promise<RegraRoteamento> {
    const { data, error } = await (supabase as any).from(TBL).insert(r).select().single();
    if (error) throw error;
    return data as RegraRoteamento;
  },
  async atualizar(id: string, patch: Partial<RegraRoteamento>): Promise<void> {
    const { error } = await (supabase as any).from(TBL).update(patch).eq("id", id);
    if (error) throw error;
  },
  async remover(id: string): Promise<void> {
    const { error } = await (supabase as any).from(TBL).delete().eq("id", id);
    if (error) throw error;
  },
};
