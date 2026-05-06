-- Limpa mensagens-lixo geradas por callbacks de status da Z-API
-- (eventos MessageStatusCallback estavam sendo gravados como mensagens "outro" sem conteúdo)
DELETE FROM public.whatsapp_mensagens
WHERE tipo = 'outro'
  AND conteudo IS NULL
  AND midia_url IS NULL
  AND (metadata->>'type' ILIKE '%StatusCallback%'
       OR metadata->>'type' ILIKE '%status%'
       OR metadata ? 'status');

-- Recalcula campos derivados das conversas a partir das mensagens restantes
WITH stats AS (
  SELECT
    conversa_id,
    MAX(COALESCE(enviado_em, created_at)) AS ult_em,
    (ARRAY_AGG(LEFT(COALESCE(conteudo, '[' || tipo::text || ']'), 200)
               ORDER BY COALESCE(enviado_em, created_at) DESC))[1] AS ult_msg,
    (ARRAY_AGG(direcao ORDER BY COALESCE(enviado_em, created_at) DESC))[1] AS ult_dir,
    COUNT(*) FILTER (WHERE direcao = 'entrada') AS entradas
  FROM public.whatsapp_mensagens
  GROUP BY conversa_id
)
UPDATE public.whatsapp_conversas c
SET ultima_mensagem = s.ult_msg,
    ultima_mensagem_em = s.ult_em,
    ultima_direcao = s.ult_dir,
    nao_lidas = LEAST(c.nao_lidas, s.entradas)
FROM stats s
WHERE s.conversa_id = c.id;

-- Conversas sem nenhuma mensagem real → zera prévia e contador
UPDATE public.whatsapp_conversas
SET ultima_mensagem = NULL,
    ultima_mensagem_em = NULL,
    ultima_direcao = NULL,
    nao_lidas = 0
WHERE id NOT IN (SELECT DISTINCT conversa_id FROM public.whatsapp_mensagens);