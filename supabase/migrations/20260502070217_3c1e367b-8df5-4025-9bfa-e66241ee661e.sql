CREATE TYPE public.pesquisa_tipo AS ENUM ('Intenção de Voto', 'Satisfação', 'Temas Prioritários');
CREATE TYPE public.pesquisa_status AS ENUM ('Rascunho', 'Ativa', 'Finalizada');
CREATE TYPE public.pergunta_tipo AS ENUM ('multipla', 'sim_nao', 'aberta');

CREATE TABLE public.pesquisas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  tipo public.pesquisa_tipo NOT NULL,
  status public.pesquisa_status NOT NULL DEFAULT 'Rascunho',
  filtro_bairro TEXT,
  filtro_tag_id UUID REFERENCES public.tags(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pesquisas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pesquisas ativas públicas"
  ON public.pesquisas FOR SELECT TO anon
  USING (status = 'Ativa');

CREATE POLICY "Pesquisas visíveis para autenticados"
  ON public.pesquisas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados criam pesquisas"
  ON public.pesquisas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Criador ou admin atualiza pesquisas"
  ON public.pesquisas FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Criador ou admin remove pesquisas"
  ON public.pesquisas FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_pesquisas_updated_at
  BEFORE UPDATE ON public.pesquisas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.pesquisa_perguntas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pesquisa_id UUID NOT NULL REFERENCES public.pesquisas(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  tipo public.pergunta_tipo NOT NULL,
  opcoes JSONB,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pesquisa_perguntas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perguntas visíveis para todos"
  ON public.pesquisa_perguntas FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pesquisas p
      WHERE p.id = pesquisa_perguntas.pesquisa_id
        AND (p.status = 'Ativa' OR auth.uid() IS NOT NULL)
    )
  );

CREATE POLICY "Autenticados criam perguntas"
  ON public.pesquisa_perguntas FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pesquisas p
      WHERE p.id = pesquisa_perguntas.pesquisa_id
        AND (p.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Autenticados atualizam perguntas"
  ON public.pesquisa_perguntas FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pesquisas p
      WHERE p.id = pesquisa_perguntas.pesquisa_id
        AND (p.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Autenticados removem perguntas"
  ON public.pesquisa_perguntas FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pesquisas p
      WHERE p.id = pesquisa_perguntas.pesquisa_id
        AND (p.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE INDEX idx_perguntas_pesquisa ON public.pesquisa_perguntas(pesquisa_id, ordem);

CREATE TABLE public.pesquisa_respostas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pesquisa_id UUID NOT NULL REFERENCES public.pesquisas(id) ON DELETE CASCADE,
  pergunta_id UUID NOT NULL REFERENCES public.pesquisa_perguntas(id) ON DELETE CASCADE,
  resposta TEXT NOT NULL,
  participante_nome TEXT,
  participante_telefone TEXT,
  eleitor_id UUID REFERENCES public.eleitores(id) ON DELETE SET NULL,
  sessao_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pesquisa_respostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Respostas visíveis para autenticados"
  ON public.pesquisa_respostas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Qualquer pessoa envia respostas a pesquisa ativa"
  ON public.pesquisa_respostas FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pesquisas p
      WHERE p.id = pesquisa_respostas.pesquisa_id AND p.status = 'Ativa'
    )
  );

CREATE POLICY "Admin remove respostas"
  ON public.pesquisa_respostas FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_respostas_pesquisa ON public.pesquisa_respostas(pesquisa_id);
CREATE INDEX idx_respostas_pergunta ON public.pesquisa_respostas(pergunta_id);
CREATE INDEX idx_respostas_sessao ON public.pesquisa_respostas(sessao_id);