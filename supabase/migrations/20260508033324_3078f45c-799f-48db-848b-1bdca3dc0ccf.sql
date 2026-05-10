
-- Expandir public.departamentos
ALTER TABLE public.departamentos
  ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS responsavel_nome TEXT,
  ADD COLUMN IF NOT EXISTS objetivo TEXT,
  ADD COLUMN IF NOT EXISTS area_atuacao TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativo';

-- Unique nome por empresa
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'departamentos_company_nome_unique'
  ) THEN
    ALTER TABLE public.departamentos
      ADD CONSTRAINT departamentos_company_nome_unique UNIQUE (company_id, nome);
  END IF;
END $$;

-- Expandir public.departamento_membros
ALTER TABLE public.departamento_membros
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS eleitor_id UUID REFERENCES public.eleitores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS funcao TEXT NOT NULL DEFAULT 'membro',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS entrou_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_departamento_membros_updated_at ON public.departamento_membros;
CREATE TRIGGER trg_departamento_membros_updated_at
  BEFORE UPDATE ON public.departamento_membros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para preencher company_id
DROP TRIGGER IF EXISTS trg_departamento_membros_company ON public.departamento_membros;
CREATE TRIGGER trg_departamento_membros_company
  BEFORE INSERT ON public.departamento_membros
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

-- Nova tabela: departamento_interacoes
CREATE TABLE IF NOT EXISTS public.departamento_interacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departamento_id UUID NOT NULL REFERENCES public.departamentos(id) ON DELETE CASCADE,
  membro_id UUID REFERENCES public.departamento_membros(id) ON DELETE SET NULL,
  company_id UUID,
  tipo TEXT NOT NULL DEFAULT 'contato',
  descricao TEXT,
  responsavel_id UUID REFERENCES auth.users(id),
  responsavel_nome TEXT,
  status TEXT NOT NULL DEFAULT 'concluido',
  data_interacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.departamento_interacoes ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_dep_interacoes_updated_at ON public.departamento_interacoes;
CREATE TRIGGER trg_dep_interacoes_updated_at
  BEFORE UPDATE ON public.departamento_interacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_dep_interacoes_company ON public.departamento_interacoes;
CREATE TRIGGER trg_dep_interacoes_company
  BEFORE INSERT ON public.departamento_interacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

CREATE POLICY "tenant_all_departamento_interacoes"
  ON public.departamento_interacoes
  FOR ALL
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

-- Índices
CREATE INDEX IF NOT EXISTS idx_departamentos_company ON public.departamentos(company_id);
CREATE INDEX IF NOT EXISTS idx_dep_membros_departamento ON public.departamento_membros(departamento_id);
CREATE INDEX IF NOT EXISTS idx_dep_membros_company ON public.departamento_membros(company_id);
CREATE INDEX IF NOT EXISTS idx_dep_membros_eleitor ON public.departamento_membros(eleitor_id);
CREATE INDEX IF NOT EXISTS idx_dep_interacoes_departamento ON public.departamento_interacoes(departamento_id);
CREATE INDEX IF NOT EXISTS idx_dep_interacoes_company ON public.departamento_interacoes(company_id);
CREATE INDEX IF NOT EXISTS idx_dep_interacoes_data ON public.departamento_interacoes(data_interacao DESC);
