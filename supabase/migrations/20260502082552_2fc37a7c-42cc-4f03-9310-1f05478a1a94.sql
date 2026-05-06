CREATE TYPE public.audit_acao AS ENUM ('Criar', 'Editar', 'Excluir', 'Login', 'Logout', 'Exportar', 'Importar', 'Aprovar', 'Rejeitar', 'Outro');

CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_nome TEXT,
  user_email TEXT,
  acao audit_acao NOT NULL DEFAULT 'Outro',
  entidade TEXT NOT NULL,
  entidade_id UUID,
  descricao TEXT,
  dados_anteriores JSONB,
  dados_novos JSONB,
  ip_address TEXT,
  user_agent TEXT,
  modulo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entidade ON public.audit_logs(entidade);
CREATE INDEX idx_audit_logs_acao ON public.audit_logs(acao);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas admins veem logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Autenticados registram logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Apenas admins removem logs"
ON public.audit_logs FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));