-- ENUM para tipo e status
CREATE TYPE public.evento_tipo AS ENUM ('Saúde', 'Educação', 'Assistência', 'Jurídico', 'Cursos');
CREATE TYPE public.evento_status AS ENUM ('Planejado', 'Em Andamento', 'Finalizado');

-- Tabela eventos
CREATE TABLE public.eventos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo public.evento_tipo NOT NULL,
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
  local TEXT NOT NULL,
  descricao TEXT,
  responsavel_id UUID REFERENCES public.liderancas(id) ON DELETE SET NULL,
  limite_inscritos INTEGER,
  status public.evento_status NOT NULL DEFAULT 'Planejado',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Eventos visíveis para autenticados"
  ON public.eventos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados criam eventos"
  ON public.eventos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Criador ou admin atualiza eventos"
  ON public.eventos FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Criador ou admin remove eventos"
  ON public.eventos FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_eventos_updated_at
  BEFORE UPDATE ON public.eventos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_eventos_data_hora ON public.eventos(data_hora);
CREATE INDEX idx_eventos_status ON public.eventos(status);

-- Tabela evento_inscricoes
CREATE TABLE public.evento_inscricoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  eleitor_id UUID NOT NULL REFERENCES public.eleitores(id) ON DELETE CASCADE,
  presente BOOLEAN NOT NULL DEFAULT false,
  checkin_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(evento_id, eleitor_id)
);

ALTER TABLE public.evento_inscricoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inscrições visíveis para autenticados"
  ON public.evento_inscricoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados criam inscrições"
  ON public.evento_inscricoes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados atualizam inscrições"
  ON public.evento_inscricoes FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados removem inscrições"
  ON public.evento_inscricoes FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_evento_inscricoes_evento ON public.evento_inscricoes(evento_id);
CREATE INDEX idx_evento_inscricoes_eleitor ON public.evento_inscricoes(eleitor_id);