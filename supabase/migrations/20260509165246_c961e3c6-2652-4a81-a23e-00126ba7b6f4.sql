
ALTER TABLE public.wa_bulk_fila_envios REPLICA IDENTITY FULL;
ALTER TABLE public.wa_bulk_metricas_diarias REPLICA IDENTITY FULL;
ALTER TABLE public.wa_bulk_apis REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_bulk_fila_envios;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_bulk_metricas_diarias;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_bulk_apis;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
