-- Feature flags para ativação gradual
CREATE TABLE IF NOT EXISTS public.analise_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  chave text NOT NULL,
  ativo boolean NOT NULL DEFAULT false,
  rollout_pct int NOT NULL DEFAULT 100 CHECK (rollout_pct BETWEEN 0 AND 100),
  descricao text,
  alterado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ff_company_chave ON public.analise_feature_flags(company_id, chave);

ALTER TABLE public.analise_feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ff_select" ON public.analise_feature_flags FOR SELECT
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "ff_insert" ON public.analise_feature_flags FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()) OR (public.user_belongs_to_company(auth.uid(), company_id) AND public.has_role(auth.uid(),'admin')));
CREATE POLICY "ff_update" ON public.analise_feature_flags FOR UPDATE
  USING (public.is_super_admin(auth.uid()) OR (public.user_belongs_to_company(auth.uid(), company_id) AND public.has_role(auth.uid(),'admin')));

CREATE TRIGGER trg_ff_company BEFORE INSERT ON public.analise_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_ff_updated BEFORE UPDATE ON public.analise_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.analise_feature_ativa(_chave text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT ativo AND (rollout_pct >= 100 OR (random()*100) <= rollout_pct)
    FROM public.analise_feature_flags
    WHERE company_id = public.user_default_company(auth.uid()) AND chave = _chave
    LIMIT 1
  ), false);
$$;

-- Monitoramento de erros
CREATE TABLE IF NOT EXISTS public.analise_erros_monitoramento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  origem text NOT NULL,
  severidade text NOT NULL DEFAULT 'erro',
  mensagem text NOT NULL,
  contexto jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_id uuid,
  resolvido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_erros_company_data ON public.analise_erros_monitoramento(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_erros_origem ON public.analise_erros_monitoramento(origem);

ALTER TABLE public.analise_erros_monitoramento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "erros_select" ON public.analise_erros_monitoramento FOR SELECT
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "erros_insert" ON public.analise_erros_monitoramento FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "erros_update" ON public.analise_erros_monitoramento FOR UPDATE
  USING (public.is_super_admin(auth.uid()) OR (public.user_belongs_to_company(auth.uid(), company_id) AND public.has_role(auth.uid(),'admin')));

CREATE TRIGGER trg_erros_company BEFORE INSERT ON public.analise_erros_monitoramento
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

-- Seed de flags principais (idempotente, por empresa que já tenha eleitores)
INSERT INTO public.analise_feature_flags (company_id, chave, ativo, rollout_pct, descricao)
SELECT DISTINCT company_id, x.chave, false, 100, x.descricao
FROM public.analise_eleitores
CROSS JOIN (VALUES
  ('cadastro_eleitores',     'Cadastro de eleitores'),
  ('validacao_eleitoral',    'Validação eleitoral via API'),
  ('validacao_whatsapp',     'Validação por WhatsApp'),
  ('enriquecimento',         'Enriquecimento de dados'),
  ('importacao_tse',         'Importação de resultados TSE'),
  ('comparativo_pos_eleicao','Comparativo pós-eleição'),
  ('mapa_estrategico',       'Mapa estratégico'),
  ('lgpd',                   'Painel LGPD')
) x(chave, descricao)
ON CONFLICT (company_id, chave) DO NOTHING;