-- Remover vínculo coordenador na liderança
ALTER TABLE public.liderancas DROP COLUMN IF EXISTS coordenador_id;

-- Hierarquia: liderança superior
ALTER TABLE public.liderancas
  ADD COLUMN IF NOT EXISTS superior_id UUID REFERENCES public.liderancas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_liderancas_superior ON public.liderancas(superior_id);

-- Remover tabela coordenadores
DROP TABLE IF EXISTS public.coordenadores CASCADE;