-- O trigger link_eleitor_to_conversa sobrescrevia sempre telefone_digits a partir de `telefone`,
-- anulando a normalização (55 + nono dígito) feita no webhook e gerando conversas duplicadas.

CREATE OR REPLACE FUNCTION public.link_eleitor_to_conversa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eleitor_id UUID;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.telefone IS DISTINCT FROM OLD.telefone THEN
    NEW.telefone_digits := regexp_replace(COALESCE(NEW.telefone, ''), '\D', '', 'g');
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.telefone_digits IS NULL OR btrim(NEW.telefone_digits) = '' THEN
      NEW.telefone_digits := regexp_replace(COALESCE(NEW.telefone, ''), '\D', '', 'g');
    END IF;
  END IF;

  IF NEW.eleitor_id IS NULL AND length(regexp_replace(COALESCE(NEW.telefone_digits, ''), '\D', '', 'g')) >= 10 THEN
    SELECT id INTO v_eleitor_id
    FROM public.eleitores
    WHERE regexp_replace(telefone, '\D', '', 'g') = NEW.telefone_digits
       OR regexp_replace(telefone, '\D', '', 'g') = right(regexp_replace(NEW.telefone_digits, '\D', '', 'g'), 11)
    LIMIT 1;
    IF v_eleitor_id IS NOT NULL THEN
      NEW.eleitor_id := v_eleitor_id;
      IF NEW.contato_nome IS NULL THEN
        SELECT nome INTO NEW.contato_nome FROM public.eleitores WHERE id = v_eleitor_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
