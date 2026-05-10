
CREATE OR REPLACE FUNCTION public.wa_bulk_registrar_status(
  _api_id UUID, _company_id UUID, _tipo TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- _tipo: 'entregue' | 'lido' | 'falha'
  INSERT INTO public.wa_bulk_metricas_diarias(company_id, api_id, data,
      total_entregues, total_lidos, total_erros)
    VALUES (_company_id, _api_id, CURRENT_DATE,
      CASE WHEN _tipo='entregue' THEN 1 ELSE 0 END,
      CASE WHEN _tipo='lido' THEN 1 ELSE 0 END,
      CASE WHEN _tipo='falha' THEN 1 ELSE 0 END)
    ON CONFLICT (company_id, api_id, data) DO UPDATE SET
      total_entregues = wa_bulk_metricas_diarias.total_entregues +
        CASE WHEN _tipo='entregue' THEN 1 ELSE 0 END,
      total_lidos = wa_bulk_metricas_diarias.total_lidos +
        CASE WHEN _tipo='lido' THEN 1 ELSE 0 END,
      total_erros = wa_bulk_metricas_diarias.total_erros +
        CASE WHEN _tipo='falha' THEN 1 ELSE 0 END;
END $$;
