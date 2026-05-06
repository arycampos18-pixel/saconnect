-- Configurações globais de disparo
CREATE TABLE public.disparo_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervalo_min_segundos INTEGER NOT NULL DEFAULT 60,
  intervalo_max_segundos INTEGER NOT NULL DEFAULT 180,
  lote_padrao INTEGER NOT NULL DEFAULT 20,
  janela_inicio TIME DEFAULT '08:00',
  janela_fim TIME DEFAULT '20:00',
  pausa_a_cada INTEGER NOT NULL DEFAULT 50,
  pausa_segundos INTEGER NOT NULL DEFAULT 600,
  limite_diario INTEGER NOT NULL DEFAULT 500,
  saudacao_padrao BOOLEAN NOT NULL DEFAULT true,
  falar_nome_padrao BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.disparo_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Config visível autenticados" ON public.disparo_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam config" ON public.disparo_config FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- Linha única padrão
INSERT INTO public.disparo_config DEFAULT VALUES;

-- Novos campos em disparos
ALTER TABLE public.disparos
  ADD COLUMN intervalo_min_segundos INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN intervalo_max_segundos INTEGER NOT NULL DEFAULT 180,
  ADD COLUMN agendado_fim TIMESTAMPTZ,
  ADD COLUMN template_id UUID,
  ADD COLUMN instancia_id TEXT,
  ADD COLUMN prepend_saudacao BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN prepend_nome BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN pausa_a_cada INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN pausa_segundos INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN limite_diario INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN enviados_hoje INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN data_referencia_diaria DATE;