-- Limites de consumo por provedor (orçamento mensal + cota diária)
CREATE TABLE IF NOT EXISTS public.analise_provedor_limites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  provedor text NOT NULL,
  orcamento_mensal_centavos integer NOT NULL DEFAULT 0,
  cota_diaria_consultas integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  alerta_80_enviado_mes text,
  alerta_100_enviado_mes text,
  alerta_80_enviado_dia date,
  alerta_100_enviado_dia date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, provedor)
);

ALTER TABLE public.analise_provedor_limites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "limites_select" ON public.analise_provedor_limites
  FOR SELECT USING (
    public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id)
  );

CREATE POLICY "limites_upsert" ON public.analise_provedor_limites
  FOR INSERT WITH CHECK (
    public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id)
  );

CREATE POLICY "limites_update" ON public.analise_provedor_limites
  FOR UPDATE USING (
    public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id)
  );

CREATE TRIGGER trg_limites_company BEFORE INSERT ON public.analise_provedor_limites
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

CREATE TRIGGER trg_limites_updated BEFORE UPDATE ON public.analise_provedor_limites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função: retorna uso atual + limites + se está bloqueado
CREATE OR REPLACE FUNCTION public.analise_provedor_uso(_provedor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company uuid := public.current_active_company();
  v_lim public.analise_provedor_limites;
  v_gasto_mes integer := 0;
  v_consultas_mes integer := 0;
  v_consultas_dia integer := 0;
  v_inicio_mes timestamptz := date_trunc('month', now());
  v_inicio_dia timestamptz := date_trunc('day', now());
BEGIN
  SELECT * INTO v_lim FROM public.analise_provedor_limites
   WHERE company_id = v_company AND provedor = _provedor LIMIT 1;

  SELECT COALESCE(SUM(custo_centavos),0), COUNT(*) INTO v_gasto_mes, v_consultas_mes
    FROM public.analise_api_consultas
   WHERE company_id = v_company
     AND provedor ILIKE '%' || _provedor || '%'
     AND created_at >= v_inicio_mes;

  SELECT COUNT(*) INTO v_consultas_dia
    FROM public.analise_api_consultas
   WHERE company_id = v_company
     AND provedor ILIKE '%' || _provedor || '%'
     AND created_at >= v_inicio_dia;

  RETURN jsonb_build_object(
    'company_id', v_company,
    'provedor', _provedor,
    'ativo', COALESCE(v_lim.ativo, false),
    'orcamento_mensal_centavos', COALESCE(v_lim.orcamento_mensal_centavos, 0),
    'cota_diaria_consultas', COALESCE(v_lim.cota_diaria_consultas, 0),
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
    )
  );
END $$;