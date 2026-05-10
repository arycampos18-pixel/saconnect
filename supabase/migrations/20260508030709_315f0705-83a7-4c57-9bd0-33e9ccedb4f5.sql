ALTER TABLE public.mensagens
  ADD CONSTRAINT mensagens_segmento_id_fkey
  FOREIGN KEY (segmento_id) REFERENCES public.segmentos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mensagens_segmento_id ON public.mensagens(segmento_id);

ALTER TABLE public.mensagens DROP CONSTRAINT IF EXISTS mensagens_canal_check;
ALTER TABLE public.mensagens
  ADD CONSTRAINT mensagens_canal_check
  CHECK (canal = ANY (ARRAY['WhatsApp'::text, 'SMS'::text, 'Email'::text]));