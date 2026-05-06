-- Módulo Disparos WhatsApp em massa (separado de mensagens/campanhas legado)
CREATE TYPE disparo_status AS ENUM ('rascunho','agendado','processando','pausado','concluido','cancelado','falhou');
CREATE TYPE disparo_dest_status AS ENUM ('pendente','enviando','enviado','falhou','optout','ignorado');

CREATE TABLE public.disparos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  template TEXT NOT NULL,
  segmento_id UUID,
  filtros_snapshot JSONB NOT NULL DEFAULT '{}',
  apenas_lgpd BOOLEAN NOT NULL DEFAULT true,
  respeitar_optout BOOLEAN NOT NULL DEFAULT true,
  evitar_duplicatas_horas INTEGER NOT NULL DEFAULT 24,
  intervalo_segundos INTEGER NOT NULL DEFAULT 3,
  lote_tamanho INTEGER NOT NULL DEFAULT 30,
  janela_inicio TIME,
  janela_fim TIME,
  agendado_para TIMESTAMPTZ,
  status disparo_status NOT NULL DEFAULT 'rascunho',
  total INTEGER NOT NULL DEFAULT 0,
  enviados INTEGER NOT NULL DEFAULT 0,
  falhas INTEGER NOT NULL DEFAULT 0,
  optouts INTEGER NOT NULL DEFAULT 0,
  iniciado_em TIMESTAMPTZ,
  concluido_em TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.disparo_destinatarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disparo_id UUID NOT NULL REFERENCES public.disparos(id) ON DELETE CASCADE,
  eleitor_id UUID,
  nome TEXT,
  telefone TEXT NOT NULL,
  telefone_digits TEXT NOT NULL,
  status disparo_dest_status NOT NULL DEFAULT 'pendente',
  conteudo_enviado TEXT,
  provedor_message_id TEXT,
  erro TEXT,
  tentativas INTEGER NOT NULL DEFAULT 0,
  enviado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_disp_dest_disparo_status ON public.disparo_destinatarios(disparo_id, status);
CREATE INDEX idx_disp_dest_telefone ON public.disparo_destinatarios(telefone_digits);

CREATE TABLE public.disparo_optout (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone_digits TEXT NOT NULL UNIQUE,
  motivo TEXT,
  origem TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.disparos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disparo_destinatarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disparo_optout ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Disparos visíveis autenticados" ON public.disparos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados criam disparos" ON public.disparos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Criador ou admin atualiza disparos" ON public.disparos FOR UPDATE TO authenticated USING (created_by = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "Criador ou admin remove disparos" ON public.disparos FOR DELETE TO authenticated USING (created_by = auth.uid() OR has_role(auth.uid(),'admin'));

CREATE POLICY "Destinatários visíveis autenticados" ON public.disparo_destinatarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados gerenciam destinatários" ON public.disparo_destinatarios FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Optout visível autenticados" ON public.disparo_optout FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados gerenciam optout" ON public.disparo_optout FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_disparos_updated BEFORE UPDATE ON public.disparos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();