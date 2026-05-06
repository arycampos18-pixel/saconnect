CREATE TABLE public.segmentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  cor TEXT NOT NULL DEFAULT '#2563EB',
  icone TEXT NOT NULL DEFAULT 'Users',
  filtros JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_cache INTEGER NOT NULL DEFAULT 0,
  ultima_atualizacao TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.segmentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Segmentos visíveis para autenticados" ON public.segmentos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados criam segmentos" ON public.segmentos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Criador ou admin atualiza segmentos" ON public.segmentos
  FOR UPDATE TO authenticated USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Criador ou admin remove segmentos" ON public.segmentos
  FOR DELETE TO authenticated USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_segmentos_updated
  BEFORE UPDATE ON public.segmentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();