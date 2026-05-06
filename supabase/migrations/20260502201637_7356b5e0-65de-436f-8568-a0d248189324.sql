-- 1) Coluna de tags nas conversas
ALTER TABLE public.whatsapp_conversas
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_tags
  ON public.whatsapp_conversas USING GIN (tags);

-- 2) Tabela de notas internas
CREATE TABLE IF NOT EXISTS public.whatsapp_conversa_notas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL REFERENCES public.whatsapp_conversas(id) ON DELETE CASCADE,
  autor_id uuid,
  conteudo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wcn_conversa ON public.whatsapp_conversa_notas(conversa_id, created_at DESC);

ALTER TABLE public.whatsapp_conversa_notas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notas visíveis para autenticados"
  ON public.whatsapp_conversa_notas FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Autenticados criam notas"
  ON public.whatsapp_conversa_notas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND (autor_id IS NULL OR autor_id = auth.uid()));

CREATE POLICY "Autor ou admin atualiza nota"
  ON public.whatsapp_conversa_notas FOR UPDATE
  TO authenticated
  USING (autor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Autor ou admin remove nota"
  ON public.whatsapp_conversa_notas FOR DELETE
  TO authenticated
  USING (autor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_wcn_updated_at
  BEFORE UPDATE ON public.whatsapp_conversa_notas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Realtime
ALTER TABLE public.whatsapp_conversa_notas REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversa_notas;