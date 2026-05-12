-- Normaliza telefone_digits para sempre ter prefixo 55 (Brasil)
-- e deduplica conversas com o mesmo numero canonico.

-- 1) Normaliza telefone_digits existentes sem prefixo 55
UPDATE public.whatsapp_conversas
SET telefone_digits = '55' || telefone_digits
WHERE length(telefone_digits) IN (10, 11)
  AND telefone_digits NOT LIKE '55%';

-- 2) Identifica grupos duplicados (mesmo telefone_digits normalizado)
-- e mantém apenas o registro mais antigo (created_at menor),
-- redirecionando mensagens e notas para o survivente.
DO $$
DECLARE
  rec RECORD;
  survivor_id UUID;
BEGIN
  FOR rec IN
    SELECT telefone_digits, array_agg(id ORDER BY created_at ASC) AS ids
    FROM public.whatsapp_conversas
    GROUP BY telefone_digits
    HAVING count(*) > 1
  LOOP
    survivor_id := rec.ids[1];

    -- Move mensagens dos duplicados para o survivente
    UPDATE public.whatsapp_mensagens
    SET conversa_id = survivor_id
    WHERE conversa_id = ANY(rec.ids[2:]);

    -- Move notas dos duplicados para o survivente
    UPDATE public.whatsapp_conversa_notas
    SET conversa_id = survivor_id
    WHERE conversa_id = ANY(rec.ids[2:]);

    -- Remove os duplicados (o survivente fica)
    DELETE FROM public.whatsapp_conversas
    WHERE id = ANY(rec.ids[2:]);
  END LOOP;
END;
$$;
