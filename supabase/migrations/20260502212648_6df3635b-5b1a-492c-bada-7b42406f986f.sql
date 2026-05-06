ALTER TABLE public.whatsapp_templates
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS usos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultimo_uso_em timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_categoria ON public.whatsapp_templates(categoria);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_atalho ON public.whatsapp_templates(atalho);

CREATE OR REPLACE FUNCTION public.template_registrar_uso(_template_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.whatsapp_templates
  SET usos = usos + 1, ultimo_uso_em = now()
  WHERE id = _template_id;
END;
$$;