-- Enums
CREATE TYPE public.automacao_status AS ENUM ('Rascunho', 'Ativa', 'Pausada');
CREATE TYPE public.automacao_trigger_tipo AS ENUM (
  'novo_eleitor',
  'eleitor_respondeu_pesquisa',
  'eleitor_participou_evento',
  'aniversario_eleitor',
  'data_especifica',
  'manual'
);
CREATE TYPE public.execucao_status AS ENUM ('Sucesso', 'Erro', 'Em andamento');

-- Automações
CREATE TABLE public.automacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  trigger_tipo public.automacao_trigger_tipo NOT NULL DEFAULT 'manual',
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  edges jsonb NOT NULL DEFAULT '[]'::jsonb,
  status public.automacao_status NOT NULL DEFAULT 'Rascunho',
  total_execucoes integer NOT NULL DEFAULT 0,
  ultima_execucao_em timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Automações visíveis para autenticados"
  ON public.automacoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados criam automações"
  ON public.automacoes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Criador ou admin atualiza automações"
  ON public.automacoes FOR UPDATE TO authenticated
  USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Criador ou admin remove automações"
  ON public.automacoes FOR DELETE TO authenticated
  USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_automacoes_updated_at
  BEFORE UPDATE ON public.automacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Execuções
CREATE TABLE public.automacao_execucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automacao_id uuid NOT NULL REFERENCES public.automacoes(id) ON DELETE CASCADE,
  status public.execucao_status NOT NULL DEFAULT 'Em andamento',
  trigger_origem text,
  contexto jsonb NOT NULL DEFAULT '{}'::jsonb,
  acoes_executadas jsonb NOT NULL DEFAULT '[]'::jsonb,
  erro text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_automacao_execucoes_automacao ON public.automacao_execucoes(automacao_id, created_at DESC);

ALTER TABLE public.automacao_execucoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Execuções visíveis para autenticados"
  ON public.automacao_execucoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados registram execuções"
  ON public.automacao_execucoes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins removem execuções"
  ON public.automacao_execucoes FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));