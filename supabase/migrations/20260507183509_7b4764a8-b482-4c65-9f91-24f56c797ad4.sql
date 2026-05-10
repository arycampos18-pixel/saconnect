
-- ============ Tabela: api_configuracoes_custo ============
CREATE TABLE public.api_configuracoes_custo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  nome TEXT NOT NULL,
  provedor TEXT,
  custo_centavos INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ativo',
  vigencia_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  vigencia_fim DATE,
  observacoes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_api_cfg_custo_company ON public.api_configuracoes_custo(company_id);
CREATE INDEX idx_api_cfg_custo_lookup ON public.api_configuracoes_custo(company_id, nome, status, vigencia_inicio, vigencia_fim);

ALTER TABLE public.api_configuracoes_custo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view costs in company" ON public.api_configuracoes_custo
FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "manage costs admins" ON public.api_configuracoes_custo
FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()) OR public.user_has_permission(auth.uid(), company_id, 'configuracoes.manage'))
WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_has_permission(auth.uid(), company_id, 'configuracoes.manage'));

CREATE TRIGGER trg_api_cfg_custo_updated
BEFORE UPDATE ON public.api_configuracoes_custo
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_api_cfg_custo_company
BEFORE INSERT ON public.api_configuracoes_custo
FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

-- ============ Tabela: api_consultas_custos ============
CREATE TABLE public.api_consultas_custos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  api_configuracao_id UUID REFERENCES public.api_configuracoes_custo(id) ON DELETE SET NULL,
  api_nome TEXT NOT NULL,
  eleitor_id UUID,
  lideranca_id UUID,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'sucesso',
  custo_unitario_centavos INTEGER NOT NULL DEFAULT 0,
  quantidade INTEGER NOT NULL DEFAULT 1,
  custo_total_centavos INTEGER NOT NULL DEFAULT 0,
  erro TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_api_cons_custos_company_data ON public.api_consultas_custos(company_id, created_at DESC);
CREATE INDEX idx_api_cons_custos_eleitor ON public.api_consultas_custos(eleitor_id);
CREATE INDEX idx_api_cons_custos_lideranca ON public.api_consultas_custos(lideranca_id);
CREATE INDEX idx_api_cons_custos_user ON public.api_consultas_custos(user_id);

ALTER TABLE public.api_consultas_custos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view consults in company" ON public.api_consultas_custos
FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "insert consults in company" ON public.api_consultas_custos
FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

CREATE TRIGGER trg_api_cons_custos_company
BEFORE INSERT ON public.api_consultas_custos
FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

-- ============ Imutabilidade do custo após gravado ============
CREATE OR REPLACE FUNCTION public.api_consultas_custos_imutavel()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Calcula custo_total no momento do insert se não veio
    IF NEW.custo_total_centavos IS NULL OR NEW.custo_total_centavos = 0 THEN
      NEW.custo_total_centavos := COALESCE(NEW.custo_unitario_centavos,0) * COALESCE(NEW.quantidade,1);
    END IF;
    RETURN NEW;
  END IF;
  -- UPDATE: bloqueia alteração de campos financeiros e identificação
  NEW.custo_unitario_centavos := OLD.custo_unitario_centavos;
  NEW.custo_total_centavos := OLD.custo_total_centavos;
  NEW.quantidade := OLD.quantidade;
  NEW.api_configuracao_id := OLD.api_configuracao_id;
  NEW.api_nome := OLD.api_nome;
  NEW.eleitor_id := OLD.eleitor_id;
  NEW.lideranca_id := OLD.lideranca_id;
  NEW.user_id := OLD.user_id;
  NEW.created_at := OLD.created_at;
  NEW.company_id := OLD.company_id;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_api_cons_custos_imutavel
BEFORE INSERT OR UPDATE ON public.api_consultas_custos
FOR EACH ROW EXECUTE FUNCTION public.api_consultas_custos_imutavel();

-- ============ Função auxiliar: registrar consulta ============
CREATE OR REPLACE FUNCTION public.api_registrar_consulta_custo(
  _api_nome TEXT,
  _eleitor_id UUID DEFAULT NULL,
  _lideranca_id UUID DEFAULT NULL,
  _status TEXT DEFAULT 'sucesso',
  _quantidade INTEGER DEFAULT 1,
  _erro TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_company UUID := public.user_default_company(auth.uid());
  v_cfg RECORD;
  v_id UUID;
BEGIN
  SELECT * INTO v_cfg FROM public.api_configuracoes_custo
  WHERE company_id = v_company
    AND lower(nome) = lower(_api_nome)
    AND status = 'ativo'
    AND vigencia_inicio <= CURRENT_DATE
    AND (vigencia_fim IS NULL OR vigencia_fim >= CURRENT_DATE)
  ORDER BY vigencia_inicio DESC
  LIMIT 1;

  INSERT INTO public.api_consultas_custos (
    company_id, api_configuracao_id, api_nome, eleitor_id, lideranca_id, user_id,
    status, custo_unitario_centavos, quantidade, custo_total_centavos, erro, metadata
  ) VALUES (
    v_company, v_cfg.id, _api_nome, _eleitor_id, _lideranca_id, auth.uid(),
    _status, COALESCE(v_cfg.custo_centavos, 0), _quantidade,
    COALESCE(v_cfg.custo_centavos,0) * _quantidade, _erro, _metadata
  ) RETURNING id INTO v_id;

  RETURN v_id;
END $$;
