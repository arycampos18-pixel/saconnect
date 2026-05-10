
-- ============================================================
-- Módulo: Análise Política Eleitoral — estrutura base
-- ============================================================

-- 1) Tabela principal: eleitores do módulo de análise
CREATE TABLE IF NOT EXISTS public.analise_eleitores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  nome TEXT NOT NULL,
  cpf TEXT,
  titulo_eleitor TEXT,
  zona TEXT,
  secao TEXT,
  data_nascimento DATE,
  nome_mae TEXT,
  telefone TEXT,
  email TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  situacao TEXT NOT NULL DEFAULT 'pendente',
  origem TEXT,
  validado BOOLEAN NOT NULL DEFAULT false,
  validado_em TIMESTAMPTZ,
  validado_por UUID,
  revisado BOOLEAN NOT NULL DEFAULT false,
  observacoes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analise_eleitores_company ON public.analise_eleitores(company_id);
CREATE INDEX IF NOT EXISTS idx_analise_eleitores_cpf ON public.analise_eleitores(cpf);
CREATE INDEX IF NOT EXISTS idx_analise_eleitores_situacao ON public.analise_eleitores(situacao);

-- 2) Histórico de validações
CREATE TABLE IF NOT EXISTS public.analise_validacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  eleitor_id UUID NOT NULL REFERENCES public.analise_eleitores(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'api',
  resultado TEXT NOT NULL,
  fonte TEXT,
  detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analise_validacoes_eleitor ON public.analise_validacoes(eleitor_id);
CREATE INDEX IF NOT EXISTS idx_analise_validacoes_company ON public.analise_validacoes(company_id);

-- 3) Log de consultas a API externa
CREATE TABLE IF NOT EXISTS public.analise_api_consultas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  provedor TEXT NOT NULL,
  endpoint TEXT,
  payload JSONB,
  resposta JSONB,
  status TEXT NOT NULL DEFAULT 'sucesso',
  http_status INT,
  custo_centavos INT NOT NULL DEFAULT 0,
  duracao_ms INT,
  eleitor_id UUID REFERENCES public.analise_eleitores(id) ON DELETE SET NULL,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analise_api_consultas_company ON public.analise_api_consultas(company_id);
CREATE INDEX IF NOT EXISTS idx_analise_api_consultas_provedor ON public.analise_api_consultas(provedor);
CREATE INDEX IF NOT EXISTS idx_analise_api_consultas_created ON public.analise_api_consultas(created_at);

-- 4) Custos de API (agregação)
CREATE TABLE IF NOT EXISTS public.analise_custos_api (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  provedor TEXT NOT NULL,
  ano_mes TEXT NOT NULL,
  total_consultas INT NOT NULL DEFAULT 0,
  total_centavos INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, provedor, ano_mes)
);
CREATE INDEX IF NOT EXISTS idx_analise_custos_company ON public.analise_custos_api(company_id);

-- 5) Logs internos do módulo
CREATE TABLE IF NOT EXISTS public.analise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID,
  acao TEXT NOT NULL,
  entidade TEXT,
  entidade_id UUID,
  detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analise_logs_company ON public.analise_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_analise_logs_created ON public.analise_logs(created_at);

-- ============================================================
-- Triggers
-- ============================================================
DROP TRIGGER IF EXISTS trg_analise_eleitores_updated ON public.analise_eleitores;
CREATE TRIGGER trg_analise_eleitores_updated
  BEFORE UPDATE ON public.analise_eleitores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_analise_eleitores_company ON public.analise_eleitores;
CREATE TRIGGER trg_analise_eleitores_company
  BEFORE INSERT ON public.analise_eleitores
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

DROP TRIGGER IF EXISTS trg_analise_validacoes_company ON public.analise_validacoes;
CREATE TRIGGER trg_analise_validacoes_company
  BEFORE INSERT ON public.analise_validacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

DROP TRIGGER IF EXISTS trg_analise_api_consultas_company ON public.analise_api_consultas;
CREATE TRIGGER trg_analise_api_consultas_company
  BEFORE INSERT ON public.analise_api_consultas
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

DROP TRIGGER IF EXISTS trg_analise_custos_api_company ON public.analise_custos_api;
CREATE TRIGGER trg_analise_custos_api_company
  BEFORE INSERT ON public.analise_custos_api
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

DROP TRIGGER IF EXISTS trg_analise_logs_company ON public.analise_logs;
CREATE TRIGGER trg_analise_logs_company
  BEFORE INSERT ON public.analise_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.analise_eleitores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analise_validacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analise_api_consultas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analise_custos_api ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analise_logs ENABLE ROW LEVEL SECURITY;

-- analise_eleitores
CREATE POLICY "analise_eleitores_select"
  ON public.analise_eleitores FOR SELECT
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "analise_eleitores_insert"
  ON public.analise_eleitores FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "analise_eleitores_update"
  ON public.analise_eleitores FOR UPDATE
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "analise_eleitores_delete"
  ON public.analise_eleitores FOR DELETE
  USING (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- analise_validacoes
CREATE POLICY "analise_validacoes_select"
  ON public.analise_validacoes FOR SELECT
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "analise_validacoes_insert"
  ON public.analise_validacoes FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

-- analise_api_consultas
CREATE POLICY "analise_api_consultas_select"
  ON public.analise_api_consultas FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR (public.user_belongs_to_company(auth.uid(), company_id)
        AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lideranca')))
  );

CREATE POLICY "analise_api_consultas_insert"
  ON public.analise_api_consultas FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

-- analise_custos_api
CREATE POLICY "analise_custos_api_select"
  ON public.analise_custos_api FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR (public.user_belongs_to_company(auth.uid(), company_id)
        AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lideranca')))
  );

CREATE POLICY "analise_custos_api_upsert"
  ON public.analise_custos_api FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "analise_custos_api_update"
  ON public.analise_custos_api FOR UPDATE
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

-- analise_logs
CREATE POLICY "analise_logs_select"
  ON public.analise_logs FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR (public.user_belongs_to_company(auth.uid(), company_id)
        AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lideranca')))
  );

CREATE POLICY "analise_logs_insert"
  ON public.analise_logs FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

-- ============================================================
-- Permissões no catálogo
-- ============================================================
INSERT INTO public.settings_permissions (id, module, description) VALUES
  ('analise.dashboard.view',     'analise', 'Análise Eleitoral: visualizar dashboard'),
  ('analise.eleitores.view',     'analise', 'Análise Eleitoral: visualizar eleitores'),
  ('analise.eleitores.manage',   'analise', 'Análise Eleitoral: criar/editar eleitores'),
  ('analise.validacao.run',      'analise', 'Análise Eleitoral: executar validação'),
  ('analise.api.consultar',      'analise', 'Análise Eleitoral: consultar API externa'),
  ('analise.revisao.manual',     'analise', 'Análise Eleitoral: revisão manual'),
  ('analise.analises.view',      'analise', 'Análise Eleitoral: visualizar análises'),
  ('analise.relatorios.view',    'analise', 'Análise Eleitoral: visualizar relatórios'),
  ('analise.custos.view',        'analise', 'Análise Eleitoral: visualizar custos de API')
ON CONFLICT (id) DO NOTHING;

-- Concede tudo ao perfil Admin de cada empresa
INSERT INTO public.settings_profile_permissions (profile_id, permission_id)
SELECT p.id, perm.id
  FROM public.settings_profiles p
  CROSS JOIN public.settings_permissions perm
 WHERE p.nome = 'Admin'
   AND perm.module = 'analise'
ON CONFLICT DO NOTHING;

-- Concede leitura básica ao perfil Atendente
INSERT INTO public.settings_profile_permissions (profile_id, permission_id)
SELECT p.id, perm.id
  FROM public.settings_profiles p
  CROSS JOIN (VALUES
    ('analise.dashboard.view'),
    ('analise.eleitores.view'),
    ('analise.analises.view')
  ) AS perm(id)
 WHERE p.nome = 'Atendente'
ON CONFLICT DO NOTHING;
