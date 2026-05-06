ALTER TABLE public.mensagens
  ADD COLUMN IF NOT EXISTS segmento_id UUID,
  ADD COLUMN IF NOT EXISTS nome_campanha TEXT;