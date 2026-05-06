-- Etapas do pipeline
CREATE TABLE public.crm_etapas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  cor TEXT NOT NULL DEFAULT '#2563EB',
  is_ganho BOOLEAN NOT NULL DEFAULT false,
  is_perdido BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_etapas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Etapas visíveis para autenticados" ON public.crm_etapas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins criam etapas" ON public.crm_etapas FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins atualizam etapas" ON public.crm_etapas FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins removem etapas" ON public.crm_etapas FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Oportunidades
CREATE TABLE public.crm_oportunidades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  eleitor_id UUID,
  etapa_id UUID NOT NULL,
  responsavel_id UUID,
  valor_estimado INTEGER NOT NULL DEFAULT 1,
  observacoes TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_oportunidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Oportunidades visíveis para autenticados" ON public.crm_oportunidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados criam oportunidades" ON public.crm_oportunidades FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Criador ou admin atualiza oportunidades" ON public.crm_oportunidades FOR UPDATE TO authenticated USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Criador ou admin remove oportunidades" ON public.crm_oportunidades FOR DELETE TO authenticated USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_crm_oportunidades_updated BEFORE UPDATE ON public.crm_oportunidades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tarefas
CREATE TYPE crm_prioridade AS ENUM ('Baixa', 'Média', 'Alta');

CREATE TABLE public.crm_tarefas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  prioridade crm_prioridade NOT NULL DEFAULT 'Média',
  vencimento TIMESTAMPTZ,
  concluida BOOLEAN NOT NULL DEFAULT false,
  concluida_em TIMESTAMPTZ,
  eleitor_id UUID,
  oportunidade_id UUID,
  responsavel_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_tarefas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tarefas visíveis para autenticados" ON public.crm_tarefas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados criam tarefas" ON public.crm_tarefas FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Criador resp ou admin atualiza tarefas" ON public.crm_tarefas FOR UPDATE TO authenticated USING ((created_by = auth.uid()) OR (responsavel_id = auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Criador ou admin remove tarefas" ON public.crm_tarefas FOR DELETE TO authenticated USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_crm_tarefas_updated BEFORE UPDATE ON public.crm_tarefas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Interações
CREATE TYPE crm_interacao_tipo AS ENUM ('Ligação', 'WhatsApp', 'Email', 'Visita', 'Reunião', 'Outro');

CREATE TABLE public.crm_interacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  eleitor_id UUID NOT NULL,
  oportunidade_id UUID,
  tipo crm_interacao_tipo NOT NULL DEFAULT 'Outro',
  descricao TEXT,
  data_interacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_interacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Interações visíveis para autenticados" ON public.crm_interacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados registram interações" ON public.crm_interacoes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Criador ou admin atualiza interações" ON public.crm_interacoes FOR UPDATE TO authenticated USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Criador ou admin remove interações" ON public.crm_interacoes FOR DELETE TO authenticated USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'));

-- Etapas padrão
INSERT INTO public.crm_etapas (nome, ordem, cor, is_ganho, is_perdido) VALUES
  ('Prospecção', 1, '#3B82F6', false, false),
  ('Primeiro contato', 2, '#06B6D4', false, false),
  ('Em negociação', 3, '#F59E0B', false, false),
  ('Compromissado', 4, '#10B981', true, false),
  ('Perdido', 5, '#EF4444', false, true);