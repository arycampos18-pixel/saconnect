
-- Add WITH CHECK to UPDATE policies and explicit DELETE policies scoped to active company

-- lgpd_consentimentos: UPDATE
DROP POLICY IF EXISTS lgpd_cons_update ON public.lgpd_consentimentos;
CREATE POLICY lgpd_cons_update ON public.lgpd_consentimentos
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND public.is_active_company(company_id))
  WITH CHECK (auth.uid() IS NOT NULL AND public.is_active_company(company_id));

-- lgpd_consentimentos: DELETE
DROP POLICY IF EXISTS lgpd_cons_delete ON public.lgpd_consentimentos;
CREATE POLICY lgpd_cons_delete ON public.lgpd_consentimentos
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND public.is_active_company(company_id)
    AND (
      public.is_super_admin(auth.uid())
      OR public.user_has_permission(auth.uid(), company_id, 'lgpd.gerenciar')
    )
  );

-- lgpd_solicitacoes: UPDATE
DROP POLICY IF EXISTS lgpd_sol_update ON public.lgpd_solicitacoes;
CREATE POLICY lgpd_sol_update ON public.lgpd_solicitacoes
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND public.is_active_company(company_id)
    AND (
      public.is_super_admin(auth.uid())
      OR public.user_has_permission(auth.uid(), company_id, 'lgpd.gerenciar')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.is_active_company(company_id)
    AND (
      public.is_super_admin(auth.uid())
      OR public.user_has_permission(auth.uid(), company_id, 'lgpd.gerenciar')
    )
  );

-- lgpd_solicitacoes: DELETE
DROP POLICY IF EXISTS lgpd_sol_delete ON public.lgpd_solicitacoes;
CREATE POLICY lgpd_sol_delete ON public.lgpd_solicitacoes
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND public.is_active_company(company_id)
    AND (
      public.is_super_admin(auth.uid())
      OR public.user_has_permission(auth.uid(), company_id, 'lgpd.gerenciar')
    )
  );
