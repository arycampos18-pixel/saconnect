
-- 1. Tabela user_permissions
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  can_create_liderancas boolean NOT NULL DEFAULT false,
  can_create_cabos boolean NOT NULL DEFAULT false,
  can_create_departamentos boolean NOT NULL DEFAULT false,
  can_create_categorias boolean NOT NULL DEFAULT false,
  can_create_tags boolean NOT NULL DEFAULT false,
  can_create_all boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_permissions_select_own" ON public.user_permissions;
CREATE POLICY "user_permissions_select_own" ON public.user_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "user_permissions_admin_write" ON public.user_permissions;
CREATE POLICY "user_permissions_admin_write" ON public.user_permissions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_user_permissions_upd ON public.user_permissions;
CREATE TRIGGER trg_user_permissions_upd BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Função can_user_create
CREATE OR REPLACE FUNCTION public.can_user_create(_user uuid, _campo text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_permissions up
      WHERE up.user_id = _user
        AND (
          up.can_create_all
          OR (_campo = 'liderancas'    AND up.can_create_liderancas)
          OR (_campo = 'cabos'         AND up.can_create_cabos)
          OR (_campo = 'departamentos' AND up.can_create_departamentos)
          OR (_campo = 'categorias'    AND up.can_create_categorias)
          OR (_campo = 'tags'          AND up.can_create_tags)
        )
    );
$$;

-- 3. Garantir created_by
ALTER TABLE public.liderancas       ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.cabos_eleitorais ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.departamentos    ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.ticket_categories ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.tags             ADD COLUMN IF NOT EXISTS created_by uuid;

-- 4. Policies de INSERT (substituem as restritas a admin)
DROP POLICY IF EXISTS "Admins criam lideranças" ON public.liderancas;
CREATE POLICY "Usuarios autorizados criam liderancas" ON public.liderancas
  FOR INSERT TO authenticated
  WITH CHECK (public.can_user_create(auth.uid(), 'liderancas'));

DROP POLICY IF EXISTS "Admins criam cabos" ON public.cabos_eleitorais;
CREATE POLICY "Usuarios autorizados criam cabos" ON public.cabos_eleitorais
  FOR INSERT TO authenticated
  WITH CHECK (public.can_user_create(auth.uid(), 'cabos'));

DROP POLICY IF EXISTS "Admins criam departamentos" ON public.departamentos;
DROP POLICY IF EXISTS "departamentos_admin_insert" ON public.departamentos;
CREATE POLICY "Usuarios autorizados criam departamentos" ON public.departamentos
  FOR INSERT TO authenticated
  WITH CHECK (public.can_user_create(auth.uid(), 'departamentos'));

DROP POLICY IF EXISTS "ticket_categories_admin_insert" ON public.ticket_categories;
DROP POLICY IF EXISTS "Admins criam categorias" ON public.ticket_categories;
CREATE POLICY "Usuarios autorizados criam categorias" ON public.ticket_categories
  FOR INSERT TO authenticated
  WITH CHECK (public.can_user_create(auth.uid(), 'categorias'));

DROP POLICY IF EXISTS "tags_admin_insert" ON public.tags;
DROP POLICY IF EXISTS "Admins criam tags" ON public.tags;
CREATE POLICY "Usuarios autorizados criam tags" ON public.tags
  FOR INSERT TO authenticated
  WITH CHECK (public.can_user_create(auth.uid(), 'tags'));
