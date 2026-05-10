CREATE TABLE public.tse_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL,
  user_id UUID,
  uf TEXT NOT NULL,
  ano_eleicao INTEGER NOT NULL,
  turno INTEGER NOT NULL,
  cargo TEXT,
  codigo_municipio TEXT,
  escopo TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  tentativas INTEGER NOT NULL DEFAULT 0,
  ultimo_erro TEXT,
  log_id UUID REFERENCES public.tse_importacao_logs(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tse_jobs_batch ON public.tse_jobs (batch_id, created_at);
CREATE INDEX idx_tse_jobs_status ON public.tse_jobs (status);
CREATE UNIQUE INDEX uq_tse_jobs_batch_target ON public.tse_jobs (batch_id, uf, ano_eleicao, turno, COALESCE(cargo, ''), COALESCE(codigo_municipio, ''));

ALTER TABLE public.tse_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view tse jobs admins" ON public.tse_jobs
FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()) OR public.user_has_permission(auth.uid(), public.user_default_company(auth.uid()), 'configuracoes.manage'));

CREATE POLICY "manage tse jobs admins" ON public.tse_jobs
FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()) OR public.user_has_permission(auth.uid(), public.user_default_company(auth.uid()), 'configuracoes.manage'))
WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_has_permission(auth.uid(), public.user_default_company(auth.uid()), 'configuracoes.manage'));

CREATE TRIGGER trg_tse_jobs_updated_at
BEFORE UPDATE ON public.tse_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();