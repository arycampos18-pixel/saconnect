
-- Limite diário efetivo (considera aquecimento)
CREATE OR REPLACE FUNCTION public.wa_bulk_limite_diario_efetivo(
  _api public.wa_bulk_apis,
  _cfg public.wa_bulk_config
) RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_dias integer;
  v_lim_padrao integer := COALESCE(_cfg.msgs_limite_diario_padrao, 500);
  v_lim_api integer := COALESCE(_api.msgs_limite_diario, v_lim_padrao);
  v_warm integer;
BEGIN
  IF _api.status = 'em_aquecimento' AND COALESCE(_cfg.aquecimento_ativo, false) THEN
    v_dias := GREATEST(1, (CURRENT_DATE - COALESCE(_api.iniciado_em, CURRENT_DATE)) + 1);
    v_warm := CASE
      WHEN v_dias <= 7  THEN COALESCE(_cfg.aquecimento_dia_1_7,   50)
      WHEN v_dias <= 14 THEN COALESCE(_cfg.aquecimento_dia_8_14, 150)
      WHEN v_dias <= 21 THEN COALESCE(_cfg.aquecimento_dia_15_21, 300)
      ELSE                   COALESCE(_cfg.aquecimento_dia_22_plus, v_lim_api)
    END;
    RETURN LEAST(v_warm, v_lim_api);
  END IF;
  RETURN v_lim_api;
END $$;

-- Atualiza seletor para usar limite efetivo
CREATE OR REPLACE FUNCTION public.wa_bulk_selecionar_api(_company_id uuid)
RETURNS public.wa_bulk_apis
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cfg public.wa_bulk_config;
  v_api public.wa_bulk_apis;
BEGIN
  SELECT * INTO v_cfg FROM public.wa_bulk_config WHERE company_id = _company_id LIMIT 1;

  SELECT a.* INTO v_api FROM public.wa_bulk_apis a
  WHERE a.company_id = _company_id
    AND a.status IN ('ativo','em_aquecimento')
    AND a.saude > 50
    AND (a.cooldown_ate IS NULL OR a.cooldown_ate <= now())
    AND a.msgs_enviadas_hoje < public.wa_bulk_limite_diario_efetivo(a, v_cfg)
  ORDER BY (a.msgs_enviadas_hoje::numeric / NULLIF(public.wa_bulk_limite_diario_efetivo(a, v_cfg), 0)) ASC,
           COALESCE(a.ultimo_envio, 'epoch'::timestamptz) ASC
  LIMIT 1;
  RETURN v_api;
END $$;

-- Info de aquecimento para UI
CREATE OR REPLACE FUNCTION public.wa_bulk_aquecimento_info(_api_id uuid)
RETURNS TABLE(api_id uuid, em_aquecimento boolean, dias integer, fase text, limite_efetivo integer, limite_normal integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_api public.wa_bulk_apis; v_cfg public.wa_bulk_config; v_dias integer; v_fase text;
BEGIN
  SELECT * INTO v_api FROM public.wa_bulk_apis WHERE id = _api_id;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO v_cfg FROM public.wa_bulk_config WHERE company_id = v_api.company_id LIMIT 1;
  v_dias := GREATEST(1, (CURRENT_DATE - COALESCE(v_api.iniciado_em, CURRENT_DATE)) + 1);
  v_fase := CASE
    WHEN v_dias <= 7  THEN 'Dia 1-7'
    WHEN v_dias <= 14 THEN 'Dia 8-14'
    WHEN v_dias <= 21 THEN 'Dia 15-21'
    ELSE 'Concluído (22+)'
  END;
  RETURN QUERY SELECT
    v_api.id,
    (v_api.status = 'em_aquecimento' AND COALESCE(v_cfg.aquecimento_ativo, false)),
    v_dias,
    v_fase,
    public.wa_bulk_limite_diario_efetivo(v_api, v_cfg),
    COALESCE(v_api.msgs_limite_diario, COALESCE(v_cfg.msgs_limite_diario_padrao, 500));
END $$;

-- Promove APIs em aquecimento para ativo após 22 dias
CREATE OR REPLACE FUNCTION public.wa_bulk_aquecimento_promover()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.wa_bulk_apis
    SET status = 'ativo'
    WHERE status = 'em_aquecimento'
      AND (CURRENT_DATE - COALESCE(iniciado_em, CURRENT_DATE)) >= 21;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;
