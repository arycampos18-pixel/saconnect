-- ============================================================
-- Campos adicionais da API Localize (Assertiva / SA Connect Data)
-- ============================================================
-- Novos campos demográficos retornados pela API mas ainda não
-- persistidos na tabela eleitores.

ALTER TABLE public.eleitores
  ADD COLUMN IF NOT EXISTS estado_civil       TEXT,
  ADD COLUMN IF NOT EXISTS nacionalidade      TEXT,
  ADD COLUMN IF NOT EXISTS profissao          TEXT,
  ADD COLUMN IF NOT EXISTS status_enriquecimento TEXT DEFAULT 'PENDENTE',
  ADD COLUMN IF NOT EXISTS data_ultimo_enriquecimento TIMESTAMPTZ,
  -- Arrays JSON com múltiplos telefones e endereços retornados pela API
  ADD COLUMN IF NOT EXISTS telefones_api      JSONB,
  ADD COLUMN IF NOT EXISTS enderecos_api      JSONB;

COMMENT ON COLUMN public.eleitores.telefones_api IS
  'Array JSON de telefones retornados pela API Assertiva: [{numero, tipo, operadora, ativo}]';
COMMENT ON COLUMN public.eleitores.enderecos_api IS
  'Array JSON de endereços retornados pela API Assertiva: [{logradouro, numero, complemento, bairro, cidade, estado, cep, tipo, principal}]';
COMMENT ON COLUMN public.eleitores.status_enriquecimento IS
  'PENDENTE | SUCESSO | ERRO | NAO_ENCONTRADO';

-- Índice para filtrar por status de enriquecimento (útil em dashboards)
CREATE INDEX IF NOT EXISTS idx_eleitores_status_enriquecimento
  ON public.eleitores (status_enriquecimento);

-- ============================================================
-- Finalidade LGPD na tabela de credenciais do provedor
-- ============================================================
-- idFinalidade é obrigatório na API: 1=Confirmação Identidade,
-- 2=Ciclo Crédito, 4=Execução Contrato, 5=Legítimo Interesse

ALTER TABLE public.analise_provedor_credenciais
  ADD COLUMN IF NOT EXISTS id_finalidade INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.analise_provedor_credenciais.id_finalidade IS
  '1=Confirmação de Identidade, 2=Ciclo de Crédito, 4=Execução de Contrato, 5=Legítimo Interesse';
