-- Variante que aceita company_id explícito (para uso no worker, que roda sem auth.uid())
CREATE OR REPLACE FUNCTION public.analise_provedor_uso_company(_company_id uuid, _provedor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lim public.analise_provedor_limites;
  v_gasto_mes integer := 0;
  v_consultas_mes integer := 0;
  v_consultas_dia integer := 0;
  v_inicio_mes timestamptz := date_trunc('month', now());
  v_inicio_dia timestamptz := date_trunc('day', now());
BEGIN
  SELECT * INTO v_lim FROM public.analise_provedor_limites
   WHERE company_id = _company_id AND provedor = _provedor LIMIT 1;

  SELECT COALESCE(SUM(custo_centavos),0), COUNT(*) INTO v_gasto_mes, v_consultas_mes
    FROM public.analise_api_consultas
   WHERE company_id = _company_id
     AND provedor ILIKE '%' || _provedor || '%'
     AND created_at >= v_inicio_mes;

  SELECT COUNT(*) INTO v_consultas_dia
    FROM public.analise_api_consultas
   WHERE company_id = _company_id
     AND provedor ILIKE '%' || _provedor || '%'
     AND created_at >= v_inicio_dia;

  RETURN jsonb_build_object(
    'company_id', _company_id,
    'provedor', _provedor,
    'ativo', COALESCE(v_lim.ativo, false),
    'orcamento_mensal_centavos', COALESCE(v_lim.orcamento_mensal_centavos, 0),
    'cota_diaria_consultas', COALESCE(v_lim.cota_diaria_consultas, 0),
    'cota_mensal_consultas', COALESCE(v_lim.cota_mensal_consultas, 0),
    'gasto_mes_centavos', v_gasto_mes,
    'consultas_mes', v_consultas_mes,
    'consultas_dia', v_consultas_dia,
    'bloqueado_orcamento', (
      COALESCE(v_lim.ativo, false)
      AND COALESCE(v_lim.orcamento_mensal_centavos, 0) > 0
      AND v_gasto_mes >= v_lim.orcamento_mensal_centavos
    ),
    'bloqueado_cota', (
      COALESCE(v_lim.ativo, false)
      AND COALESCE(v_lim.cota_diaria_consultas, 0) > 0
      AND v_consultas_dia >= v_lim.cota_diaria_consultas
    ),
    'bloqueado_cota_mensal', (
      COALESCE(v_lim.ativo, false)
      AND COALESCE(v_lim.cota_mensal_consultas, 0) > 0
      AND v_consultas_mes >= v_lim.cota_mensal_consultas
    )
  );
END $$;

REVOKE ALL ON FUNCTION public.analise_provedor_uso_company(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analise_provedor_uso_company(uuid, text) TO service_role;