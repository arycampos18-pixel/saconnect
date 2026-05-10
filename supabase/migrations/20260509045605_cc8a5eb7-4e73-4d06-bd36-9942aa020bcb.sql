ALTER TABLE public.tse_importacao_logs
ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

ALTER TABLE public.tse_arquivos_brutos
ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tse_importacao_logs_dedupe_key
ON public.tse_importacao_logs (dedupe_key)
WHERE dedupe_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tse_arquivos_brutos_dedupe_key
ON public.tse_arquivos_brutos (dedupe_key)
WHERE dedupe_key IS NOT NULL;