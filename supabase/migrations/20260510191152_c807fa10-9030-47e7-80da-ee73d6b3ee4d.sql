-- 1) Trigger: enfileirar enriquecimento automático ao criar eleitor
CREATE OR REPLACE FUNCTION public.enfileirar_enriquecimento_eleitor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company uuid;
  v_cpf text;
  v_tel text;
BEGIN
  v_company := NEW.company_id;
  IF v_company IS NULL THEN RETURN NEW; END IF;

  v_cpf := regexp_replace(COALESCE(NEW.cpf, ''), '\D', '', 'g');
  v_tel := regexp_replace(COALESCE(NEW.telefone, ''), '\D', '', 'g');

  -- Precisa de pelo menos CPF (11) ou telefone (>=10) para enriquecer
  IF length(v_cpf) <> 11 AND length(v_tel) < 10 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.analise_jobs (company_id, tipo, chave, payload, prioridade)
  VALUES (
    v_company,
    'enriquecimento',
    NEW.id::text,
    jsonb_build_object(
      'eleitor_id', NEW.id,
      'cpf', NULLIF(v_cpf, ''),
      'telefone', NULLIF(v_tel, ''),
      'origem', 'auto_cadastro_trigger'
    ),
    5
  )
  ON CONFLICT (company_id, tipo, chave) WHERE status IN ('pendente','processando') DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Não bloqueia o cadastro se o enfileiramento falhar
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_eleitores_enriquecimento_auto ON public.eleitores;
CREATE TRIGGER trg_eleitores_enriquecimento_auto
AFTER INSERT ON public.eleitores
FOR EACH ROW
EXECUTE FUNCTION public.enfileirar_enriquecimento_eleitor();

-- 2) Cron: dispara o worker a cada minuto para processar a fila
DO $$
BEGIN
  PERFORM cron.unschedule('analise-job-worker-1min')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='analise-job-worker-1min');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'analise-job-worker-1min',
  '* * * * *',
  $$ SELECT net.http_post(
       url := 'https://ktwdgnkurtalclsgxfov.supabase.co/functions/v1/analise-job-worker',
       headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0d2Rnbmt1cnRhbGNsc2d4Zm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2ODEzOTEsImV4cCI6MjA5MzI1NzM5MX0.8gJkKBMuSBWamNE27uXF3k1ZcQ98dO18o6eQlBdvXTw'),
       body := jsonb_build_object('lote', 10)
     ); $$
);