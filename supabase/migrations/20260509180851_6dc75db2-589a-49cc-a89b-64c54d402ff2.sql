
-- 1) Diversificação: evitar repetir a última API usada nos últimos 60s
CREATE OR REPLACE FUNCTION public.wa_bulk_selecionar_api(_company_id uuid)
 RETURNS wa_bulk_apis
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cfg public.wa_bulk_config;
  v_api public.wa_bulk_apis;
  v_last_api uuid;
BEGIN
  SELECT * INTO v_cfg FROM public.wa_bulk_config WHERE company_id = _company_id LIMIT 1;

  -- Última API usada nos últimos 60s
  SELECT id INTO v_last_api FROM public.wa_bulk_apis
   WHERE company_id = _company_id
     AND ultimo_envio IS NOT NULL
     AND ultimo_envio > now() - interval '60 seconds'
   ORDER BY ultimo_envio DESC LIMIT 1;

  SELECT a.* INTO v_api FROM public.wa_bulk_apis a
  WHERE a.company_id = _company_id
    AND a.status IN ('ativo','em_aquecimento')
    AND a.saude > 50
    AND (a.cooldown_ate IS NULL OR a.cooldown_ate <= now())
    AND a.msgs_enviadas_hoje < public.wa_bulk_limite_diario_efetivo(a, v_cfg)
    AND (v_last_api IS NULL OR a.id <> v_last_api)
  ORDER BY (a.msgs_enviadas_hoje::numeric / NULLIF(public.wa_bulk_limite_diario_efetivo(a, v_cfg), 0)) ASC,
           COALESCE(a.ultimo_envio, 'epoch'::timestamptz) ASC
  LIMIT 1;

  -- Fallback: se não houver outra disponível, permite a mesma
  IF v_api.id IS NULL THEN
    SELECT a.* INTO v_api FROM public.wa_bulk_apis a
    WHERE a.company_id = _company_id
      AND a.status IN ('ativo','em_aquecimento')
      AND a.saude > 50
      AND (a.cooldown_ate IS NULL OR a.cooldown_ate <= now())
      AND a.msgs_enviadas_hoje < public.wa_bulk_limite_diario_efetivo(a, v_cfg)
    ORDER BY (a.msgs_enviadas_hoje::numeric / NULLIF(public.wa_bulk_limite_diario_efetivo(a, v_cfg), 0)) ASC,
             COALESCE(a.ultimo_envio, 'epoch'::timestamptz) ASC
    LIMIT 1;
  END IF;

  RETURN v_api;
END $function$;

-- 2) Limite por número/dia: bloqueia inserção/atualização para 'pendente' se já atingiu o limite
CREATE OR REPLACE FUNCTION public.wa_bulk_fila_bloquear_excesso_mesmo_numero()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cfg public.wa_bulk_config;
  v_max integer;
  v_count integer;
  v_digits text;
BEGIN
  IF NEW.status <> 'pendente' THEN RETURN NEW; END IF;

  SELECT * INTO v_cfg FROM public.wa_bulk_config WHERE company_id = NEW.company_id LIMIT 1;
  v_max := COALESCE(v_cfg.max_msgs_mesmo_numero_dia, 3);
  IF v_max <= 0 THEN RETURN NEW; END IF;

  v_digits := regexp_replace(COALESCE(NEW.destinatario_telefone,''), '\D', '', 'g');
  IF length(v_digits) < 8 THEN RETURN NEW; END IF;

  SELECT count(*) INTO v_count
    FROM public.wa_bulk_fila_envios
   WHERE company_id = NEW.company_id
     AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
     AND status IN ('enviado','entregue','lido','enviando')
     AND regexp_replace(COALESCE(destinatario_telefone,''), '\D', '', 'g') = v_digits
     AND COALESCE(enviado_em, created_at) >= date_trunc('day', now());

  IF v_count >= v_max THEN
    NEW.status := 'cancelado';
    NEW.erro_mensagem := 'Limite diário do mesmo número atingido (' || v_max || ')';
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_wa_bulk_fila_max_mesmo_numero ON public.wa_bulk_fila_envios;
CREATE TRIGGER trg_wa_bulk_fila_max_mesmo_numero
  BEFORE INSERT OR UPDATE OF status ON public.wa_bulk_fila_envios
  FOR EACH ROW EXECUTE FUNCTION public.wa_bulk_fila_bloquear_excesso_mesmo_numero();

-- 3) Monitor de saúde: pausa APIs ruins e notifica admins
CREATE OR REPLACE FUNCTION public.wa_bulk_monitorar_apis()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  v_taxa numeric;
  v_motivo text;
  v_pausadas integer := 0;
  v_admin uuid;
BEGIN
  FOR r IN
    SELECT * FROM public.wa_bulk_apis
     WHERE status IN ('ativo','em_aquecimento')
  LOOP
    v_motivo := NULL;
    v_taxa := CASE WHEN r.total_enviadas > 0
                   THEN (r.total_erros::numeric / r.total_enviadas::numeric) * 100
                   ELSE 0 END;

    -- recalcula saúde
    UPDATE public.wa_bulk_apis SET saude = public.wa_bulk_calcular_saude(r.id) WHERE id = r.id;

    IF v_taxa > 5 AND r.total_enviadas >= 20 THEN
      v_motivo := 'Taxa de erro alta: ' || round(v_taxa, 1) || '%';
    ELSIF (SELECT saude FROM public.wa_bulk_apis WHERE id = r.id) < 50 THEN
      v_motivo := 'Saúde abaixo de 50';
    ELSIF r.erros_consecutivos >= 5 THEN
      v_motivo := 'Erros consecutivos: ' || r.erros_consecutivos;
    END IF;

    IF v_motivo IS NOT NULL THEN
      UPDATE public.wa_bulk_apis
         SET status = 'pausada',
             ultimo_erro = COALESCE(v_motivo, ultimo_erro)
       WHERE id = r.id;
      v_pausadas := v_pausadas + 1;

      FOR v_admin IN
        SELECT uc.user_id
          FROM public.settings_user_companies uc
          JOIN public.settings_profiles p ON p.id = uc.profile_id
         WHERE uc.company_id = r.company_id
           AND uc.status = 'active'
           AND p.nome IN ('Admin','Super Admin')
      LOOP
        INSERT INTO public.notifications (user_id, titulo, mensagem, tipo, link, metadata)
        VALUES (
          v_admin,
          'API WhatsApp pausada automaticamente ⚠️',
          'A API "' || r.nome || '" foi pausada. Motivo: ' || v_motivo,
          'warning',
          '/app/whatsapp-bulk/apis',
          jsonb_build_object('api_id', r.id, 'motivo', v_motivo)
        );
      END LOOP;
    END IF;
  END LOOP;

  RETURN v_pausadas;
END $function$;
