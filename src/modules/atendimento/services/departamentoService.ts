import { supabase } from "@/integrations/supabase/client";
import type { Departamento } from "./atendimentoService";

export interface DepartamentoMembro {
  id: string;
  departamento_id: string;
  user_id: string;
}

export const departamentoService = {
  async listarTodos() {
    const { data, error } = await supabase
      .from("departamentos")
      .select("*")
      .order("nome");
    if (error) throw error;
    return (data ?? []) as unknown as Departamento[];
  },

  async criar(input: Partial<Departamento> & { nome: string }) {
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("departamentos")
      .insert({
        nome: input.nome,
        descricao: input.descricao ?? null,
        cor: input.cor ?? "#2563EB",
        icone: input.icone ?? "Building2",
        ativo: input.ativo ?? true,
        created_by: u.user?.id ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as unknown as Departamento;
  },

  async atualizar(id: string, input: Partial<Departamento>) {
    const { error } = await supabase
      .from("departamentos")
      .update({
        nome: input.nome,
        descricao: input.descricao,
        cor: input.cor,
        icone: input.icone,
        ativo: input.ativo,
      })
      .eq("id", id);
    if (error) throw error;
  },

  async remover(id: string) {
    const { error } = await supabase.from("departamentos").delete().eq("id", id);
    if (error) throw error;
  },

  async listarMembros(departamentoId: string) {
    const { data, error } = await supabase
      .from("departamento_membros")
      .select("*")
      .eq("departamento_id", departamentoId);
    if (error) throw error;
    return (data ?? []) as unknown as DepartamentoMembro[];
  },

  async adicionarMembro(departamentoId: string, userId: string) {
    const { error } = await supabase
      .from("departamento_membros")
      .insert({ departamento_id: departamentoId, user_id: userId });
    if (error) throw error;
  },

  async removerMembro(membroId: string) {
    const { error } = await supabase
      .from("departamento_membros")
      .delete()
      .eq("id", membroId);
    if (error) throw error;
  },
};