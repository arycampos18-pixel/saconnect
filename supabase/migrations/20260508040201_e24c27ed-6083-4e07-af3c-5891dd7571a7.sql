ALTER TABLE public.whatsapp_config
  ADD COLUMN IF NOT EXISTS provider VARCHAR(20) NOT NULL DEFAULT 'zapi';

CREATE INDEX IF NOT EXISTS idx_whatsapp_config_provider ON public.whatsapp_config(provider);