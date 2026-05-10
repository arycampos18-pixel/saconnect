
CREATE TABLE IF NOT EXISTS public.evento_tipos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS evento_tipos_nome_unique_ci ON public.evento_tipos (lower(nome));

INSERT INTO public.evento_tipos (nome)
SELECT v FROM (VALUES ('Saúde'), ('Educação'), ('Assistência'), ('Jurídico'), ('Cursos')) AS t(v)
WHERE NOT EXISTS (SELECT 1 FROM public.evento_tipos et WHERE lower(et.nome) = lower(t.v));

ALTER TABLE public.eventos ALTER COLUMN tipo TYPE text USING tipo::text;
DROP TYPE IF EXISTS public.evento_tipo;

ALTER TABLE public.evento_tipos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "evento_tipos_select_auth" ON public.evento_tipos;
CREATE POLICY "evento_tipos_select_auth" ON public.evento_tipos
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "evento_tipos_insert_autorizados" ON public.evento_tipos;
CREATE POLICY "evento_tipos_insert_autorizados" ON public.evento_tipos
  FOR INSERT TO authenticated
  WITH CHECK (public.can_user_create(auth.uid(), 'tipos_evento'));

DROP POLICY IF EXISTS "evento_tipos_admin_update" ON public.evento_tipos;
CREATE POLICY "evento_tipos_admin_update" ON public.evento_tipos
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "evento_tipos_admin_delete" ON public.evento_tipos;
CREATE POLICY "evento_tipos_admin_delete" ON public.evento_tipos
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.user_permissions
  ADD COLUMN IF NOT EXISTS can_create_tipos_evento boolean NOT NULL DEFAULT false;

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
          OR (_campo = 'tipos_evento'  AND up.can_create_tipos_evento)
        )
    );
$$;
