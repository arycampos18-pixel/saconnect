-- Notificações in-app
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT,
  tipo TEXT NOT NULL DEFAULT 'info',
  link TEXT,
  lida BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, lida, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário vê próprias notificações" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Autenticados criam notificações" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Usuário marca próprias como lidas" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Usuário remove próprias" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Push subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_push_user ON public.push_subscriptions(user_id);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário vê próprias subscriptions" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Usuário cria próprias subscriptions" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Usuário remove próprias subscriptions" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Configurações gerais
CREATE TABLE public.sistema_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Branding
  nome_mandato TEXT NOT NULL DEFAULT 'Meu Mandato',
  logo_url TEXT,
  cor_primaria TEXT NOT NULL DEFAULT '#2563EB',
  -- Parâmetros eleitorais
  cargo TEXT,
  partido TEXT,
  numero_eleitoral TEXT,
  jurisdicao TEXT,
  fuso_horario TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  -- LGPD
  texto_consentimento TEXT NOT NULL DEFAULT 'Autorizo o uso dos meus dados pessoais para fins de comunicação política, conforme a LGPD.',
  url_politica_privacidade TEXT,
  email_dpo TEXT,
  -- Limites
  limite_mensagens_dia INTEGER NOT NULL DEFAULT 1000,
  horario_envio_inicio INTEGER NOT NULL DEFAULT 9,
  horario_envio_fim INTEGER NOT NULL DEFAULT 20,
  max_tentativas INTEGER NOT NULL DEFAULT 3,
  notificar_responsavel_tarefa BOOLEAN NOT NULL DEFAULT true,
  notificar_evento_proximo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sistema_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Config visível para autenticados" ON public.sistema_config
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia config geral" ON public.sistema_config
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_sistema_config_updated
  BEFORE UPDATE ON public.sistema_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.sistema_config DEFAULT VALUES;

-- Webhooks de saída
CREATE TABLE public.webhooks_saida (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  eventos TEXT[] NOT NULL DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  secret TEXT,
  total_disparos INTEGER NOT NULL DEFAULT 0,
  ultimo_disparo_em TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.webhooks_saida ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Webhooks visíveis para autenticados" ON public.webhooks_saida
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia webhooks" ON public.webhooks_saida
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_webhooks_saida_updated
  BEFORE UPDATE ON public.webhooks_saida
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.webhook_entregas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID NOT NULL REFERENCES public.webhooks_saida(id) ON DELETE CASCADE,
  evento TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status_code INTEGER,
  resposta TEXT,
  sucesso BOOLEAN NOT NULL DEFAULT false,
  erro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_webhook_entregas_webhook ON public.webhook_entregas(webhook_id, created_at DESC);
ALTER TABLE public.webhook_entregas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Entregas visíveis para autenticados" ON public.webhook_entregas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados criam entregas" ON public.webhook_entregas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin remove entregas" ON public.webhook_entregas
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));