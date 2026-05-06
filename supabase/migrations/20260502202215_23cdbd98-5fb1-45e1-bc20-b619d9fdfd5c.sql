-- 1) Storage bucket público para mídias do WhatsApp
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas: leitura pública, escrita só via service role (sem policy = bloqueado para clientes)
DROP POLICY IF EXISTS "WhatsApp media public read" ON storage.objects;
CREATE POLICY "WhatsApp media public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'whatsapp-media');

-- 2) Tabela de templates de resposta rápida
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  conteudo text NOT NULL,
  atalho text,
  departamento_id uuid REFERENCES public.departamentos(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wtpl_dep ON public.whatsapp_templates(departamento_id);
CREATE INDEX IF NOT EXISTS idx_wtpl_ativo ON public.whatsapp_templates(ativo);

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates visíveis para autenticados"
  ON public.whatsapp_templates FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins criam templates"
  ON public.whatsapp_templates FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins atualizam templates"
  ON public.whatsapp_templates FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins removem templates"
  ON public.whatsapp_templates FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_wtpl_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Seeds básicos (sem departamento)
INSERT INTO public.whatsapp_templates (nome, conteudo, atalho)
VALUES
  ('Saudação inicial', 'Olá {primeiro_nome}! Tudo bem? Em que posso ajudar você hoje?', '/oi'),
  ('Aguarde um momento', 'Só um instante, {primeiro_nome}, vou verificar isso para você.', '/aguarde'),
  ('Encaminhamento', 'Vou encaminhar sua solicitação ao setor responsável. Em breve retornamos.', '/encaminhar'),
  ('Encerramento', 'Foi um prazer ajudar, {primeiro_nome}! Qualquer outra dúvida, é só chamar. 😊', '/tchau')
ON CONFLICT DO NOTHING;