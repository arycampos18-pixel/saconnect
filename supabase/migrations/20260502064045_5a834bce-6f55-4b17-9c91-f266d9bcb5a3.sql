
CREATE TABLE public.mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canal text NOT NULL CHECK (canal IN ('WhatsApp','SMS')),
  conteudo text NOT NULL,
  publico_alvo text NOT NULL DEFAULT 'Todos',
  total_destinatarios integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Enviada',
  filtro_bairro text,
  filtro_tag_id uuid REFERENCES public.tags(id) ON DELETE SET NULL,
  enviado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mensagens_created ON public.mensagens(created_at DESC);

ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mensagens visíveis para autenticados" ON public.mensagens
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados registram mensagens" ON public.mensagens
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins atualizam mensagens" ON public.mensagens
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins removem mensagens" ON public.mensagens
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
