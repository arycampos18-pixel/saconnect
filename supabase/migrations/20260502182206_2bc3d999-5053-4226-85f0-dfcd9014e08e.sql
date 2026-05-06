-- Tabela de organizações / gabinetes
CREATE TABLE public.organizacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Gabinete', -- Gabinete | Comitê | Partido | Grupo
  cidade TEXT,
  uf TEXT,
  responsavel_id UUID,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizacoes visíveis para autenticados"
  ON public.organizacoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins criam organizacoes"
  ON public.organizacoes FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins atualizam organizacoes"
  ON public.organizacoes FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins removem organizacoes"
  ON public.organizacoes FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_organizacoes_updated_at
  BEFORE UPDATE ON public.organizacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vincular liderança a uma organização
ALTER TABLE public.liderancas
  ADD COLUMN organizacao_id UUID REFERENCES public.organizacoes(id) ON DELETE SET NULL;

CREATE INDEX idx_liderancas_organizacao ON public.liderancas(organizacao_id);