import { supabase } from "@/integrations/supabase/client";

export type Distribuicao = {
  muitoProvavel: number;
  provavel: number;
  indeciso: number;
  improvavel: number;
};

export type EleitorRisco = {
  id: string;
  nome: string;
  telefone: string | null;
  risco: number;
  diasSemInteracao: number;
  bairro: string | null;
};

export type Influenciador = {
  id: string;
  nome: string;
  telefone: string | null;
  influencia: number;
  eventosPresentes: number;
  respostasTotal: number;
  bairro: string | null;
};

export type Oportunidade = {
  bairro: string;
  total: number;
  mediaPropensao: number;
  potencial: number;
};

export type AnalisePreditiva = {
  totalEleitores: number;
  distribuicao: Distribuicao;
  emRisco: EleitorRisco[];
  influenciadores: Influenciador[];
  oportunidades: Oportunidade[];
  insights: string[];
  geradoEm: string;
};

export const predicaoService = {
  async carregar(): Promise<AnalisePreditiva> {
    const { data, error } = await supabase.functions.invoke("analise-preditiva", {
      body: {},
    });
    if (error) throw error;
    return data as AnalisePreditiva;
  },
};