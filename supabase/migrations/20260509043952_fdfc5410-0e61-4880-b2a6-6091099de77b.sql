-- Marca logs de importação TSE presos em "iniciado" há mais de 10 minutos como erro
UPDATE public.tse_importacao_logs
SET status = 'erro',
    erros = COALESCE(erros, 'Importação interrompida (a função excedeu memória/tempo). Marcado automaticamente.'),
    finished_at = now()
WHERE status = 'iniciado'
  AND created_at < now() - interval '10 minutes';

-- Função de reconciliação chamável a qualquer momento
CREATE OR REPLACE FUNCTION public.reconciliar_logs_tse_orfaos()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  afetados integer;
BEGIN
  UPDATE public.tse_importacao_logs
  SET status = 'erro',
      erros = COALESCE(erros, 'Importação interrompida (a função excedeu memória/tempo). Marcado automaticamente.'),
      finished_at = now()
  WHERE status = 'iniciado'
    AND created_at < now() - interval '10 minutes';
  GET DIAGNOSTICS afetados = ROW_COUNT;
  RETURN afetados;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconciliar_logs_tse_orfaos() TO authenticated;