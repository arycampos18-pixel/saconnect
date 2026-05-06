
CREATE OR REPLACE FUNCTION public.increment_meta_campaign_counter(
  _campaign_id UUID,
  _column TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _column NOT IN ('sent_count','delivered_count','read_count','error_count') THEN
    RAISE EXCEPTION 'Invalid column %', _column;
  END IF;
  EXECUTE format(
    'UPDATE public.whatsapp_meta_campaigns SET %I = %I + 1, updated_at = now() WHERE id = $1',
    _column, _column
  ) USING _campaign_id;
END;
$$;
