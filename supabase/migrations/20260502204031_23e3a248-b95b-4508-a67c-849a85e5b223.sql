
CREATE TABLE IF NOT EXISTS public.whatsapp_roteamento_regras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  palavras_chave TEXT[] NOT NULL DEFAULT '{}',
  departamento_id UUID REFERENCES public.departamentos(id) ON DELETE CASCADE NOT NULL,
  prioridade INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wpp_rotas_ativo_prio
  ON public.whatsapp_roteamento_regras (ativo, prioridade DESC);

ALTER TABLE public.whatsapp_roteamento_regras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Regras visíveis para autenticados"
  ON public.whatsapp_roteamento_regras FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins criam regras"
  ON public.whatsapp_roteamento_regras FOR INSERT
  TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins atualizam regras"
  ON public.whatsapp_roteamento_regras FOR UPDATE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins removem regras"
  ON public.whatsapp_roteamento_regras FOR DELETE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_wpp_rotas_updated
  BEFORE UPDATE ON public.whatsapp_roteamento_regras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
