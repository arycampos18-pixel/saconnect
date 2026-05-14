-- ============================================================
-- Nova tabela `membros` — substitui departamento_membros para
-- cadastros de membros de departamentos/gabinete.
-- Unifica os 3 fluxos: Da base de eleitores, Novo membro, CSV.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.membros (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departamento_id UUID NOT NULL REFERENCES public.departamentos(id) ON DELETE CASCADE,
  eleitor_id      UUID REFERENCES public.eleitores(id) ON DELETE SET NULL,
  company_id      UUID REFERENCES public.settings_companies(id) ON DELETE CASCADE,

  nome            TEXT NOT NULL,
  telefone        TEXT,
  email           TEXT,
  cpf             TEXT,
  bairro          TEXT,
  cidade          TEXT,
  uf              TEXT,
  rua             TEXT,
  numero          TEXT,
  complemento     TEXT,
  cep             TEXT,
  genero          TEXT,
  data_nascimento DATE,

  funcao          TEXT NOT NULL DEFAULT 'membro'
                    CHECK (funcao IN ('membro','coordenador','voluntario')),
  status          TEXT NOT NULL DEFAULT 'ativo'
                    CHECK (status IN ('ativo','inativo')),
  observacoes     TEXT,

  entrou_em       TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_membros_departamento ON public.membros (departamento_id);
CREATE INDEX IF NOT EXISTS idx_membros_eleitor      ON public.membros (eleitor_id);
CREATE INDEX IF NOT EXISTS idx_membros_company      ON public.membros (company_id);
CREATE INDEX IF NOT EXISTS idx_membros_telefone     ON public.membros (telefone);

ALTER TABLE public.membros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "membros_company_policy" ON public.membros;
CREATE POLICY "membros_company_policy" ON public.membros
  FOR ALL TO authenticated
  USING (
    company_id IS NULL OR
    public.is_super_admin(auth.uid()) OR
    public.user_belongs_to_company(auth.uid(), company_id)
  )
  WITH CHECK (
    company_id IS NULL OR
    public.is_super_admin(auth.uid()) OR
    public.user_belongs_to_company(auth.uid(), company_id)
  );

DROP TRIGGER IF EXISTS trg_membros_updated_at ON public.membros;
CREATE TRIGGER trg_membros_updated_at
  BEFORE UPDATE ON public.membros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migra dados existentes de departamento_membros para membros
INSERT INTO public.membros (
  id, departamento_id, eleitor_id, company_id,
  nome, telefone, email, cpf, bairro,
  funcao, status, observacoes,
  entrou_em, created_at, updated_at
)
SELECT
  id, departamento_id, eleitor_id, company_id,
  nome, telefone, email, cpf, bairro,
  COALESCE(funcao, 'membro'), COALESCE(status, 'ativo'), NULL::text,
  COALESCE(entrou_em, created_at), created_at, updated_at
FROM public.departamento_membros
ON CONFLICT (id) DO NOTHING;
