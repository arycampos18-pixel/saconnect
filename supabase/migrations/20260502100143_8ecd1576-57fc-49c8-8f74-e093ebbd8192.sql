-- Tabela de envios individuais (1 linha por destinatário de uma campanha)
CREATE TABLE public.mensagem_envios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mensagem_id UUID NOT NULL REFERENCES public.mensagens(id) ON DELETE CASCADE,
  eleitor_id UUID,
  destinatario_nome TEXT,
  destinatario_telefone TEXT NOT NULL,
  canal TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pendente',
  provedor TEXT,
  provedor_message_id TEXT,
  tentativas INTEGER NOT NULL DEFAULT 0,
  erro TEXT,
  enviado_em TIMESTAMPTZ,
  entregue_em TIMESTAMPTZ,
  lido_em TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mensagem_envios_mensagem_id ON public.mensagem_envios(mensagem_id);
CREATE INDEX idx_mensagem_envios_provedor_message_id ON public.mensagem_envios(provedor_message_id);
CREATE INDEX idx_mensagem_envios_status ON public.mensagem_envios(status);

ALTER TABLE public.mensagem_envios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Envios visíveis para autenticados" ON public.mensagem_envios
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados criam envios" ON public.mensagem_envios
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados atualizam envios" ON public.mensagem_envios
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins removem envios" ON public.mensagem_envios
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_mensagem_envios_updated_at
  BEFORE UPDATE ON public.mensagem_envios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Config de aniversariantes
CREATE TABLE public.aniversariantes_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ativo BOOLEAN NOT NULL DEFAULT false,
  template TEXT NOT NULL DEFAULT 'Olá {nome}! 🎂 Feliz aniversário! Que este novo ano seja repleto de saúde, alegria e realizações.',
  hora_disparo INTEGER NOT NULL DEFAULT 9,
  apenas_lgpd BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.aniversariantes_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Config visível para autenticados" ON public.aniversariantes_config
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia config aniv" ON public.aniversariantes_config
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_aniv_config_updated_at
  BEFORE UPDATE ON public.aniversariantes_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Linha padrão
INSERT INTO public.aniversariantes_config (ativo) VALUES (false);

-- Log de aniversariantes para evitar duplicidade
CREATE TABLE public.aniversariantes_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  eleitor_id UUID NOT NULL,
  data_envio DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Enviado',
  erro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (eleitor_id, data_envio)
);

ALTER TABLE public.aniversariantes_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Log visível para autenticados" ON public.aniversariantes_log
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados criam log" ON public.aniversariantes_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins removem log" ON public.aniversariantes_log
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Extensões para cron
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;