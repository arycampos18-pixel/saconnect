
-- Log bruto de TODO payload recebido da Z-API (garantia anti-perda)
CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_raw (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provedor TEXT NOT NULL DEFAULT 'Z-API',
  evento TEXT,
  provedor_message_id TEXT,
  payload JSONB NOT NULL,
  processado BOOLEAN NOT NULL DEFAULT false,
  erro TEXT,
  conversa_id UUID,
  mensagem_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processado_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wpp_raw_created ON public.whatsapp_webhook_raw (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wpp_raw_msgid ON public.whatsapp_webhook_raw (provedor_message_id);
CREATE INDEX IF NOT EXISTS idx_wpp_raw_processado ON public.whatsapp_webhook_raw (processado) WHERE processado = false;

ALTER TABLE public.whatsapp_webhook_raw ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins veem raw"
  ON public.whatsapp_webhook_raw FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins removem raw"
  ON public.whatsapp_webhook_raw FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Idempotência por provedor_message_id em whatsapp_mensagens
CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_mensagens_provedor_msgid
  ON public.whatsapp_mensagens (provedor_message_id)
  WHERE provedor_message_id IS NOT NULL;
