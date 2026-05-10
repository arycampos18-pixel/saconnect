
-- 1) Coluna de empresa ativa por usuário
ALTER TABLE public.settings_users
  ADD COLUMN IF NOT EXISTS active_company_id uuid REFERENCES public.settings_companies(id) ON DELETE SET NULL;

-- 2) Funções auxiliares
CREATE OR REPLACE FUNCTION public.current_active_company()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT active_company_id FROM public.settings_users WHERE id = auth.uid()),
    public.user_default_company(auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_company(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      public.is_super_admin(auth.uid())
      OR _company_id IS NULL
      OR _company_id = public.current_active_company()
    );
$$;

-- 3) RPC que o frontend chama para definir a empresa ativa
CREATE OR REPLACE FUNCTION public.set_active_company(_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF _company_id IS NOT NULL
     AND NOT public.is_super_admin(auth.uid())
     AND NOT public.user_belongs_to_company(auth.uid(), _company_id) THEN
    RAISE EXCEPTION 'Usuário não tem vínculo ativo com esta empresa';
  END IF;

  -- Garante registro em settings_users (caso ainda não exista)
  INSERT INTO public.settings_users (id, nome, email, active_company_id)
    VALUES (auth.uid(), '', '', _company_id)
  ON CONFLICT (id) DO UPDATE SET active_company_id = EXCLUDED.active_company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_active_company(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_active_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_active_company() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_company(uuid) TO authenticated;

-- 4) Aplica policy RESTRICTIVE em todas as tabelas com company_id
DO $$
DECLARE
  r RECORD;
  v_policy_name text := 'tenant_active_company_guard';
BEGIN
  FOR r IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'company_id'
      AND t.table_type = 'BASE TABLE'
      -- exclui a própria tabela de vínculos (é user-scoped, não company-scoped)
      AND c.table_name <> 'settings_user_companies'
  LOOP
    -- remove policy anterior (idempotência)
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      v_policy_name, r.table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated '
      'USING (public.is_active_company(company_id)) '
      'WITH CHECK (public.is_active_company(company_id))',
      v_policy_name, r.table_name
    );
  END LOOP;
END $$;
