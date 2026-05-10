
-- ============================================================
-- 1) Fix search_path on remaining functions
-- ============================================================
ALTER FUNCTION public.mask_cpf(text) SET search_path = public;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND p.proname='update_eleitor_last_interaction') THEN
    EXECUTE 'ALTER FUNCTION public.update_eleitor_last_interaction() SET search_path = public';
  END IF;
END $$;

-- ============================================================
-- 2) Lock down SECURITY DEFINER function execution
-- ============================================================
-- Revoke from PUBLIC/anon/authenticated on every SECURITY DEFINER function in public
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
  END LOOP;
END $$;

-- Re-grant to authenticated for helpers used inside RLS / app code
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_active_company() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_company(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_default_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_permission(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_create(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_active_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lgpd_pode_exportar(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lgpd_pode_ver_cpf(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lgpd_registrar_consentimento(uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lgpd_revogar_consentimento(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analise_feature_ativa(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analise_cache_obter(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mask_cpf(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pesquisa_ja_respondeu(uuid, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.template_registrar_uso(uuid) TO authenticated;

-- Public-form RPCs: keep accessible to anon + authenticated
GRANT EXECUTE ON FUNCTION public.public_submit_eleitor(text, text, text, text, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_submit_cabo_link(text, text, text, text, text, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_submit_department_qrcode(text, text, text, jsonb, text, text, date, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_get_cabo_link(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_get_department_qrcode(text) TO anon, authenticated;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND p.proname='public_get_formulario_by_token') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.public_get_formulario_by_token(text) TO anon, authenticated';
  END IF;
END $$;

-- ============================================================
-- 3) RLS policies for tables with RLS enabled but no policies
-- ============================================================
-- materiais_estoque
DROP POLICY IF EXISTS materiais_estoque_select ON public.materiais_estoque;
DROP POLICY IF EXISTS materiais_estoque_modify ON public.materiais_estoque;
CREATE POLICY materiais_estoque_select ON public.materiais_estoque
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY materiais_estoque_modify ON public.materiais_estoque
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- materiais_distribuicao
DROP POLICY IF EXISTS materiais_distribuicao_select ON public.materiais_distribuicao;
DROP POLICY IF EXISTS materiais_distribuicao_modify ON public.materiais_distribuicao;
CREATE POLICY materiais_distribuicao_select ON public.materiais_distribuicao
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY materiais_distribuicao_modify ON public.materiais_distribuicao
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
