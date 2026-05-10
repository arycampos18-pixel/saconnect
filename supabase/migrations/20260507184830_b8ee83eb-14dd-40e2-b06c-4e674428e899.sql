
-- Tabela principal de resultados
CREATE TABLE public.resultados_eleitorais_tse (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  ano_eleicao INTEGER NOT NULL,
  turno INTEGER NOT NULL DEFAULT 1,
  uf TEXT NOT NULL,
  municipio TEXT,
  codigo_municipio TEXT,
  cargo TEXT NOT NULL,
  codigo_cargo TEXT,
  candidato TEXT,
  numero_candidato TEXT,
  partido TEXT,
  zona_eleitoral TEXT,
  secao_eleitoral TEXT,
  votos INTEGER NOT NULL DEFAULT 0,
  fonte_arquivo TEXT,
  data_importacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  status_importacao TEXT NOT NULL DEFAULT 'importado',
  hash_registro TEXT,
  CONSTRAINT res_tse_unique UNIQUE (ano_eleicao, turno, uf, codigo_municipio, codigo_cargo, numero_candidato, zona_eleitoral, secao_eleitoral)
);
CREATE INDEX idx_res_tse_ano_uf ON public.resultados_eleitorais_tse (ano_eleicao, uf);
CREATE INDEX idx_res_tse_cargo ON public.resultados_eleitorais_tse (ano_eleicao, cargo);
CREATE INDEX idx_res_tse_municipio ON public.resultados_eleitorais_tse (codigo_municipio);
CREATE INDEX idx_res_tse_candidato ON public.resultados_eleitorais_tse (numero_candidato);

ALTER TABLE public.resultados_eleitorais_tse ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view tse results" ON public.resultados_eleitorais_tse
FOR SELECT TO authenticated USING (true);

CREATE POLICY "manage tse results admins" ON public.resultados_eleitorais_tse
FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()) OR public.user_has_permission(auth.uid(), public.user_default_company(auth.uid()), 'configuracoes.manage'))
WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_has_permission(auth.uid(), public.user_default_company(auth.uid()), 'configuracoes.manage'));

-- Logs de importação
CREATE TABLE public.tse_importacao_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  ano_eleicao INTEGER,
  turno INTEGER,
  uf TEXT,
  cargo TEXT,
  arquivo TEXT,
  url TEXT,
  status TEXT NOT NULL DEFAULT 'iniciado',
  total_registros INTEGER NOT NULL DEFAULT 0,
  registros_novos INTEGER NOT NULL DEFAULT 0,
  registros_atualizados INTEGER NOT NULL DEFAULT 0,
  erros TEXT,
  detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
CREATE INDEX idx_tse_log_data ON public.tse_importacao_logs (created_at DESC);

ALTER TABLE public.tse_importacao_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view tse logs admins" ON public.tse_importacao_logs
FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()) OR public.user_has_permission(auth.uid(), public.user_default_company(auth.uid()), 'configuracoes.manage'));

CREATE POLICY "manage tse logs admins" ON public.tse_importacao_logs
FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()) OR public.user_has_permission(auth.uid(), public.user_default_company(auth.uid()), 'configuracoes.manage'))
WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_has_permission(auth.uid(), public.user_default_company(auth.uid()), 'configuracoes.manage'));

-- Tabela de dados brutos (raw) baixados das APIs do TSE
CREATE TABLE public.tse_arquivos_brutos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  log_id UUID REFERENCES public.tse_importacao_logs(id) ON DELETE SET NULL,
  ano_eleicao INTEGER,
  turno INTEGER,
  uf TEXT,
  cargo TEXT,
  arquivo TEXT,
  url TEXT,
  conteudo_bruto JSONB,
  conteudo_texto TEXT,
  size_bytes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tse_raw_log ON public.tse_arquivos_brutos (log_id);
CREATE INDEX idx_tse_raw_ano ON public.tse_arquivos_brutos (ano_eleicao, uf);

ALTER TABLE public.tse_arquivos_brutos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view tse raw admins" ON public.tse_arquivos_brutos
FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()) OR public.user_has_permission(auth.uid(), public.user_default_company(auth.uid()), 'configuracoes.manage'));

CREATE POLICY "manage tse raw admins" ON public.tse_arquivos_brutos
FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()) OR public.user_has_permission(auth.uid(), public.user_default_company(auth.uid()), 'configuracoes.manage'))
WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_has_permission(auth.uid(), public.user_default_company(auth.uid()), 'configuracoes.manage'));
