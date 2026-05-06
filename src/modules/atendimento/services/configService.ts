import { supabase } from "@/integrations/supabase/client";

export type WhatsAppConfig = {
  id: string;
  chave: string;
  sla_primeira_resposta_min: number;
  sla_primeira_resposta_alerta: boolean;
  sla_resolucao_min: number;
  sla_resolucao_alerta: boolean;
  auto_encerrar_ativo: boolean;
  auto_encerrar_horas: number;
  auto_encerrar_mensagem: string;
  boas_vindas_ativo: boolean;
  boas_vindas_mensagem: string;
  fora_expediente_ativo: boolean;
  fora_expediente_mensagem: string;
  expediente_inicio: string;
  expediente_fim: string;
  expediente_dias_semana: number[];
  notif_som: boolean;
  notif_email: boolean;
  chatbot_ativo: boolean;
  chatbot_fluxo_id: string | null;
};

const TBL = "whatsapp_config" as any;

export const configService = {
  async obter(): Promise<WhatsAppConfig> {
    const { data, error } = await (supabase as any).from(TBL)
      .select("*").eq("chave", "principal").single();
    if (error) throw error;
    return data as WhatsAppConfig;
  },
  async atualizar(patch: Partial<WhatsAppConfig>): Promise<void> {
    const { error } = await (supabase as any).from(TBL)
      .update(patch).eq("chave", "principal");
    if (error) throw error;
  },
  async executarManutencao(): Promise<any> {
    const { data, error } = await supabase.functions.invoke("whatsapp-manutencao");
    if (error) throw error;
    return data;
  },
};
