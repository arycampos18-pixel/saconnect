-- =============================================================================
-- Passo 6 (destino): repor URLs das Edge Functions nos jobs pg_cron + pg_net
-- =============================================================================
-- Executar NO PROJECTO DESTINO, depois de:
--   - supabase db push (schema aplicado)
--   - Edge Functions deployadas (wa-bulk-worker, wa-bulk-monitor, analise-job-worker)
--
-- ANTES DE COLAR NO SQL EDITOR:
--   1. Substituir TODAS as ocorrências de __NEW_REF__ pelo project ref (ex.: abcdefghijklmnop)
--   2. Substituir TODAS as ocorrências de __NEW_ANON_KEY__ pela anon key do destino
--      (Settings → API → anon public)
--
-- Não commites este ficheiro com chaves reais.
-- =============================================================================

-- Remover jobs antigos (ignora erro se não existirem)
DO $$ BEGIN PERFORM cron.unschedule('wa-bulk-worker-1min'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('wa-bulk-monitor-5min'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('analise-job-worker-1min'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- WhatsApp Bulk: worker a cada minuto
SELECT cron.schedule(
  'wa-bulk-worker-1min',
  '* * * * *',
  $cmd$ SELECT net.http_post(
       url := 'https://__NEW_REF__.supabase.co/functions/v1/wa-bulk-worker',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer __NEW_ANON_KEY__'
       ),
       body := '{}'::jsonb
     ); $cmd$
);

-- WhatsApp Bulk: monitor a cada 5 minutos
SELECT cron.schedule(
  'wa-bulk-monitor-5min',
  '*/5 * * * *',
  $cmd$ SELECT net.http_post(
       url := 'https://__NEW_REF__.supabase.co/functions/v1/wa-bulk-monitor',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer __NEW_ANON_KEY__'
       ),
       body := '{}'::jsonb
     ); $cmd$
);

-- Análise: worker da fila a cada minuto
SELECT cron.schedule(
  'analise-job-worker-1min',
  '* * * * *',
  $cmd$ SELECT net.http_post(
       url := 'https://__NEW_REF__.supabase.co/functions/v1/analise-job-worker',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer __NEW_ANON_KEY__'
       ),
       body := jsonb_build_object('lote', 10)
     ); $cmd$
);

-- Resets horário/diário (sem URL externa — recriar para garantir após unschedule acidental)
DO $$ BEGIN PERFORM cron.unschedule('wa-bulk-reset-hora'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('wa-bulk-reset-dia'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'wa-bulk-reset-hora',
  '0 * * * *',
  $cmd$ SELECT public.wa_bulk_resetar_contadores('hora'); $cmd$
);

SELECT cron.schedule(
  'wa-bulk-reset-dia',
  '5 0 * * *',
  $cmd$ SELECT public.wa_bulk_resetar_contadores('dia'); $cmd$
);
