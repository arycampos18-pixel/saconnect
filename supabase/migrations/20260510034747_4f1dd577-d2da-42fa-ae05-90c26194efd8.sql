-- Substitui políticas de INSERT permissivas (WITH CHECK true) por checagem de empresa do usuário.

DROP POLICY IF EXISTS lgpd_cons_insert ON public.lgpd_consentimentos;
CREATE POLICY lgpd_cons_insert
  ON public.lgpd_consentimentos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.is_active_company(company_id)
  );

DROP POLICY IF EXISTS lgpd_sol_insert ON public.lgpd_solicitacoes;
CREATE POLICY lgpd_sol_insert
  ON public.lgpd_solicitacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.is_active_company(company_id)
  );