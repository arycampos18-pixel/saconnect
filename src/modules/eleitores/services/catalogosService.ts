import { supabase } from "@/integrations/supabase/client";

export type Lideranca = {
  id: string;
  nome: string;
  cidade: string | null;
  meta: number;
  ativo: boolean;
};

export type Cabo = {
  id: string;
  lideranca_id: string;
  nome: string;
  meta: number;
  ativo: boolean;
};

export type Tag = { id: string; nome: string; cor: string };

export const catalogosService = {
  async liderancas(): Promise<Lideranca[]> {
    const { data, error } = await supabase
      .from("liderancas")
      .select("id, nome, cidade, meta, ativo")
      .eq("ativo", true)
      .order("nome");
    if (error) throw error;
    return data ?? [];
  },
  async cabos(): Promise<Cabo[]> {
    const { data, error } = await supabase
      .from("cabos_eleitorais")
      .select("id, lideranca_id, nome, meta, ativo")
      .eq("ativo", true)
      .order("nome");
    if (error) throw error;
    return data ?? [];
  },
  async tags(): Promise<Tag[]> {
    const { data, error } = await supabase.from("tags").select("id, nome, cor").order("nome");
    if (error) throw error;
    return data ?? [];
  },
  async bairros(): Promise<string[]> {
    const { data, error } = await supabase
      .from("eleitores")
      .select("bairro")
      .not("bairro", "is", null)
      .limit(1000);
    if (error) throw error;
    return Array.from(new Set((data ?? []).map((r: any) => r.bairro).filter(Boolean))).sort();
  },
};