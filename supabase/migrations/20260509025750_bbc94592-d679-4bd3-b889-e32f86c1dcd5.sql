
ALTER TABLE public.eleitores
  ADD COLUMN IF NOT EXISTS whatsapp_bloqueado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_origem TEXT;

ALTER TABLE public.tokens_auto_cadastro
  ADD COLUMN IF NOT EXISTS telefone_destino TEXT;

CREATE INDEX IF NOT EXISTS idx_eleitores_whatsapp_bloqueado
  ON public.eleitores(whatsapp_bloqueado);
