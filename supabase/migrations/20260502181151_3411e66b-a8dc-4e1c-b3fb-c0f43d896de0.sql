-- Tabela de coordenadores de campanha
CREATE TABLE public.coordenadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  cpf TEXT,
  cargo TEXT NOT NULL DEFAULT 'Coordenador Geral',
  area_atuacao TEXT,
  data_inicio DATE,
  data_fim DATE,
  superior_id UUID REFERENCES public.coordenadores(id) ON DELETE SET NULL,
  user_id UUID,
  ativo BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coordenadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordenadores visíveis para autenticados"
  ON public.coordenadores FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins criam coordenadores"
  ON public.coordenadores FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins atualizam coordenadores"
  ON public.coordenadores FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins removem coordenadores"
  ON public.coordenadores FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_coordenadores_updated_at
  BEFORE UPDATE ON public.coordenadores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vínculo coordenador <-> liderança
ALTER TABLE public.liderancas
  ADD COLUMN coordenador_id UUID REFERENCES public.coordenadores(id) ON DELETE SET NULL;

CREATE INDEX idx_liderancas_coordenador ON public.liderancas(coordenador_id);
CREATE INDEX idx_coordenadores_superior ON public.coordenadores(superior_id);
CREATE INDEX idx_coordenadores_ativo ON public.coordenadores(ativo);