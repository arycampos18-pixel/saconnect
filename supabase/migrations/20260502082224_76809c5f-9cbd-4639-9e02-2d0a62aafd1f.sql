CREATE TYPE aprovacao_status AS ENUM ('Pendente', 'Aprovado', 'Rejeitado', 'Cancelado');
CREATE TYPE aprovacao_tipo AS ENUM ('Campanha', 'Evento', 'ExclusaoEmMassa', 'EdicaoLideranca', 'Outro');

CREATE TABLE public.aprovacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo aprovacao_tipo NOT NULL DEFAULT 'Outro',
  titulo TEXT NOT NULL,
  descricao TEXT,
  dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  status aprovacao_status NOT NULL DEFAULT 'Pendente',
  motivo_decisao TEXT,
  solicitado_por UUID,
  decidido_por UUID,
  decidido_em TIMESTAMPTZ,
  executado BOOLEAN NOT NULL DEFAULT false,
  executado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.aprovacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aprovações visíveis para autenticados" ON public.aprovacoes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados criam solicitações" ON public.aprovacoes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin ou solicitante atualiza" ON public.aprovacoes
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(), 'admin') OR (solicitado_por = auth.uid() AND status = 'Pendente')
  );
CREATE POLICY "Admins removem aprovações" ON public.aprovacoes
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_aprovacoes_updated
  BEFORE UPDATE ON public.aprovacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_aprovacoes_status ON public.aprovacoes(status);
CREATE INDEX idx_aprovacoes_solicitado_por ON public.aprovacoes(solicitado_por);