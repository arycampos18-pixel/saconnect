
-- Habilita extensões para agendamento
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Função: calcula saúde da API (0-100)
CREATE OR REPLACE FUNCTION public.wa_bulk_calcular_saude(_api_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  api RECORD;
  saude integer := 100;
  taxa_erro numeric := 0;
BEGIN
  SELECT * INTO api FROM public.wa_bulk_apis WHERE id = _api_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  IF api.total_enviadas > 0 THEN
    taxa_erro := (api.total_erros::numeric / api.total_enviadas::numeric) * 100;
  END IF;

  -- Penalidades
  saude := saude - LEAST(50, (taxa_erro * 5)::integer);          -- até -50 por erro
  saude := saude - LEAST(30, api.erros_consecutivos * 5);         -- até -30 por sequência
  IF api.warning_meta THEN saude := saude - 20; END IF;
  IF api.restrito THEN saude := saude - 40; END IF;

  RETURN GREATEST(0, LEAST(100, saude));
END;
$$;

-- Função: reseta contadores
CREATE OR REPLACE FUNCTION public.wa_bulk_resetar_contadores(_modo text DEFAULT 'hora')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _modo = 'dia' THEN
    UPDATE public.wa_bulk_apis SET msgs_enviadas_hoje = 0, msgs_enviadas_hora = 0;
  ELSE
    UPDATE public.wa_bulk_apis SET msgs_enviadas_hora = 0;
  END IF;
END;
$$;

-- Agendamento via pg_cron (chamando edge functions via pg_net)
DO $$
DECLARE
  v_url text := 'https://ktwdgnkurtalclsgxfov.supabase.co/functions/v1/';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0d2Rnbmt1cnRhbGNsc2d4Zm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2ODEzOTEsImV4cCI6MjA5MzI1NzM5MX0.8gJkKBMuSBWamNE27uXF3k1ZcQ98dO18o6eQlBdvXTw';
BEGIN
  PERFORM cron.unschedule('wa-bulk-worker-1min') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='wa-bulk-worker-1min');
EXCEPTION WHEN others THEN NULL;
END $$;

SELECT cron.schedule(
  'wa-bulk-worker-1min',
  '* * * * *',
  $$ SELECT net.http_post(
       url := 'https://ktwdgnkurtalclsgxfov.supabase.co/functions/v1/wa-bulk-worker',
       headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0d2Rnbmt1cnRhbGNsc2d4Zm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2ODEzOTEsImV4cCI6MjA5MzI1NzM5MX0.8gJkKBMuSBWamNE27uXF3k1ZcQ98dO18o6eQlBdvXTw'),
       body := '{}'::jsonb
     ); $$
);

SELECT cron.schedule(
  'wa-bulk-monitor-5min',
  '*/5 * * * *',
  $$ SELECT net.http_post(
       url := 'https://ktwdgnkurtalclsgxfov.supabase.co/functions/v1/wa-bulk-monitor',
       headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0d2Rnbmt1cnRhbGNsc2d4Zm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2ODEzOTEsImV4cCI6MjA5MzI1NzM5MX0.8gJkKBMuSBWamNE27uXF3k1ZcQ98dO18o6eQlBdvXTw'),
       body := '{}'::jsonb
     ); $$
);

-- Reset horário (no minuto 0)
SELECT cron.schedule(
  'wa-bulk-reset-hora',
  '0 * * * *',
  $$ SELECT public.wa_bulk_resetar_contadores('hora'); $$
);

-- Reset diário (00:05)
SELECT cron.schedule(
  'wa-bulk-reset-dia',
  '5 0 * * *',
  $$ SELECT public.wa_bulk_resetar_contadores('dia'); $$
);
