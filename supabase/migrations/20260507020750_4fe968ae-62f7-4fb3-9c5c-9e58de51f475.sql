
-- Trigger: notificar conquista de badge
CREATE OR REPLACE FUNCTION public.notificar_badge_conquistado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cabo RECORD;
  v_badge RECORD;
  v_lid_user UUID;
BEGIN
  SELECT c.user_id, c.nome, c.lideranca_id INTO v_cabo
    FROM public.cabos_eleitorais c WHERE c.id = NEW.cabo_eleitoral_id;
  SELECT b.nome, b.descricao INTO v_badge
    FROM public.badges_catalogo b WHERE b.id = NEW.badge_id;

  IF v_cabo.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, titulo, mensagem, tipo, link, metadata)
    VALUES (
      v_cabo.user_id,
      'Nova conquista! 🏆',
      'Você desbloqueou: ' || v_badge.nome,
      'success',
      '/app/political/meus-eleitores',
      jsonb_build_object('badge_id', NEW.badge_id, 'cabo_id', NEW.cabo_eleitoral_id)
    );
  END IF;

  IF v_cabo.lideranca_id IS NOT NULL THEN
    SELECT user_id INTO v_lid_user FROM public.liderancas WHERE id = v_cabo.lideranca_id;
    IF v_lid_user IS NOT NULL AND v_lid_user <> COALESCE(v_cabo.user_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
      INSERT INTO public.notifications (user_id, titulo, mensagem, tipo, link, metadata)
      VALUES (
        v_lid_user,
        'Cabo conquistou badge',
        v_cabo.nome || ' desbloqueou: ' || v_badge.nome,
        'info',
        '/app/political/metas-gamificacao',
        jsonb_build_object('badge_id', NEW.badge_id, 'cabo_id', NEW.cabo_eleitoral_id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_badge ON public.cabo_badges;
CREATE TRIGGER trg_notificar_badge
AFTER INSERT ON public.cabo_badges
FOR EACH ROW EXECUTE FUNCTION public.notificar_badge_conquistado();

-- Função para varredura de metas e geração de alertas
CREATE OR REPLACE FUNCTION public.gamificacao_verificar_metas()
RETURNS TABLE(meta_id UUID, alerta TEXT, notificados INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m RECORD;
  v_realizado INTEGER;
  v_pct INTEGER;
  v_dias_restantes INTEGER;
  v_alerta TEXT;
  v_titulo TEXT;
  v_msg TEXT;
  v_tipo TEXT;
  v_users UUID[];
  v_uid UUID;
  v_count INTEGER;
  v_dedupe_key TEXT;
BEGIN
  FOR m IN
    SELECT * FROM public.metas_captacao
    WHERE ativo = true
      AND data_inicio <= CURRENT_DATE
      AND data_fim >= CURRENT_DATE
  LOOP
    -- realizado
    IF m.cabo_eleitoral_id IS NOT NULL THEN
      SELECT count(*) INTO v_realizado FROM public.eleitores
      WHERE cabo_eleitoral_id = m.cabo_eleitoral_id
        AND created_at >= m.data_inicio::timestamptz
        AND created_at <= (m.data_fim + 1)::timestamptz;
    ELSE
      SELECT count(*) INTO v_realizado FROM public.eleitores
      WHERE lideranca_id = m.lideranca_id
        AND created_at >= m.data_inicio::timestamptz
        AND created_at <= (m.data_fim + 1)::timestamptz;
    END IF;

    v_pct := LEAST(100, ROUND((v_realizado::numeric / NULLIF(m.quantidade_alvo, 0)) * 100));
    v_dias_restantes := (m.data_fim - CURRENT_DATE);
    v_alerta := NULL;

    IF v_pct >= 100 THEN
      v_alerta := 'batida';
      v_titulo := 'Meta batida! 🎯';
      v_msg := 'Meta "' || m.titulo || '" atingiu 100% (' || v_realizado || '/' || m.quantidade_alvo || ').';
      v_tipo := 'success';
    ELSIF v_pct >= 75 AND v_pct < 100 THEN
      v_alerta := '75pct';
      v_titulo := 'Meta a 75%';
      v_msg := 'Faltam ' || (m.quantidade_alvo - v_realizado) || ' cadastros para concluir "' || m.titulo || '".';
      v_tipo := 'info';
    ELSIF v_pct >= 50 AND v_pct < 75 THEN
      v_alerta := '50pct';
      v_titulo := 'Meta na metade';
      v_msg := 'Você já está em ' || v_pct || '% da meta "' || m.titulo || '".';
      v_tipo := 'info';
    ELSIF v_dias_restantes <= 3 AND v_pct < 50 THEN
      v_alerta := 'atrasada';
      v_titulo := 'Meta em risco ⚠️';
      v_msg := 'Restam ' || v_dias_restantes || ' dia(s) e a meta "' || m.titulo || '" está em apenas ' || v_pct || '%.';
      v_tipo := 'warning';
    END IF;

    IF v_alerta IS NULL THEN CONTINUE; END IF;

    -- Coleta destinatários (cabo + liderança)
    v_users := ARRAY[]::UUID[];
    IF m.cabo_eleitoral_id IS NOT NULL THEN
      SELECT array_remove(array_agg(DISTINCT u), NULL) INTO v_users FROM (
        SELECT user_id AS u FROM public.cabos_eleitorais WHERE id = m.cabo_eleitoral_id
        UNION
        SELECT l.user_id FROM public.cabos_eleitorais c
        JOIN public.liderancas l ON l.id = c.lideranca_id WHERE c.id = m.cabo_eleitoral_id
      ) s;
    ELSIF m.lideranca_id IS NOT NULL THEN
      SELECT array_remove(array_agg(DISTINCT user_id), NULL) INTO v_users
      FROM public.liderancas WHERE id = m.lideranca_id;
    END IF;

    v_count := 0;
    v_dedupe_key := m.id::text || ':' || v_alerta || ':' || CURRENT_DATE::text;

    FOREACH v_uid IN ARRAY v_users LOOP
      -- evita duplicar mesmo alerta no mesmo dia
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = v_uid
          AND metadata->>'dedupe_key' = v_dedupe_key
      ) THEN
        INSERT INTO public.notifications (user_id, titulo, mensagem, tipo, link, metadata)
        VALUES (
          v_uid, v_titulo, v_msg, v_tipo,
          '/app/political/metas-gamificacao',
          jsonb_build_object('meta_id', m.id, 'alerta', v_alerta, 'dedupe_key', v_dedupe_key)
        );
        v_count := v_count + 1;
      END IF;
    END LOOP;

    meta_id := m.id; alerta := v_alerta; notificados := v_count;
    RETURN NEXT;
  END LOOP;
END;
$$;
