-- RPC para incrementar contadores de campanhas em massa
CREATE OR REPLACE FUNCTION public.wa_bulk_camp_incrementar(_campanha_id uuid, _coluna text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _coluna NOT IN ('total_enviados','total_entregues','total_lidos','total_erros') THEN
    RAISE EXCEPTION 'Coluna inválida: %', _coluna;
  END IF;
  EXECUTE format(
    'UPDATE public.wa_bulk_campanhas SET %I = COALESCE(%I,0) + 1, updated_at = now() WHERE id = $1',
    _coluna, _coluna
  ) USING _campanha_id;
END $$;