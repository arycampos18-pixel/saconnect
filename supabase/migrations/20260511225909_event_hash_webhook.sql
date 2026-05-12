ALTER TABLE public.whatsapp_webhook_raw
  ADD COLUMN IF NOT EXISTS event_hash TEXT,
  ADD COLUMN IF NOT EXISTS conversa_id UUID,
  ADD COLUMN IF NOT EXISTS mensagem_id UUID,
  ADD COLUMN IF NOT EXISTS processado_em TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_webhook_raw_event_hash
  ON public.whatsapp_webhook_raw (event_hash)
  WHERE event_hash IS NOT NULL;
