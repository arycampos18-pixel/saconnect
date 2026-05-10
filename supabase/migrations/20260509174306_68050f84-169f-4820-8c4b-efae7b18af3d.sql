
ALTER TABLE public.wa_bulk_campanhas
  ADD COLUMN IF NOT EXISTS janela_inicio TIME,
  ADD COLUMN IF NOT EXISTS janela_fim TIME,
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  ADD COLUMN IF NOT EXISTS pausada BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dias_semana INTEGER[];

-- Função: pode enviar agora?
CREATE OR REPLACE FUNCTION public.wa_bulk_campanha_pode_enviar(_campanha_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.wa_bulk_campanhas;
  v_now timestamptz := now();
  v_local timestamp;
  v_dia int;
  v_hora time;
BEGIN
  SELECT * INTO c FROM public.wa_bulk_campanhas WHERE id = _campanha_id;
  IF NOT FOUND THEN RETURN false; END IF;

  IF c.pausada THEN RETURN false; END IF;
  IF c.status IN ('concluida','cancelada') THEN RETURN false; END IF;
  IF c.agendado_para IS NOT NULL AND c.agendado_para > v_now THEN RETURN false; END IF;

  v_local := (v_now AT TIME ZONE COALESCE(c.timezone, 'America/Sao_Paulo'));
  v_dia := ((EXTRACT(DOW FROM v_local)::int + 6) % 7) + 1; -- 1=Seg ... 7=Dom
  v_hora := v_local::time;

  IF c.dias_semana IS NOT NULL AND array_length(c.dias_semana, 1) > 0
     AND NOT (v_dia = ANY(c.dias_semana)) THEN
    RETURN false;
  END IF;

  IF c.janela_inicio IS NOT NULL AND c.janela_fim IS NOT NULL THEN
    IF c.janela_inicio <= c.janela_fim THEN
      IF v_hora < c.janela_inicio OR v_hora > c.janela_fim THEN RETURN false; END IF;
    ELSE
      -- janela atravessa meia-noite (ex: 22:00 - 06:00)
      IF v_hora < c.janela_inicio AND v_hora > c.janela_fim THEN RETURN false; END IF;
    END IF;
  END IF;

  RETURN true;
END $$;

-- Função: pausar / retomar
CREATE OR REPLACE FUNCTION public.wa_bulk_campanha_pausar(_campanha_id UUID, _pausar BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.wa_bulk_campanhas
    SET pausada = _pausar,
        status = CASE
          WHEN _pausar THEN 'pausada'
          WHEN status = 'pausada' THEN COALESCE(
            (CASE WHEN agendado_para IS NOT NULL AND agendado_para > now() THEN 'agendada' ELSE 'ativa' END),
            'ativa')
          ELSE status
        END,
        updated_at = now()
    WHERE id = _campanha_id;
END $$;
