import { supabase } from "@/integrations/supabase/client";

export interface SistemaConfig {
  id: string;
  nome_mandato: string;
  logo_url: string | null;
  cor_primaria: string;
  cargo: string | null;
  partido: string | null;
  numero_eleitoral: string | null;
  jurisdicao: string | null;
  fuso_horario: string;
  texto_consentimento: string;
  url_politica_privacidade: string | null;
  email_dpo: string | null;
  limite_mensagens_dia: number;
  horario_envio_inicio: number;
  horario_envio_fim: number;
  max_tentativas: number;
  notificar_responsavel_tarefa: boolean;
  notificar_evento_proximo: boolean;
}

export const configService = {
  async obter(): Promise<SistemaConfig | null> {
    const { data, error } = await supabase.from("sistema_config").select("*").limit(1).maybeSingle();
    if (error) throw error;
    return data as SistemaConfig | null;
  },
  async salvar(input: Partial<SistemaConfig>) {
    const cfg = await this.obter();
    if (!cfg) {
      const { error } = await supabase.from("sistema_config").insert(input as any);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("sistema_config").update(input as any).eq("id", cfg.id);
      if (error) throw error;
    }
  },
};