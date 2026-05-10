
-- Função de validação heurística de telefone
CREATE OR REPLACE FUNCTION public.wa_bulk_telefone_valido(_telefone text)
 RETURNS TABLE(valido boolean, motivo text, digits text)
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  d text;
  ddd int;
BEGIN
  d := regexp_replace(COALESCE(_telefone,''), '\D', '', 'g');

  IF length(d) < 8 THEN
    RETURN QUERY SELECT false, 'Telefone muito curto', d; RETURN;
  END IF;
  IF length(d) > 15 THEN
    RETURN QUERY SELECT false, 'Telefone muito longo (E.164 máx. 15)', d; RETURN;
  END IF;

  -- Brasil: começa com 55 e tem 12 ou 13 dígitos
  IF left(d, 2) = '55' THEN
    IF length(d) NOT IN (12, 13) THEN
      RETURN QUERY SELECT false, 'Número BR deve ter 12 ou 13 dígitos (55 + DDD + número)', d; RETURN;
    END IF;
    ddd := substring(d, 3, 2)::int;
    IF ddd < 11 OR ddd > 99 THEN
      RETURN QUERY SELECT false, 'DDD inválido', d; RETURN;
    END IF;
    -- Celular BR (13 dígitos) deve ter 9 logo após DDD
    IF length(d) = 13 AND substring(d, 5, 1) <> '9' THEN
      RETURN QUERY SELECT false, 'Celular BR deve começar com 9 após o DDD', d; RETURN;
    END IF;
    -- Rejeita repetidos (ex.: 5511999999999)
    IF substring(d, 3) ~ '^(\d)\1{9,}$' THEN
      RETURN QUERY SELECT false, 'Número com dígitos repetidos', d; RETURN;
    END IF;
    RETURN QUERY SELECT true, 'OK', d; RETURN;
  END IF;

  -- Internacional: aceita 8-15 dígitos sem padrão BR específico
  RETURN QUERY SELECT true, 'OK (internacional)', d;
END $function$;

-- Trigger: bloqueia entrada na fila com formato inválido
CREATE OR REPLACE FUNCTION public.wa_bulk_fila_validar_formato()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_res RECORD;
  v_eleitor_status text;
BEGIN
  IF NEW.status <> 'pendente' THEN RETURN NEW; END IF;

  SELECT * INTO v_res FROM public.wa_bulk_telefone_valido(NEW.destinatario_telefone) LIMIT 1;
  IF NOT v_res.valido THEN
    NEW.status := 'cancelado';
    NEW.erro_mensagem := 'Telefone inválido: ' || v_res.motivo;
    RETURN NEW;
  END IF;

  -- Se houver eleitor com validação WhatsApp marcada como inválida, cancela
  IF NEW.eleitor_id IS NOT NULL THEN
    SELECT status_validacao_whatsapp INTO v_eleitor_status
      FROM public.eleitores WHERE id = NEW.eleitor_id LIMIT 1;
    IF v_eleitor_status = 'invalido' THEN
      NEW.status := 'cancelado';
      NEW.erro_mensagem := 'Eleitor marcado como sem WhatsApp';
      RETURN NEW;
    END IF;
  END IF;

  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_wa_bulk_fila_validar_formato ON public.wa_bulk_fila_envios;
CREATE TRIGGER trg_wa_bulk_fila_validar_formato
  BEFORE INSERT ON public.wa_bulk_fila_envios
  FOR EACH ROW EXECUTE FUNCTION public.wa_bulk_fila_validar_formato();
