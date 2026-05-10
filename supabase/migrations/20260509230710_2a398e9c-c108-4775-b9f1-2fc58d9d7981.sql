ALTER TABLE public.tse_importacao_logs
ADD COLUMN IF NOT EXISTS checkpoint_linhas integer NOT NULL DEFAULT 0;