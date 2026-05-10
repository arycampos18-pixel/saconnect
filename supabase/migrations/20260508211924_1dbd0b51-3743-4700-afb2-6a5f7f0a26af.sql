
CREATE TABLE IF NOT EXISTS public.analise_provedor_credenciais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provedor TEXT NOT NULL DEFAULT 'assertiva',
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provedor)
);

ALTER TABLE public.analise_provedor_credenciais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_credenciais"
ON public.analise_provedor_credenciais
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_analise_provedor_credenciais_updated_at
BEFORE UPDATE ON public.analise_provedor_credenciais
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
