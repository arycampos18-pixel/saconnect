
-- Tabela de tokens de auto-cadastro
CREATE TABLE IF NOT EXISTS public.tokens_auto_cadastro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  tipo text NOT NULL DEFAULT 'link' CHECK (tipo IN ('qrcode','whatsapp','link')),
  lideranca_id uuid REFERENCES public.liderancas(id) ON DELETE SET NULL,
  cabo_id uuid REFERENCES public.cabos_eleitorais(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  created_by uuid,
  expira_em timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  usado boolean NOT NULL DEFAULT false,
  usado_em timestamptz,
  usado_por_eleitor_id uuid REFERENCES public.eleitores(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tac_token ON public.tokens_auto_cadastro(token);
CREATE INDEX IF NOT EXISTS idx_tac_lideranca ON public.tokens_auto_cadastro(lideranca_id);
CREATE INDEX IF NOT EXISTS idx_tac_company ON public.tokens_auto_cadastro(company_id);
CREATE INDEX IF NOT EXISTS idx_tac_expira ON public.tokens_auto_cadastro(expira_em);

ALTER TABLE public.tokens_auto_cadastro ENABLE ROW LEVEL SECURITY;

-- Tokens podem ser lidos publicamente (necessário para validação no formulário público)
CREATE POLICY "Tokens publicamente legíveis"
  ON public.tokens_auto_cadastro FOR SELECT
  USING (true);

CREATE POLICY "Autenticados criam tokens"
  ON public.tokens_auto_cadastro FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados atualizam tokens da empresa"
  ON public.tokens_auto_cadastro FOR UPDATE
  TO authenticated
  USING (company_id IS NULL OR public.user_belongs_to_company(auth.uid(), company_id));

-- Colunas em eleitores
ALTER TABLE public.eleitores
  ADD COLUMN IF NOT EXISTS cadastrado_via text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS lideranca_origem_id uuid REFERENCES public.liderancas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cabo_origem_id uuid REFERENCES public.cabos_eleitorais(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS token_cadastro_id uuid REFERENCES public.tokens_auto_cadastro(id) ON DELETE SET NULL;
