CREATE TYPE public.atividade_concorrente_tipo AS ENUM ('Evento', 'Post', 'Campanha', 'Menção', 'Outro');
CREATE TYPE public.sentimento AS ENUM ('Positivo', 'Neutro', 'Negativo');

CREATE TABLE public.concorrentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  partido text,
  regiao text,
  foto_url text,
  seguidores integer NOT NULL DEFAULT 0,
  engajamento_pct numeric NOT NULL DEFAULT 0,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.concorrentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Concorrentes visíveis para autenticados"
  ON public.concorrentes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados criam concorrentes"
  ON public.concorrentes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Criador ou admin atualiza concorrentes"
  ON public.concorrentes FOR UPDATE TO authenticated
  USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Criador ou admin remove concorrentes"
  ON public.concorrentes FOR DELETE TO authenticated
  USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_concorrentes_updated_at
  BEFORE UPDATE ON public.concorrentes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.concorrente_atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concorrente_id uuid NOT NULL REFERENCES public.concorrentes(id) ON DELETE CASCADE,
  tipo public.atividade_concorrente_tipo NOT NULL DEFAULT 'Outro',
  titulo text NOT NULL,
  descricao text,
  data_atividade timestamptz NOT NULL DEFAULT now(),
  bairro text,
  link text,
  sentimento public.sentimento,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_concorrente_ativ_data ON public.concorrente_atividades(concorrente_id, data_atividade DESC);

ALTER TABLE public.concorrente_atividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Atividades visíveis para autenticados"
  ON public.concorrente_atividades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados criam atividades"
  ON public.concorrente_atividades FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Criador ou admin atualiza atividades"
  ON public.concorrente_atividades FOR UPDATE TO authenticated
  USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Criador ou admin remove atividades"
  ON public.concorrente_atividades FOR DELETE TO authenticated
  USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));