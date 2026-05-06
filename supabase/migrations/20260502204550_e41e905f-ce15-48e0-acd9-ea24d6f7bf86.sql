
-- Configurações gerais do módulo WhatsApp (singleton via key)
CREATE TABLE IF NOT EXISTS public.whatsapp_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chave TEXT NOT NULL UNIQUE DEFAULT 'principal',

  -- SLA
  sla_primeira_resposta_min INTEGER NOT NULL DEFAULT 10,
  sla_primeira_resposta_alerta BOOLEAN NOT NULL DEFAULT true,
  sla_resolucao_min INTEGER NOT NULL DEFAULT 1440,
  sla_resolucao_alerta BOOLEAN NOT NULL DEFAULT true,

  -- Encerramento automático
  auto_encerrar_ativo BOOLEAN NOT NULL DEFAULT false,
  auto_encerrar_horas INTEGER NOT NULL DEFAULT 24,
  auto_encerrar_mensagem TEXT NOT NULL DEFAULT 'Olá! Estamos encerrando este atendimento por inatividade. Caso ainda precise, basta nos chamar de novo. 👋',

  -- Boas-vindas
  boas_vindas_ativo BOOLEAN NOT NULL DEFAULT false,
  boas_vindas_mensagem TEXT NOT NULL DEFAULT 'Olá! 👋 Recebemos sua mensagem e em breve um atendente irá responder.',

  -- Fora de expediente
  fora_expediente_ativo BOOLEAN NOT NULL DEFAULT false,
  fora_expediente_mensagem TEXT NOT NULL DEFAULT 'Estamos fora do horário de atendimento. Retornaremos em breve.',
  expediente_inicio TIME NOT NULL DEFAULT '08:00',
  expediente_fim TIME NOT NULL DEFAULT '18:00',
  expediente_dias_semana INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}', -- 0=dom..6=sab

  -- Notificações
  notif_som BOOLEAN NOT NULL DEFAULT true,
  notif_email BOOLEAN NOT NULL DEFAULT false,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Garante 1 linha
INSERT INTO public.whatsapp_config (chave) VALUES ('principal')
  ON CONFLICT (chave) DO NOTHING;

ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Config visível para autenticados"
  ON public.whatsapp_config FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins atualizam config"
  ON public.whatsapp_config FOR UPDATE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins inserem config"
  ON public.whatsapp_config FOR INSERT
  TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Colunas SLA em whatsapp_conversas
ALTER TABLE public.whatsapp_conversas
  ADD COLUMN IF NOT EXISTS primeira_resposta_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finalizada_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_primeira_resposta_violado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sla_resolucao_violado BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_wpp_conv_inativas
  ON public.whatsapp_conversas (status, ultima_mensagem_em);
