
-- ============================================================
-- 1) CONFIG GLOBAL POR EMPRESA (fallback)
-- ============================================================
CREATE TABLE public.wa_bulk_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  -- limites
  msgs_limite_diario_padrao INTEGER NOT NULL DEFAULT 500,
  msgs_limite_horario_padrao INTEGER NOT NULL DEFAULT 50,
  intervalo_min_ms INTEGER NOT NULL DEFAULT 8000,
  intervalo_max_ms INTEGER NOT NULL DEFAULT 15000,
  -- horário
  horario_inicio TIME NOT NULL DEFAULT '08:00',
  horario_fim TIME NOT NULL DEFAULT '20:00',
  dias_permitidos INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6],
  -- aquecimento (escalonado por dias de vida da API)
  aquecimento_ativo BOOLEAN NOT NULL DEFAULT TRUE,
  aquecimento_dia_1_7 INTEGER NOT NULL DEFAULT 50,
  aquecimento_dia_8_14 INTEGER NOT NULL DEFAULT 100,
  aquecimento_dia_15_21 INTEGER NOT NULL DEFAULT 250,
  aquecimento_dia_22_plus INTEGER NOT NULL DEFAULT 500,
  -- proteção
  taxa_erro_max_pct NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  cooldown_apos_erro_ms INTEGER NOT NULL DEFAULT 60000,
  cooldown_apos_3_erros_ms INTEGER NOT NULL DEFAULT 1800000,
  cooldown_apos_warning_ms INTEGER NOT NULL DEFAULT 3600000,
  max_msgs_mesmo_numero_dia INTEGER NOT NULL DEFAULT 3,
  max_tentativas INTEGER NOT NULL DEFAULT 3,
  -- meta diária da empresa (informativo, não bloqueia)
  meta_diaria_total INTEGER NOT NULL DEFAULT 10000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_bulk_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_bulk_config_select" ON public.wa_bulk_config FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "wa_bulk_config_write" ON public.wa_bulk_config FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));
CREATE TRIGGER trg_wa_bulk_config_set_company BEFORE INSERT ON public.wa_bulk_config
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_wa_bulk_config_updated BEFORE UPDATE ON public.wa_bulk_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2) APIs (cada número/conexão WhatsApp Business)
-- ============================================================
CREATE TABLE public.wa_bulk_apis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  numero_telefone TEXT NOT NULL,
  display_name TEXT,
  -- credenciais Meta
  access_token TEXT NOT NULL,
  business_account_id TEXT,
  phone_number_id TEXT NOT NULL,
  waba_id TEXT,
  app_id TEXT,
  -- status
  status TEXT NOT NULL DEFAULT 'ativo',
    -- 'ativo' | 'inativo' | 'pausada' | 'bloqueada' | 'limite_atingido' | 'em_aquecimento'
  saude INTEGER NOT NULL DEFAULT 100,
  -- contadores
  msgs_enviadas_hoje INTEGER NOT NULL DEFAULT 0,
  msgs_enviadas_hora INTEGER NOT NULL DEFAULT 0,
  total_enviadas BIGINT NOT NULL DEFAULT 0,
  total_erros BIGINT NOT NULL DEFAULT 0,
  erros_consecutivos INTEGER NOT NULL DEFAULT 0,
  taxa_entrega NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  -- limites por-API (NULL = usa fallback de wa_bulk_config)
  msgs_limite_diario INTEGER,
  msgs_limite_horario INTEGER,
  intervalo_min_ms INTEGER,
  intervalo_max_ms INTEGER,
  -- aquecimento
  iniciado_em DATE NOT NULL DEFAULT CURRENT_DATE,
  -- cooldown
  cooldown_ate TIMESTAMPTZ,
  ultimo_erro TEXT,
  ultimo_envio TIMESTAMPTZ,
  warning_meta BOOLEAN NOT NULL DEFAULT FALSE,
  restrito BOOLEAN NOT NULL DEFAULT FALSE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wa_bulk_apis_saude_chk CHECK (saude BETWEEN 0 AND 100),
  CONSTRAINT wa_bulk_apis_status_chk CHECK (status IN ('ativo','inativo','pausada','bloqueada','limite_atingido','em_aquecimento')),
  CONSTRAINT wa_bulk_apis_unique UNIQUE (company_id, phone_number_id)
);
CREATE INDEX idx_wa_bulk_apis_company ON public.wa_bulk_apis(company_id);
CREATE INDEX idx_wa_bulk_apis_status ON public.wa_bulk_apis(status);

ALTER TABLE public.wa_bulk_apis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_bulk_apis_select" ON public.wa_bulk_apis FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "wa_bulk_apis_write" ON public.wa_bulk_apis FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));
CREATE TRIGGER trg_wa_bulk_apis_set_company BEFORE INSERT ON public.wa_bulk_apis
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_wa_bulk_apis_updated BEFORE UPDATE ON public.wa_bulk_apis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3) TEMPLATES
-- ============================================================
CREATE TABLE public.wa_bulk_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  api_id UUID REFERENCES public.wa_bulk_apis(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'UTILITY',
  idioma TEXT NOT NULL DEFAULT 'pt_BR',
  status TEXT NOT NULL DEFAULT 'pendente',
  header_type TEXT,
  header_content TEXT,
  body_text TEXT NOT NULL,
  footer_text TEXT,
  botoes JSONB,
  variaveis JSONB,
  meta_template_id TEXT,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wa_bulk_tpl_cat_chk CHECK (categoria IN ('UTILITY','MARKETING','AUTHENTICATION')),
  CONSTRAINT wa_bulk_tpl_status_chk CHECK (status IN ('aprovado','pendente','rejeitado'))
);
CREATE INDEX idx_wa_bulk_tpl_company ON public.wa_bulk_templates(company_id);
CREATE INDEX idx_wa_bulk_tpl_status ON public.wa_bulk_templates(status);

ALTER TABLE public.wa_bulk_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_bulk_tpl_select" ON public.wa_bulk_templates FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "wa_bulk_tpl_write" ON public.wa_bulk_templates FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));
CREATE TRIGGER trg_wa_bulk_tpl_set_company BEFORE INSERT ON public.wa_bulk_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_wa_bulk_tpl_updated BEFORE UPDATE ON public.wa_bulk_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4) CAMPANHAS
-- ============================================================
CREATE TABLE public.wa_bulk_campanhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  template_id UUID REFERENCES public.wa_bulk_templates(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'rascunho',
  total_destinatarios INTEGER NOT NULL DEFAULT 0,
  total_enviados INTEGER NOT NULL DEFAULT 0,
  total_entregues INTEGER NOT NULL DEFAULT 0,
  total_lidos INTEGER NOT NULL DEFAULT 0,
  total_erros INTEGER NOT NULL DEFAULT 0,
  agendado_para TIMESTAMPTZ,
  iniciado_em TIMESTAMPTZ,
  concluido_em TIMESTAMPTZ,
  velocidade_envio INTEGER NOT NULL DEFAULT 500,
  criado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wa_bulk_camp_status_chk CHECK (status IN ('rascunho','agendada','em_andamento','pausada','concluida','cancelada'))
);
CREATE INDEX idx_wa_bulk_camp_company ON public.wa_bulk_campanhas(company_id);
CREATE INDEX idx_wa_bulk_camp_status ON public.wa_bulk_campanhas(status);

ALTER TABLE public.wa_bulk_campanhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_bulk_camp_select" ON public.wa_bulk_campanhas FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "wa_bulk_camp_write" ON public.wa_bulk_campanhas FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));
CREATE TRIGGER trg_wa_bulk_camp_set_company BEFORE INSERT ON public.wa_bulk_campanhas
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_wa_bulk_camp_updated BEFORE UPDATE ON public.wa_bulk_campanhas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5) FILA DE ENVIOS
-- ============================================================
CREATE TABLE public.wa_bulk_fila_envios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  campanha_id UUID REFERENCES public.wa_bulk_campanhas(id) ON DELETE CASCADE,
  api_id UUID REFERENCES public.wa_bulk_apis(id) ON DELETE SET NULL,
  destinatario_telefone TEXT NOT NULL,
  destinatario_nome TEXT,
  template_id UUID REFERENCES public.wa_bulk_templates(id) ON DELETE SET NULL,
  variaveis JSONB,
  status TEXT NOT NULL DEFAULT 'pendente',
  tentativas INTEGER NOT NULL DEFAULT 0,
  max_tentativas INTEGER NOT NULL DEFAULT 3,
  message_id_meta TEXT,
  erro_mensagem TEXT,
  enviado_em TIMESTAMPTZ,
  entregue_em TIMESTAMPTZ,
  lido_em TIMESTAMPTZ,
  proximo_envio TIMESTAMPTZ NOT NULL DEFAULT now(),
  prioridade INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wa_bulk_fila_status_chk CHECK (status IN ('pendente','enviando','enviado','entregue','lido','erro','cancelado'))
);
CREATE INDEX idx_wa_bulk_fila_status ON public.wa_bulk_fila_envios(status);
CREATE INDEX idx_wa_bulk_fila_proximo ON public.wa_bulk_fila_envios(proximo_envio);
CREATE INDEX idx_wa_bulk_fila_api ON public.wa_bulk_fila_envios(api_id);
CREATE INDEX idx_wa_bulk_fila_camp ON public.wa_bulk_fila_envios(campanha_id);
CREATE INDEX idx_wa_bulk_fila_message ON public.wa_bulk_fila_envios(message_id_meta);

ALTER TABLE public.wa_bulk_fila_envios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_bulk_fila_select" ON public.wa_bulk_fila_envios FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "wa_bulk_fila_write" ON public.wa_bulk_fila_envios FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));
CREATE TRIGGER trg_wa_bulk_fila_set_company BEFORE INSERT ON public.wa_bulk_fila_envios
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_wa_bulk_fila_updated BEFORE UPDATE ON public.wa_bulk_fila_envios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 6) WEBHOOKS LOG
-- ============================================================
CREATE TABLE public.wa_bulk_webhooks_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  api_id UUID REFERENCES public.wa_bulk_apis(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  message_id TEXT,
  destinatario TEXT,
  payload JSONB,
  processado BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wa_bulk_wh_tipo ON public.wa_bulk_webhooks_log(tipo);
CREATE INDEX idx_wa_bulk_wh_proc ON public.wa_bulk_webhooks_log(processado);
CREATE INDEX idx_wa_bulk_wh_msg ON public.wa_bulk_webhooks_log(message_id);

ALTER TABLE public.wa_bulk_webhooks_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_bulk_wh_select" ON public.wa_bulk_webhooks_log FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

-- ============================================================
-- 7) MÉTRICAS DIÁRIAS
-- ============================================================
CREATE TABLE public.wa_bulk_metricas_diarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.settings_companies(id) ON DELETE CASCADE,
  api_id UUID REFERENCES public.wa_bulk_apis(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  total_enviados INTEGER NOT NULL DEFAULT 0,
  total_entregues INTEGER NOT NULL DEFAULT 0,
  total_lidos INTEGER NOT NULL DEFAULT 0,
  total_erros INTEGER NOT NULL DEFAULT 0,
  taxa_entrega NUMERIC(5,2) NOT NULL DEFAULT 0,
  taxa_leitura NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, api_id, data)
);
CREATE INDEX idx_wa_bulk_metricas_data ON public.wa_bulk_metricas_diarias(data);

ALTER TABLE public.wa_bulk_metricas_diarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_bulk_met_select" ON public.wa_bulk_metricas_diarias FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "wa_bulk_met_write" ON public.wa_bulk_metricas_diarias FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_belongs_to_company(auth.uid(), company_id));

-- ============================================================
-- 8) FUNÇÃO LOAD BALANCER
-- Seleciona a melhor API ativa: saúde > 50, dentro do limite diário, sem cooldown.
-- Retorna a com MENOR uso relativo (msgs_enviadas_hoje / limite efetivo).
-- ============================================================
CREATE OR REPLACE FUNCTION public.wa_bulk_selecionar_api(_company_id UUID)
RETURNS public.wa_bulk_apis
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg public.wa_bulk_config;
  v_api public.wa_bulk_apis;
BEGIN
  SELECT * INTO v_cfg FROM public.wa_bulk_config WHERE company_id = _company_id LIMIT 1;

  SELECT a.* INTO v_api FROM public.wa_bulk_apis a
  WHERE a.company_id = _company_id
    AND a.status = 'ativo'
    AND a.saude > 50
    AND (a.cooldown_ate IS NULL OR a.cooldown_ate <= now())
    AND a.msgs_enviadas_hoje < COALESCE(a.msgs_limite_diario, COALESCE(v_cfg.msgs_limite_diario_padrao, 500))
  ORDER BY (a.msgs_enviadas_hoje::numeric / NULLIF(COALESCE(a.msgs_limite_diario, COALESCE(v_cfg.msgs_limite_diario_padrao, 500)), 0)) ASC,
           COALESCE(a.ultimo_envio, 'epoch'::timestamptz) ASC
  LIMIT 1;
  RETURN v_api;
END;
$$;

-- ============================================================
-- 9) FUNÇÃO INCREMENTO ATÔMICO DE CONTADORES
-- ============================================================
CREATE OR REPLACE FUNCTION public.wa_bulk_registrar_envio(_api_id UUID, _sucesso BOOLEAN, _erro TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_company UUID;
BEGIN
  IF _sucesso THEN
    UPDATE public.wa_bulk_apis SET
      msgs_enviadas_hoje = msgs_enviadas_hoje + 1,
      msgs_enviadas_hora = msgs_enviadas_hora + 1,
      total_enviadas = total_enviadas + 1,
      erros_consecutivos = 0,
      ultimo_envio = now()
    WHERE id = _api_id RETURNING company_id INTO v_company;

    INSERT INTO public.wa_bulk_metricas_diarias(company_id, api_id, data, total_enviados)
      VALUES (v_company, _api_id, CURRENT_DATE, 1)
      ON CONFLICT (company_id, api_id, data)
      DO UPDATE SET total_enviados = wa_bulk_metricas_diarias.total_enviados + 1;
  ELSE
    UPDATE public.wa_bulk_apis SET
      total_erros = total_erros + 1,
      erros_consecutivos = erros_consecutivos + 1,
      ultimo_erro = _erro,
      ultimo_envio = now(),
      saude = GREATEST(0, saude - 5),
      cooldown_ate = CASE
        WHEN erros_consecutivos + 1 >= 3 THEN now() + interval '30 minutes'
        ELSE now() + interval '1 minute'
      END
    WHERE id = _api_id RETURNING company_id INTO v_company;

    INSERT INTO public.wa_bulk_metricas_diarias(company_id, api_id, data, total_erros)
      VALUES (v_company, _api_id, CURRENT_DATE, 1)
      ON CONFLICT (company_id, api_id, data)
      DO UPDATE SET total_erros = wa_bulk_metricas_diarias.total_erros + 1;
  END IF;
END;
$$;
