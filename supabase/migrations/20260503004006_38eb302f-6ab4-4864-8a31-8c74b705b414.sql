ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;

UPDATE public.profiles
SET ativo = true
WHERE ativo IS DISTINCT FROM true;